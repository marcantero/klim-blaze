//! Write+ACK-path diagnostic for the KLIM Blaze.
//!
//! Reproduces the OEM (`OemDrv.exe`) transaction flow and prints everything
//! that arrives on the interrupt IN pipes of *every* top-level collection of
//! the device interface.
//!
//! Findings so far (see TEMP ew/eew/send/ack.txt disassembly notes):
//!   - `0x4421d0` builds `[0x08, payload(16)]` (17 bytes) and sends it.
//!   - `0x441900` sends one chunk, then `0x440b10` waits for an ACK report on
//!     the IN pipe (up to 50 x 20 ms) requiring a `0x07` command echo and a
//!     nonzero status byte; it re-sends on failure.
//!   - Our collection 0xFF02 accepts SetFeature but has NO input reports
//!     (ReadFile fails with ERROR_INVALID_USER_BUFFER) — so ACK input reports
//!     must arrive on another collection of the same interface.
//!
//! Modes (`cargo run -p klim-blaze --example hid_tx_probe -- <mode>`):
//!
//!   read      send one EEPROM read (cmd 0x08) for block 0xA0 and dump every
//!             IN report arriving on any collection for 2.5 s. Read-only:
//!             never changes the mouse.
//!   feature   write RGB static red (block 0xA0) via SendFeatureReport on the
//!             0xFF02 collection, then dump IN reports for 3 s.
//!   output    the same write via WriteFile (HID OUTPUT report) on 0xFF02.
//!   ack       full OEM handshake: send via SetFeature, then actively poll all
//!             collections in 20 ms rounds (50 max) for the ACK.
//!
//! Writes touch the mouse exactly like the OEM software does (static red).
//! Re-run with another colour later to change it back.
//!
//! **Watch the mouse LED while running: the point is whether the light reacts.**

use hidapi::{HidApi, HidDevice};
use std::collections::HashMap;
use std::env;
use std::thread::sleep;
use std::time::{Duration, Instant};

const VENDOR_ID: u16 = 0x260D;
const REPORT_ID: u8 = 0x08;
const CHECKSUM_SEED: u8 = 0x55;
const CMD_EEPROM_WRITE: u8 = 0x07;
const CMD_EEPROM_READ: u8 = 0x08;
const MAX_CHUNK: usize = 10;

fn checksum(payload: &[u8; 16]) -> u8 {
    let sum = payload[..15]
        .iter()
        .fold(0u8, |acc, &byte| acc.wrapping_add(byte));
    CHECKSUM_SEED.wrapping_sub(sum)
}

fn build_payload(cmd: u8, addr: u16, len: u8, data: &[u8]) -> [u8; 16] {
    let mut payload = [0u8; 16];
    payload[0] = cmd;
    payload[1] = 0x00;
    payload[2] = (addr >> 8) as u8;
    payload[3] = addr as u8;
    payload[4] = len;
    let copy_len = data.len().min(MAX_CHUNK);
    payload[5..5 + copy_len].copy_from_slice(&data[..copy_len]);
    payload[15] = checksum(&payload);
    payload
}

/// RGB block 0xA0 = `[effect, R, G, B, brightness, speed, block_cksum]`
/// (7 data bytes; the 7th is the block-internal sum checksum byte).
/// effect 0x02 = static.
fn rgb_static_payload(r: u8, g: u8, b: u8) -> [u8; 16] {
    let mut block = [0u8; 7];
    block[0] = 0x02; // effect: static
    block[1] = r;
    block[2] = g;
    block[3] = b;
    block[4] = 0xFF; // brightness (max)
    block[5] = 0x00; // speed (n/a for static)
    let block_sum = block[..6].iter().fold(0u8, |acc, &x| acc.wrapping_add(x));
    block[6] = CHECKSUM_SEED.wrapping_sub(block_sum);
    build_payload(CMD_EEPROM_WRITE, 0xA0, block.len() as u8, &block)
}

fn send_feature(device: &HidDevice, payload: &[u8; 16]) -> Result<(), String> {
    let mut report = [0u8; 17];
    report[0] = REPORT_ID;
    report[1..].copy_from_slice(payload);
    device
        .send_feature_report(&report)
        .map(|_| ())
        .map_err(|err| format!("SetFeature failed: {err}"))
}

fn send_output(device: &HidDevice, payload: &[u8; 16]) -> Result<usize, String> {
    let mut report = [0u8; 17];
    report[0] = REPORT_ID;
    report[1..].copy_from_slice(payload);
    device
        .write(&report)
        .map_err(|err| format!("WriteFile(output) failed: {err}"))
}

/// Round-robin poll over every open collection, printing each report with a
/// collection tag. Reports with repeated mouse-move shape are squelched to
/// keep the log readable.
fn poll_all(readers: &[(HidDevice, String)], window: Duration, label: &str) {
    println!("   [{label}] polling {window:?} across {} collection(s)...", readers.len());
    let mut squelched = HashMap::new();
    let start = Instant::now();
    let mut buffer = [0u8; 256];
    let mut index = 0usize;
    while start.elapsed() < window {
        for (device, tag) in readers {
            match device.read_timeout(&mut buffer, 10) {
                Ok(0) => {}
                Ok(n) => {
                    index += 1;
                    let slice = &buffer[..n];
                    // Squelch plain mouse reports (large IN, high-id patterns)
                    // unless it is the first of its kind on that collection.
                    let key = (n, slice[0]);
                    let seen = squelched.entry((tag, key)).or_insert(0);
                    *seen += 1;
                    let show = *seen <= 3;
                    if show {
                        println!(
                            "   [{label}] +{:<5} ms {tag:>8} {n:>3}B {:02X?}",
                            start.elapsed().as_millis(),
                            slice
                        );
                        if *seen == 3 {
                            println!("   [{label}] {tag} : further identical shapes squelched");
                        }
                    }
                }
                Err(error) => {
                    if !error.to_string().contains("6F8") {
                        println!("   [{label}] {tag} read error: {error}");
                    }
                }
            }
        }
        if index == 0 && start.elapsed() < window {
            sleep(Duration::from_millis(5));
        }
    }
    if index == 0 {
        println!("   [{label}] nothing arrived on any IN pipe.");
    }
}

/// OEM-style ACK wait: poll all collections in rounds; stop at the first
/// report that could plausibly be the ACK (any byte == 0x07 echo).
fn wait_ack(readers: &[(HidDevice, String)]) {
    println!("   [ack] polling IN pipes for ACK (50 x 20 ms) ...");
    let mut buffer = [0u8; 256];
    for round in 0..50 {
        for (device, tag) in readers {
            match device.read_timeout(&mut buffer, 20) {
                Ok(0) => {}
                Ok(n) => {
                    let slice = &buffer[..n];
                    println!("   [ack] round {round:>2} {tag} {n:>2}B {:02X?}", slice);
                    for (i, b) in slice.iter().enumerate() {
                        if *b == CMD_EEPROM_WRITE {
                            println!("   [ack]   ^ byte {i} == 0x07 (possible command echo)");
                        }
                    }
                    return;
                }
                Err(_) => {}
            }
        }
    }
    println!("   [ack] no report received in 1 s.");
}

struct Target {
    writer: Option<HidDevice>,
    readers: Vec<(HidDevice, String)>,
    pid: u16,
    iface: i32,
}

fn collect_targets(api: &HidApi) -> Vec<Target> {
    let infos: Vec<_> = api
        .device_list()
        .filter(|info| info.vendor_id() == VENDOR_ID)
        .collect();

    let mut groups: Vec<(u16, i32)> = infos
        .iter()
        .map(|info| (info.product_id(), info.interface_number()))
        .collect();
    groups.sort_by_key(|&(pid, iface)| (pid, iface));
    groups.dedup();

    groups
        .into_iter()
        .map(|(pid, iface)| {
            let mut writer = None;
            let mut readers = Vec::new();
            for info in infos.iter().filter(|info| {
                info.product_id() == pid && info.interface_number() == iface
            }) {
                let tag = format!("0x{:04X}/0x{:04X}", info.usage_page(), info.usage());
                match api.open_path(info.path()) {
                    Ok(device) => {
                        if info.usage_page() == 0xFF02 {
                            writer = Some(device);
                        } else {
                            readers.push((device, format!("up{tag}")));
                        }
                    }
                    Err(error) => println!(
                        "   open failed PID 0x{pid:04X} if={iface} {tag}: {error}"
                    ),
                }
            }
            Target {
                writer,
                readers,
                pid,
                iface,
            }
        })
        .collect()
}

fn main() {
    let mode = env::args().nth(1).unwrap_or_else(|| "help".into());
    let api = HidApi::new().expect("hidapi init failed");
    let targets = collect_targets(&api);

    if targets.is_empty() {
        println!("No KLIM Blaze device found (VID 0x{VENDOR_ID:04X}).");
        return;
    }

    println!("mode: {mode}");
    for target in &targets {
        let Target {
            writer,
            readers,
            pid,
            iface,
        } = target;
        println!("-- PID 0x{pid:04X} if={iface}: {} reader collection(s)", readers.len());
        if writer.is_none() {
            println!("   (no 0xFF02 feature-writer collection on this interface)");
        }
        poll_all(readers, Duration::from_millis(700), "base");

        let payload = match mode.as_str() {
            "read" => build_payload(CMD_EEPROM_READ, 0xA0, MAX_CHUNK as u8, &[]),
            "feature" | "output" | "ack" => rgb_static_payload(0xFF, 0x00, 0x00),
            "cycle" => rgb_static_payload(0xFF, 0x00, 0x00),
            _ => {
                println!("usage: hid_tx_probe read|feature|output|ack");
                return;
            }
        };

        let writer = match writer {
            Some(writer) => writer,
            None => continue,
        };

        if mode == "output" {
            match send_output(writer, &payload) {
                Ok(n) => println!("   WriteFile(output) wrote {n} bytes"),
                Err(error) => println!("   {error}"),
            }
        } else if mode == "cycle" {
            let colours: [(u8, u8, u8, &str); 4] = [
                (0xFF, 0x00, 0x00, "RED"),
                (0x00, 0xFF, 0x00, "GREEN"),
                (0x00, 0x00, 0xFF, "BLUE"),
                (0x00, 0x00, 0x00, "OFF(black)"),
            ];
            for (r, g, b, name) in colours {
                println!("   ---> sending {name} now ({r:02X},{g:02X},{b:02X})");
                let payload = rgb_static_payload(r, g, b);
                match send_feature(writer, &payload) {
                    Ok(()) => {
                        println!("   SetFeature OK at {:?}", std::time::SystemTime::now())
                    }
                    Err(error) => println!("   {error}"),
                }
                wait_ack(readers);
                sleep(Duration::from_millis(2500));
            }
            println!("   >>> cycle finished: what colour sequence did the mouse show?");
            return;
        } else {
            println!("   sending payload {:02X?}", payload);
            match send_feature(writer, &payload) {
                Ok(()) => println!("   SetFeature OK"),
                Err(error) => println!("   {error}"),
            }
        }

        match mode.as_str() {
            "ack" => wait_ack(readers),
            _ => poll_all(readers, Duration::from_millis(2500), "rx"),
        };
        if mode != "read" {
            println!("   >>> did the LED react? (this test sets static red)");
        }
        println!();
    }
}
