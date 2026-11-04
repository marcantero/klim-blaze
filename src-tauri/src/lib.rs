mod hid_manager;

use hid_manager::{BatteryStatus, DeviceInfo, HidManager};
use tauri::State;

// Commands are `async` so the HID sleeps (EEPROM writes need ~10 ms between
// packets) run off the UI thread. Tauri executes async commands on its own
// runtime, which keeps the window responsive while a write is in flight.

#[tauri::command]
async fn list_devices(state: State<'_, HidManager>) -> Result<Vec<DeviceInfo>, String> {
    state.list_devices()
}

#[tauri::command]
async fn apply_rgb(
    state: State<'_, HidManager>,
    mode: u8,
    r: u8,
    g: u8,
    b: u8,
    speed: u8,
) -> Result<(), String> {
    state.apply_rgb(mode, r, g, b, speed)
}

#[tauri::command]
async fn set_dpi_levels(
    state: State<'_, HidManager>,
    levels: Vec<u16>,
    active_index: usize,
) -> Result<Vec<u16>, String> {
    state.set_dpi_levels(&levels, active_index)
}

#[tauri::command]
async fn set_polling_rate(state: State<'_, HidManager>, hz: u16) -> Result<(), String> {
    state.set_polling_rate(hz)
}

#[tauri::command]
async fn get_battery_status(state: State<'_, HidManager>) -> Result<BatteryStatus, String> {
    state.battery_status()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(HidManager::new())
        .invoke_handler(tauri::generate_handler![
            list_devices,
            apply_rgb,
            set_dpi_levels,
            set_polling_rate,
            get_battery_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running the KLIM Blaze configurator");
}
