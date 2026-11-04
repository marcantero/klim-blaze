//! Read-only HID diagnostic.
//!
//! Lists every KLIM Blaze collection and tries a single EEPROM read (the main
//! RGB block at 0xA0) on each one. Nothing is written to the mouse.
//!
//! On retail firmware only usage page 0xFF02 accepts the feature report; the
//! all-zero feature replies are expected because the OEM receives read data on
//! the interrupt IN pipe instead.
//!
//! Run with: `cargo run --manifest-path src-tauri/Cargo.toml --example hid_probe`

use hidapi::{HidApi, HidDevice};
use std::thread::sleep;
use std::time::Duration;

const VENDOR_ID: u16 = 0x260D;
const REPORT_ID: u8 = 0x08;
const CHECKSUM_SEED: u8 = 0x55;

fn main() {
    let api = HidApi::new().expect("hidapi init failed");

    let devices: Vec<_> = api
        .device_list()
        .filter(|info| info.vendor_id() == VENDOR_ID)
        .collect();

    if devices.is_empty() {
        println!("No KLIM Blaze device found (VID 0x{VENDOR_ID:04X}).");
        return;
    }

    for info in &devices {
        println!(
            "pid=0x{:04X} if={} usage_page=0x{:04X} usage=0x{:04X} product={:?} mfg={:?}\n  path={}",
            info.product_id(),
            info.interface_number(),
            info.usage_page(),
            info.usage(),
            info.product_string(),
            info.manufacturer_string(),
            info.path().to_string_lossy(),
        );
    }

    for info in &devices {
        println!(
            "\n-- reading block 0xA0 on PID 0x{:04X} interface {} (usage page 0x{:04X})",
            info.product_id(),
            info.interface_number(),
            info.usage_page(),
        );

        let device = match api.open_path(info.path()) {
            Ok(device) => device,
            Err(error) => {
                println!("   open failed: {error}");
                continue;
            }
        };

        match read_eeprom(&device, 0xA0, 10) {
            Ok(data) => println!("   OK: {:02X?}", data),
            Err(error) => println!("   {error}"),
        }
    }
}

fn read_eeprom(device: &HidDevice, addr: u16, len: usize) -> Result<Vec<u8>, String> {
    let mut payload = [0u8; 16];
    payload[0] = 0x08; // EEPROM read
    payload[2] = (addr >> 8) as u8;
    payload[3] = addr as u8;
    payload[4] = len as u8;

    let sum = payload[..15]
        .iter()
        .fold(0u8, |acc, &byte| acc.wrapping_add(byte));
    payload[15] = CHECKSUM_SEED.wrapping_sub(sum);

    let mut report = [0u8; 17];
    report[0] = REPORT_ID;
    report[1..].copy_from_slice(&payload);

    device
        .send_feature_report(&report)
        .map_err(|error| format!("send failed: {error}"))?;

    sleep(Duration::from_millis(20));

    let mut buffer = [0u8; 17];
    for _ in 0..10 {
        // hidapi reads the report id from the first byte of the buffer.
        buffer[0] = REPORT_ID;
        match device.get_feature_report(&mut buffer) {
            Ok(n) => {
                println!("   reply n={n}: {:02X?}", &buffer[..n]);
                if n >= 6 && buffer[1] == 0x08 {
                    return Ok(buffer[6..n].to_vec());
                }
            }
            Err(error) => println!("   get_feature_report error: {error}"),
        }
        sleep(Duration::from_millis(10));
    }

    Err("no response".to_string())
}
