//! KLIM Blaze HID transport + EEPROM command layer.
//!
//! Everything in this module was derived from the bundled OEM application
//! (`OemDrv.exe` / `Lowerdev.dll`).  The mouse speaks a small, fixed-size HID
//! **feature report** protocol:
//!
//! ```text
//! byte 0       0x08                     report id
//! byte 1       command (0x07 write / 0x08 read)
//! byte 2       0x00
//! byte 3       address high
//! byte 4       address low
//! byte 5       payload length
//! byte 6..15   payload (up to 10 bytes, zero padded)
//! byte 16      0x55 - sum(bytes 1..15) & 0xFF
//! ```
//!
//! The checksum makes the sum of the whole 16-byte payload (report id
//! excluded) equal `0x55`.
//!
//! Writes are issued as feature reports. The OEM application reads replies
//! from the interrupt IN pipe (it drains input reports in a retry loop), so
//! `get_feature_report` returns an all-zero report on retail firmware. This
//! app only needs the write path; the battery probe intentionally reads the
//! input pipe instead.

use hidapi::{HidApi, HidDevice};
use serde::Serialize;
use std::ffi::CString;
use std::sync::Mutex;
use std::thread::sleep;
use std::time::Duration;

pub const VENDOR_ID: u16 = 0x260D;
pub const PID_WIRED: u16 = 0x1016;
pub const PID_WIRELESS: u16 = 0x1026;

const REPORT_ID: u8 = 0x08;
const REPORT_LEN: usize = 17;
const CMD_EEPROM_WRITE: u8 = 0x07;
const PACKET_DATA_MAX: usize = 10;
const CHECKSUM_SEED: u8 = 0x55;

pub const EEPROM_ADDR_POLLING_RATE: u16 = 0x00;
pub const EEPROM_ADDR_DPI: u16 = 0x0C;
pub const EEPROM_ADDR_MAIN_RGB: u16 = 0xA0;

pub const BUTTON_COUNT: usize = 7;
pub const BUTTON_EEPROM_ADDRS: [u16; BUTTON_COUNT] = [0x60, 0x64, 0x68, 0x6C, 0x70, 0x78, 0x7C];
pub const DEFAULT_BUTTON_ACTIONS: [[u8; 3]; BUTTON_COUNT] = [
    [0x01, 0x01, 0x00], // B1: Left Click
    [0x01, 0x02, 0x00], // B2: Right Click
    [0x01, 0x04, 0x00], // B3: Middle Click
    [0x01, 0x08, 0x00], // B4: Forward Side
    [0x01, 0x10, 0x00], // B5: Backward Side
    [0x09, 0x00, 0x00], // B6: DPI Loop (Cycle)
    [0x02, 0x01, 0x00], // B7: DPI -
];

/// Effect speed table for Wave/Neon (index 1..=10), read from `OemDrv.exe` @ 0x5CC85C.
/// Delays in ms: 45ms down to 3ms.
const WAVE_SPEED_TABLE: [u8; 11] = [
    0x00, 0x2D, 0x28, 0x23, 0x1E, 0x19, 0x13, 0x0F, 0x0A, 0x05, 0x03,
];

/// Effect speed table for Breathing (index 1..=10), read from `OemDrv.exe` @ 0x5CC868.
/// Timer delays: 255 down to 40.
const BREATHE_SPEED_TABLE: [u8; 11] = [
    0x00, 0xFF, 0xE6, 0xD2, 0xBE, 0xAA, 0x96, 0x82, 0x6E, 0x46, 0x28,
];

/// Brightness table (index 1..=10), read from `OemDrv.exe` @ 0x5CC874.
/// 10% to 100% PWM duty cycle: 25 to 255.
const BRIGHTNESS_TABLE: [u8; 11] = [
    0x00, 0x19, 0x32, 0x4B, 0x64, 0x7D, 0x96, 0xAF, 0xC8, 0xE1, 0xFF,
];

/// Sensor 0x4090 DPI register codes for 200..5000 DPI in 100 DPI steps,
/// read from `OemDrv.exe` @ 0x5CC238.  Above 5000 DPI the OEM firmware uses
/// the same table with `dpi / 2` and sets the "high range" flag byte.
const DPI_CODES: [u8; 49] = [
    0x04, 0x06, 0x08, 0x0B, 0x0D, 0x0F, 0x12, 0x14, 0x16, 0x19, 0x1B, 0x1D, 0x20, 0x22, 0x24, 0x27,
    0x29, 0x2B, 0x2E, 0x30, 0x32, 0x34, 0x37, 0x39, 0x3B, 0x3E, 0x40, 0x42, 0x45, 0x47, 0x49, 0x4C,
    0x4E, 0x50, 0x53, 0x55, 0x57, 0x5A, 0x5C, 0x5E, 0x61, 0x63, 0x65, 0x68, 0x6A, 0x6C, 0x6F, 0x71,
    0x73,
];

const MIN_DPI: u16 = 200;
const MAX_DPI: u16 = 10_000;
const HIGH_RANGE_THRESHOLD: u16 = 5_000;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceInfo {
    pub path: String,
    pub vendor_id: u16,
    pub product_id: u16,
    pub manufacturer: Option<String>,
    pub product: Option<String>,
    pub serial_number: Option<String>,
    pub interface_number: i32,
    pub usage_page: u16,
    pub usage: u16,
    pub wireless: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatteryStatus {
    /// False when the mouse does not expose battery telemetry through the
    /// decoded protocol (the UI then shows a dash instead of a percentage).
    pub supported: bool,
    pub level: Option<u8>,
    pub charging: bool,
    pub note: String,
}

#[derive(Debug, Clone, Copy)]
enum DeviceKind {
    Wired,
    Wireless,
}

impl DeviceKind {
    fn from_pid(pid: u16) -> Option<Self> {
        match pid {
            PID_WIRED => Some(Self::Wired),
            PID_WIRELESS => Some(Self::Wireless),
            _ => None,
        }
    }

    fn is_wireless(self) -> bool {
        matches!(self, Self::Wireless)
    }
}

/// Owns the `hidapi` context and the currently selected device path.
///
/// The device is opened for each operation instead of being kept open: it
/// keeps the shared state trivially `Send + Sync` and lets the user hot-plug
/// the mouse (or switch between the wired and the 2.4 GHz receiver) without
/// restarting the application.
pub struct HidManager {
    api: Mutex<Option<HidApi>>,
    preferred_path: Mutex<Option<String>>,
}

impl HidManager {
    pub fn new() -> Self {
        let api = HidApi::new().ok();
        Self {
            api: Mutex::new(api),
            preferred_path: Mutex::new(None),
        }
    }

    pub fn list_devices(&self) -> Result<Vec<DeviceInfo>, String> {
        let mut api_guard = self.api.lock().map_err(|_| "HID state poisoned")?;
        let api = api_guard
            .as_mut()
            .ok_or_else(|| "HID subsystem unavailable (hidapi failed to initialise)".to_string())?;
        // hidapi caches the device list, so ask for a fresh enumeration. This
        // is what makes hot-plugging the mouse or its receiver work.
        let _ = api.refresh_devices();

        let mut devices: Vec<DeviceInfo> = Vec::new();
        for info in api.device_list() {
            if info.vendor_id() != VENDOR_ID {
                continue;
            }
            let Some(kind) = DeviceKind::from_pid(info.product_id()) else {
                continue;
            };

            let candidate = DeviceInfo {
                path: info.path().to_string_lossy().into_owned(),
                vendor_id: info.vendor_id(),
                product_id: info.product_id(),
                manufacturer: info.manufacturer_string().map(str::to_owned),
                product: info.product_string().map(str::to_owned),
                serial_number: info.serial_number().map(str::to_owned),
                interface_number: info.interface_number(),
                usage_page: info.usage_page(),
                usage: info.usage(),
                wireless: kind.is_wireless(),
            };

            // The receiver exposes eight top-level collections. Keep a single
            // row per product, preferring the vendor control collection
            // (usage page 0xFF02) that actually accepts feature reports.
            if let Some(index) = devices
                .iter()
                .position(|device| device.product_id == candidate.product_id)
            {
                if usage_rank(candidate.usage_page) > usage_rank(devices[index].usage_page) {
                    devices[index] = candidate;
                }
            } else {
                devices.push(candidate);
            }
        }

        // Prefer the wireless receiver when both are plugged in.
        devices.sort_by_key(|d| if d.wireless { 0 } else { 1 });
        Ok(devices)
    }

    fn enumerate_path(api: &HidApi) -> Option<(String, DeviceKind)> {
        let mut best: Option<((bool, u8), String, DeviceKind)> = None;

        for info in api.device_list() {
            if info.vendor_id() != VENDOR_ID {
                continue;
            }
            let Some(kind) = DeviceKind::from_pid(info.product_id()) else {
                continue;
            };

            // Wireless first, then the highest-ranked usage page. On the KLIM
            // Blaze receiver only usage page 0xFF02 accepts SetFeature; the
            // other collections return ERROR_INVALID_FUNCTION.
            let score = (kind.is_wireless(), usage_rank(info.usage_page()));
            if best
                .as_ref()
                .map_or(true, |(current, _, _)| score > *current)
            {
                best = Some((score, info.path().to_string_lossy().into_owned(), kind));
            }
        }

        best.map(|(_, path, kind)| (path, kind))
    }

    /// Runs `action` against an open device, re-enumerating and retrying once
    /// if the cached path went stale (unplug / reconnect).
    fn with_device<T>(
        &self,
        action: impl Fn(&HidDevice) -> Result<T, String>,
    ) -> Result<T, String> {
        let mut api_guard = self.api.lock().map_err(|_| "HID state poisoned")?;
        let api = api_guard
            .as_mut()
            .ok_or_else(|| "HID subsystem unavailable (hidapi failed to initialise)".to_string())?;
        let _ = api.refresh_devices();

        let cached = self
            .preferred_path
            .lock()
            .map_err(|_| "HID state poisoned")?
            .clone();

        if let Some(path) = cached {
            if let Ok(cpath) = CString::new(path.clone()) {
                if let Ok(device) = api.open_path(&cpath) {
                    match action(&device) {
                        Ok(value) => return Ok(value),
                        Err(err) => {
                            // Fall through to a fresh enumeration once, but keep
                            // the original error in case the retry also fails.
                            let _ = err;
                        }
                    }
                }
            }
        }

        let (path, _kind) = Self::enumerate_path(api)
            .ok_or_else(|| "Device disconnected (no KLIM Blaze receiver found)".to_string())?;
        let cpath = CString::new(path.clone()).map_err(|_| "Invalid HID path".to_string())?;

        let mut last_err = String::from("Device disconnected");
        for attempt in 0..2 {
            match api.open_path(&cpath) {
                Ok(device) => {
                    *self
                        .preferred_path
                        .lock()
                        .map_err(|_| "HID state poisoned")? = Some(path.clone());
                    match action(&device) {
                        Ok(value) => return Ok(value),
                        Err(err) => last_err = err,
                    }
                }
                Err(err) => {
                    last_err = format!(
                        "Cannot open device: {err}. Close the OEM KLIM software or any \
                         other application that may be holding the mouse open."
                    );
                }
            }
            if attempt == 0 {
                sleep(Duration::from_millis(80));
            }
        }
        Err(last_err)
    }

    pub fn apply_rgb(
        &self,
        mode: u8,
        r: u8,
        g: u8,
        b: u8,
        speed: u8,
        brightness: u8,
    ) -> Result<(), String> {
        // OEM effect byte mapping (see OemDrv.exe @ 0x40B977):
        //   effect 1 (static)   -> mode 0x02
        //   effect 2 (breathing)-> mode 0x01
        //   effect 3 (wave)     -> mode 0x00
        //   effect 0/4 (off)    -> mode 0x04
        let effect = match mode {
            0 => 0x02, // static
            1 => 0x01, // breathing
            2 => 0x00, // wave / rainbow
            _ => 0x04, // off
        };

        let speed_index = speed.clamp(1, 10) as usize;
        let brightness_index = brightness.clamp(1, 10) as usize;

        let speed_byte = match effect {
            0x00 => WAVE_SPEED_TABLE[speed_index],
            0x01 => BREATHE_SPEED_TABLE[speed_index],
            _ => 0x00,
        };
        let brightness_byte = BRIGHTNESS_TABLE[brightness_index];

        let mut block = [0u8; 7];
        block[0] = effect;
        block[1] = r;
        block[2] = g;
        block[3] = b;
        block[4] = speed_byte;
        block[5] = brightness_byte;
        block[6] = block_checksum(&block[..6]);

        self.with_device(|device| write_eeprom(device, EEPROM_ADDR_MAIN_RGB, &block, 10))
    }

    /// Returns the levels exactly as they were written (values snapped to the
    /// sensor's supported grid).
    pub fn set_dpi_levels(
        &self,
        levels: &[u16],
        colors: &[(u8, u8, u8)],
        active_index: usize,
    ) -> Result<Vec<u16>, String> {
        if levels.is_empty() {
            return Err("At least one DPI stage is required".to_string());
        }
        if levels.len() > 8 {
            return Err("The mouse supports at most 8 DPI stages".to_string());
        }

        let mut applied = Vec::with_capacity(levels.len());
        let mut block = Vec::with_capacity(levels.len() * 4);

        for &dpi in levels {
            let (snapped, code, flag) = encode_dpi(dpi);
            applied.push(snapped);

            // The OEM stores X and Y separately; the UI drives both equally.
            block.push(code);
            block.push(code);
            block.push(flag);
            block.push(
                CHECKSUM_SEED
                    .wrapping_sub(code)
                    .wrapping_sub(code)
                    .wrapping_sub(flag),
            );
        }

        let stage_u8 = (active_index.min(levels.len().saturating_sub(1))) as u8;

        self.with_device(|device| {
            // Two stages (8 bytes) per feature report, exactly like OemDrv.exe.
            write_eeprom(device, EEPROM_ADDR_DPI, &block, 8)?;

            // Write stage colors to EEPROM address 0x2C (OEM DPI stage color table)
            if !colors.is_empty() {
                let mut color_block = Vec::with_capacity(colors.len() * 4);
                for &(r, g, b) in colors {
                    let cs = CHECKSUM_SEED.wrapping_sub(r).wrapping_sub(g).wrapping_sub(b);
                    color_block.push(r);
                    color_block.push(g);
                    color_block.push(b);
                    color_block.push(cs);
                }
                let _ = write_eeprom(device, 0x2C, &color_block, 8);
            }

            // Write active stage index to EEPROM address 0x02
            let stage_block = [stage_u8, CHECKSUM_SEED.wrapping_sub(stage_u8)];
            let _ = write_eeprom(device, 0x02, &stage_block, 10);

            // Send live CMD 0x02 to switch hardware firmware immediately
            let payload = build_payload(0x02, 0, 1, &[stage_u8]);
            send_feature(device, &payload)?;

            Ok(())
        })?;

        Ok(applied)
    }

    /// Sets the active DPI stage on the mouse hardware (EEPROM addr 0x02 + live CMD 0x02).
    pub fn set_dpi_stage(&self, stage: usize) -> Result<(), String> {
        let stage_u8 = stage as u8;
        // 1. Write active stage index to EEPROM address 0x02 (persistent across power cycles)
        let block = [stage_u8, CHECKSUM_SEED.wrapping_sub(stage_u8)];
        let payload = build_payload(0x02, 0, 1, &[stage_u8]);

        self.with_device(|device| {
            write_eeprom(device, 0x02, &block, 10)?;
            send_feature(device, &payload)?;
            Ok(())
        })
    }

    /// Sets the DPI LED effect (0 = Off, 1 = Respiration, 2 = Steady) and speed (1..=5).
    /// Stored at EEPROM address 0x4C.
    pub fn set_dpi_effect(&self, mode: u8, speed: u8) -> Result<(), String> {
        let speed_table: [u8; 5] = [0x1D, 0x20, 0x22, 0x24, 0x27];
        let speed_idx = (speed.saturating_sub(1) as usize).min(4);
        let speed_code = speed_table[speed_idx];

        let block = [
            mode,
            CHECKSUM_SEED.wrapping_sub(mode),
            speed_code,
            CHECKSUM_SEED.wrapping_sub(speed_code),
            0x00,
            CHECKSUM_SEED,
        ];

        self.with_device(|device| write_eeprom(device, 0x4C, &block, 6))
    }

    /// Reads the currently active DPI stage index (0..7) from EEPROM address 0x02.
    pub fn get_active_dpi_stage(&self) -> Result<Option<usize>, String> {
        let mut api_guard = self.api.lock().map_err(|_| "HID state poisoned")?;
        let api = api_guard
            .as_mut()
            .ok_or_else(|| "HID subsystem unavailable".to_string())?;

        let mut writer_path = None;
        let mut reader_path = None;
        for info in api.device_list() {
            if info.vendor_id() != VENDOR_ID {
                continue;
            }
            if info.usage_page() == 0xFF02 {
                writer_path = Some(info.path().to_string_lossy().into_owned());
            } else if info.usage_page() == 0xFF01 {
                reader_path = Some(info.path().to_string_lossy().into_owned());
            }
        }

        let (Some(wpath), Some(rpath)) = (writer_path, reader_path) else {
            return Ok(None);
        };

        let Ok(cwpath) = CString::new(wpath) else { return Ok(None); };
        let Ok(crpath) = CString::new(rpath) else { return Ok(None); };

        let Ok(writer) = api.open_path(&cwpath) else { return Ok(None); };
        let Ok(reader) = api.open_path(&crpath) else { return Ok(None); };

        let payload = build_payload(0x08, 0x02, 2, &[]);
        let mut report = [0u8; REPORT_LEN];
        report[0] = REPORT_ID;
        report[1..].copy_from_slice(&payload);
        if writer.send_feature_report(&report).is_err() {
            return Ok(None);
        }

        let mut buf = [0u8; 64];
        for _ in 0..8 {
            if let Ok(n) = reader.read_timeout(&mut buf, 80) {
                if n >= 7 && buf[0] == 0x09 && buf[1] == 0x08 && buf[4] == 0x02 {
                    let stage = buf[6] as usize;
                    return Ok(Some(stage));
                }
            }
        }

        Ok(None)
    }

    pub fn set_polling_rate(&self, hz: u16) -> Result<(), String> {
        // OemDrv.exe @ 0x40BD24: 125 -> 8, 250 -> 4, 500 -> 2, 1000 -> 1.
        let code = match hz {
            125 => 0x08,
            250 => 0x04,
            500 => 0x02,
            1000 => 0x01,
            other => {
                return Err(format!(
                    "Unsupported polling rate {other} Hz (use 125, 250, 500 or 1000)"
                ))
            }
        };
        let block = [code, CHECKSUM_SEED.wrapping_sub(code)];
        self.with_device(|device| write_eeprom(device, EEPROM_ADDR_POLLING_RATE, &block, 10))
    }

    /// Reads the 7 button bindings from EEPROM.
    /// Each binding is returned as 3 bytes: `[byte0, byte1, byte2]`.
    pub fn get_button_bindings(&self) -> Result<Vec<[u8; 3]>, String> {
        let mut api_guard = self.api.lock().map_err(|_| "HID state poisoned")?;
        let api = api_guard
            .as_mut()
            .ok_or_else(|| "HID subsystem unavailable".to_string())?;

        let mut writer_path = None;
        let mut reader_path = None;
        for info in api.device_list() {
            if info.vendor_id() != VENDOR_ID {
                continue;
            }
            if info.usage_page() == 0xFF02 {
                writer_path = Some(info.path().to_string_lossy().into_owned());
            } else if info.usage_page() == 0xFF01 {
                reader_path = Some(info.path().to_string_lossy().into_owned());
            }
        }

        let (Some(wpath), Some(rpath)) = (writer_path, reader_path) else {
            return Ok(DEFAULT_BUTTON_ACTIONS.to_vec());
        };

        let Ok(cwpath) = CString::new(wpath) else {
            return Ok(DEFAULT_BUTTON_ACTIONS.to_vec());
        };
        let Ok(crpath) = CString::new(rpath) else {
            return Ok(DEFAULT_BUTTON_ACTIONS.to_vec());
        };

        let Ok(writer) = api.open_path(&cwpath) else {
            return Ok(DEFAULT_BUTTON_ACTIONS.to_vec());
        };
        let Ok(reader) = api.open_path(&crpath) else {
            return Ok(DEFAULT_BUTTON_ACTIONS.to_vec());
        };

        let mut results = DEFAULT_BUTTON_ACTIONS.to_vec();

        // Drain stale reports from reader buffer
        let mut drain_buf = [0u8; 64];
        while reader.read_timeout(&mut drain_buf, 10).unwrap_or(0) > 0 {}

        let chunks: [(u16, usize, Option<usize>); 4] = [
            (0x60, 0, Some(1)), // B1: 0x60, B2: 0x64
            (0x68, 2, Some(3)), // B3: 0x68, B4: 0x6C
            (0x70, 4, None),    // B5: 0x70 (0x74 is reserved)
            (0x78, 5, Some(6)), // B6: 0x78, B7: 0x7C
        ];

        for (addr, b_first, b_second) in chunks {
            let payload = build_payload(0x08, addr, 8, &[]);
            let mut report = [0u8; REPORT_LEN];
            report[0] = REPORT_ID;
            report[1..].copy_from_slice(&payload);
            if writer.send_feature_report(&report).is_err() {
                continue;
            }

            let mut buf = [0u8; 64];
            for _ in 0..8 {
                if let Ok(n) = reader.read_timeout(&mut buf, 60) {
                    if n >= 14 && buf[0] == 0x09 && buf[1] == 0x08 && buf[4] == (addr as u8) {
                        let csum1 = CHECKSUM_SEED
                            .wrapping_sub(buf[6])
                            .wrapping_sub(buf[7])
                            .wrapping_sub(buf[8]);
                        if csum1 == buf[9] {
                            results[b_first] = [buf[6], buf[7], buf[8]];
                        }
                        if let Some(second_idx) = b_second {
                            let csum2 = CHECKSUM_SEED
                                .wrapping_sub(buf[10])
                                .wrapping_sub(buf[11])
                                .wrapping_sub(buf[12]);
                            if csum2 == buf[13] {
                                results[second_idx] = [buf[10], buf[11], buf[12]];
                            }
                        }
                        break;
                    }
                }
            }
        }

        Ok(results)
    }

    /// Sets the action for a specific button (index 0..=6).
    pub fn set_button_binding(&self, button_index: usize, action: [u8; 3]) -> Result<(), String> {
        if button_index >= BUTTON_COUNT {
            return Err(format!(
                "Invalid button index {button_index} (must be 0..{BUTTON_COUNT})"
            ));
        }
        let addr = BUTTON_EEPROM_ADDRS[button_index];
        let csum = CHECKSUM_SEED
            .wrapping_sub(action[0])
            .wrapping_sub(action[1])
            .wrapping_sub(action[2]);
        let block = [action[0], action[1], action[2], csum];

        self.with_device(|device| write_eeprom(device, addr, &block, 4))
    }

    /// Resets all 7 buttons to factory defaults.
    pub fn reset_button_bindings(&self) -> Result<(), String> {
        for (i, action) in DEFAULT_BUTTON_ACTIONS.iter().enumerate() {
            self.set_button_binding(i, *action)?;
            sleep(Duration::from_millis(15));
        }
        Ok(())
    }

    /// Queries the battery level using CMD 0x04 (OEM protocol) or reading receiver status.
    pub fn battery_status(&self) -> Result<BatteryStatus, String> {
        let mut api_guard = self.api.lock().map_err(|_| "HID state poisoned")?;
        let api = api_guard
            .as_mut()
            .ok_or_else(|| "HID subsystem unavailable".to_string())?;
        let _ = api.refresh_devices();

        let mut has_wired_device = false;
        let mut writer_path = None;
        let mut reader_path = None;
        for info in api.device_list() {
            if info.vendor_id() != VENDOR_ID {
                continue;
            }
            if info.product_id() == PID_WIRED {
                has_wired_device = true;
            }
            if info.usage_page() == 0xFF02 {
                writer_path = Some(info.path().to_string_lossy().into_owned());
            } else if info.usage_page() == 0xFF01 {
                reader_path = Some(info.path().to_string_lossy().into_owned());
            }
        }

        let Some(wpath) = writer_path else {
            return Ok(BatteryStatus {
                supported: false,
                level: None,
                charging: false,
                note: "Device not found".to_string(),
            });
        };

        let Ok(cwpath) = CString::new(wpath) else {
            return Err("Invalid writer path".to_string());
        };
        let writer = api.open_path(&cwpath).map_err(|e| e.to_string())?;

        // Send CMD 0x04 (OEM battery query)
        let payload = build_payload(0x04, 0, 0, &[]);
        if let Err(e) = send_feature(&writer, &payload) {
            return Err(e);
        }

        if let Some(rpath) = reader_path {
            if let Ok(crpath) = CString::new(rpath) {
                if let Ok(reader) = api.open_path(&crpath) {
                    let mut buf = [0u8; 64];
                    for _ in 0..6 {
                        if let Ok(n) = reader.read_timeout(&mut buf, 80) {
                            if n >= 8 && buf[0] == 0x09 && buf[1] == 0x04 {
                                let raw_level = buf[6];
                                let level = (raw_level.min(10) * 10).clamp(0, 100);
                                // buf[5] is length of telemetry data (2 bytes)
                                // buf[6] is battery charge level (0..10 -> 0%..100%)
                                // buf[7] is hardware power/charging flag: 1 = charging/power, 0 = discharging (battery)
                                let charging = buf[7] == 1 || has_wired_device;
                                let note = if charging {
                                    format!("Charging ({level}%)")
                                } else {
                                    format!("Battery: {level}%")
                                };
                                return Ok(BatteryStatus {
                                    supported: true,
                                    level: Some(level),
                                    charging,
                                    note,
                                });
                            }
                        }
                    }
                }
            }
        }

        if has_wired_device {
            return Ok(BatteryStatus {
                supported: true,
                level: Some(100),
                charging: true,
                note: "Wired charging (USB power)".to_string(),
            });
        }

        Ok(BatteryStatus {
            supported: false,
            level: None,
            charging: false,
            note: "No battery response received".to_string(),
        })
    }
}

impl Default for HidManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Sends one 17-byte feature report: `[0x08, payload(16)]`.
fn send_feature(device: &HidDevice, payload: &[u8; 16]) -> Result<(), String> {
    let mut report = [0u8; REPORT_LEN];
    report[0] = REPORT_ID;
    report[1..].copy_from_slice(payload);

    device
        .send_feature_report(&report)
        .map(|_| ())
        .map_err(|err| format!("HID write failed: {err}"))
}

fn build_payload(cmd: u8, addr: u16, len: u8, data: &[u8]) -> [u8; 16] {
    let mut payload = [0u8; 16];
    payload[0] = cmd;
    payload[1] = 0x00;
    payload[2] = (addr >> 8) as u8;
    payload[3] = addr as u8;
    payload[4] = len;

    let copy_len = data.len().min(PACKET_DATA_MAX);
    payload[5..5 + copy_len].copy_from_slice(&data[..copy_len]);

    // In OEM firmware (OemDrv.exe @ 0x441340), the sum that equals 0x55 includes
    // the REPORT_ID byte at index 0 of the 17-byte HID report.
    let sum = REPORT_ID.wrapping_add(
        payload[..15]
            .iter()
            .fold(0u8, |acc, &byte| acc.wrapping_add(byte)),
    );
    payload[15] = CHECKSUM_SEED.wrapping_sub(sum);
    payload
}

fn write_eeprom(
    device: &HidDevice,
    base_addr: u16,
    data: &[u8],
    chunk_size: usize,
) -> Result<(), String> {
    let chunk_size = chunk_size.clamp(1, PACKET_DATA_MAX);
    for (index, chunk) in data.chunks(chunk_size).enumerate() {
        let addr = base_addr.wrapping_add((index * chunk_size) as u16);
        let payload = build_payload(CMD_EEPROM_WRITE, addr, chunk.len() as u8, chunk);
        send_feature(device, &payload)?;
        // The OEM application sleeps 10 ms between EEPROM writes.
        sleep(Duration::from_millis(9));
    }
    Ok(())
}

/// Higher is a better candidate for feature-report I/O.
///
/// The 2.4 GHz receiver exposes usage pages 0x0001, 0x000C, 0xFF01..0xFF04 on
/// interface 1. Only 0xFF02 (vendor-defined control) accepts the 17-byte
/// SetFeature report; everything else fails with ERROR_INVALID_FUNCTION.
fn usage_rank(usage_page: u16) -> u8 {
    match usage_page {
        0xFF02 => 3,
        page if page >= 0xFF00 => 2,
        0x0001 => 1,
        _ => 0,
    }
}

fn block_checksum(bytes: &[u8]) -> u8 {
    let sum = bytes.iter().fold(0u8, |acc, &byte| acc.wrapping_add(byte));
    CHECKSUM_SEED.wrapping_sub(sum)
}

/// Maps a requested DPI value to the sensor's `(register_code, high_range_flag)`
/// pair, returning the DPI value the hardware will actually use.
fn encode_dpi(dpi: u16) -> (u16, u8, u8) {
    let dpi = dpi.clamp(MIN_DPI, MAX_DPI);

    if dpi <= HIGH_RANGE_THRESHOLD {
        let snapped = (dpi.saturating_sub(MIN_DPI) + 50) / 100 * 100 + MIN_DPI;
        let snapped = snapped.clamp(MIN_DPI, HIGH_RANGE_THRESHOLD);
        let index = ((snapped - MIN_DPI) / 100) as usize;
        (snapped, DPI_CODES[index], 0x00)
    } else {
        let snapped = ((dpi + 100) / 200 * 200).clamp(5_200, MAX_DPI);
        // The firmware halves the DPI before looking it up and raises the
        // "high range" flag byte.
        let half = snapped / 2;
        let index = ((half - MIN_DPI) / 100) as usize;
        (snapped, DPI_CODES[index], 0x01)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore]
    fn test_live_button_bindings() {
        let manager = HidManager::new();
        let bindings = manager.get_button_bindings();
        println!("Live button bindings: {:?}", bindings);
        assert!(bindings.is_ok());
        let b = bindings.unwrap();
        assert_eq!(b.len(), 7);

        // Test roundtrip write & restore on Button 7 (index 6)
        let old_b7 = b[6];
        let test_action = [0x06, 0xE2, 0x00]; // Mute
        assert!(manager.set_button_binding(6, test_action).is_ok());
        std::thread::sleep(Duration::from_millis(50));

        let updated = manager.get_button_bindings().expect("read updated");
        println!("Button 7 after set to Mute: {:?}", updated[6]);
        assert_eq!(updated[6], test_action);

        // Restore original
        assert!(manager.set_button_binding(6, old_b7).is_ok());
        std::thread::sleep(Duration::from_millis(50));
        let restored = manager.get_button_bindings().expect("read restored");
        println!("Button 7 after restoring: {:?}", restored[6]);
        assert_eq!(restored[6], old_b7);
    }

    #[test]
    #[ignore]
    fn test_live_apply_rgb() {
        let manager = HidManager::new();
        let res = manager.apply_rgb(0, 0, 255, 0, 10, 10);
        assert!(res.is_ok(), "apply_rgb failed: {:?}", res.err());
        let bat = manager.battery_status();
        println!("Live battery status: {:?}", bat);
    }

    #[test]
    #[ignore]
    fn test_read_rgb_settings() {
        let manager = HidManager::new();
        let bat = manager.battery_status();
        println!("Live battery status: {:?}", bat);
    }

    #[test]
    fn dpi_codes_match_oem_table() {
        assert_eq!(encode_dpi(200), (200, 0x04, 0));
        assert_eq!(encode_dpi(600), (600, 0x0D, 0));
        assert_eq!(encode_dpi(1200), (1200, 0x1B, 0));
        assert_eq!(encode_dpi(5000), (5000, 0x73, 0));
        assert_eq!(encode_dpi(5200), (5200, 0x3B, 1));
        assert_eq!(encode_dpi(10000), (10000, 0x73, 1));
    }

    #[test]
    fn rgb_block_checksum_totals_to_0x55() {
        let block = [0x02u8, 0xFF, 0x00, 0x80, 0xFF, 0x32];
        let total = block
            .iter()
            .fold(0u8, |acc, &b| acc.wrapping_add(b))
            .wrapping_add(block_checksum(&block));
        assert_eq!(total, CHECKSUM_SEED);
    }

    #[test]
    fn payload_checksum_totals_to_0x55() {
        let payload = build_payload(CMD_EEPROM_WRITE, 0xA0, 7, &[1, 2, 3, 4, 5, 6, 7]);
        let total = REPORT_ID.wrapping_add(payload.iter().fold(0u8, |acc, &b| acc.wrapping_add(b)));
        assert_eq!(total, CHECKSUM_SEED);
    }

    #[test]
    #[ignore]
    fn test_live_dpi_diagnostics() {
        let manager = HidManager::new();
        println!("=== Listening for any incoming HID reports on 0xFF01 for 8 seconds ===");
        
        let mut api_guard = manager.api.lock().unwrap();
        let api = api_guard.as_mut().unwrap();
        let mut reader_path = None;
        for info in api.device_list() {
            if info.vendor_id() == VENDOR_ID && info.usage_page() == 0xFF01 {
                reader_path = Some(info.path().to_string_lossy().into_owned());
            }
        }

        if let Some(rpath) = reader_path {
            let cr = CString::new(rpath).unwrap();
            if let Ok(reader) = api.open_path(&cr) {
                println!("Listening on 0xFF01... (press physical DPI button now!)");
                let mut buf = [0u8; 64];
                let start = std::time::Instant::now();
                while start.elapsed() < Duration::from_secs(8) {
                    if let Ok(n) = reader.read_timeout(&mut buf, 200) {
                        if n > 0 {
                            println!("[{:.2}s] Received {n} bytes: {:02x?}", start.elapsed().as_secs_f32(), &buf[..n]);
                        }
                    }
                }
            }
        }
        println!("Done listening.");
    }
}