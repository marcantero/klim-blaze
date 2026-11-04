mod hid_manager;

use hid_manager::{BatteryStatus, DeviceInfo, HidManager};
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_notification::NotificationExt;

#[cfg(target_os = "windows")]
use winreg::enums::{HKEY_CURRENT_USER, KEY_READ, KEY_WRITE};
#[cfg(target_os = "windows")]
use winreg::RegKey;

#[cfg(target_os = "windows")]
extern "system" {
    fn SystemParametersInfoW(
        uiAction: u32,
        uiParam: u32,
        pvParam: *mut std::ffi::c_void,
        fWinIni: u32,
    ) -> i32;
    fn GetDoubleClickTime() -> u32;
    fn SetDoubleClickTime(uInterval: u32) -> i32;
}

const RUN_KEY_PATH: &str = "Software\\Microsoft\\Windows\\CurrentVersion\\Run";
const APP_REG_NAME: &str = "KLIM Blaze";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemPointerSettings {
    pub mouse_speed: u32, // 1..=20
    pub enhance_precision: bool,
    pub scroll_lines: u32,
    pub scroll_one_page: bool,
    pub double_click_speed: u32, // 1..=10
}

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
    brightness: u8,
) -> Result<(), String> {
    state.apply_rgb(mode, r, g, b, speed, brightness)
}

#[tauri::command]
async fn set_dpi_levels(
    state: State<'_, HidManager>,
    levels: Vec<u16>,
    colors: Option<Vec<(u8, u8, u8)>>,
    active_index: usize,
) -> Result<Vec<u16>, String> {
    let stage_colors = colors.unwrap_or_default();
    state.set_dpi_levels(&levels, &stage_colors, active_index)
}

#[tauri::command]
async fn set_active_dpi_stage(state: State<'_, HidManager>, stage: usize) -> Result<(), String> {
    state.set_dpi_stage(stage)
}

#[tauri::command]
async fn get_active_dpi_stage(state: State<'_, HidManager>) -> Result<Option<usize>, String> {
    state.get_active_dpi_stage()
}

#[tauri::command]
async fn get_button_bindings(state: State<'_, HidManager>) -> Result<Vec<[u8; 3]>, String> {
    state.get_button_bindings()
}

#[tauri::command]
async fn set_button_binding(
    state: State<'_, HidManager>,
    button_index: usize,
    action: [u8; 3],
) -> Result<(), String> {
    state.set_button_binding(button_index, action)
}

#[tauri::command]
async fn reset_button_bindings(state: State<'_, HidManager>) -> Result<(), String> {
    state.reset_button_bindings()
}

#[tauri::command]
async fn set_dpi_effect(
    state: State<'_, HidManager>,
    mode: u8,
    speed: u8,
) -> Result<(), String> {
    state.set_dpi_effect(mode, speed)
}

#[tauri::command]
async fn get_system_pointer_settings() -> Result<SystemPointerSettings, String> {
    #[cfg(target_os = "windows")]
    {
        let mut mouse_speed: u32 = 10;
        unsafe {
            SystemParametersInfoW(
                0x0070, // SPI_GETMOUSESPEED
                0,
                &mut mouse_speed as *mut u32 as *mut std::ffi::c_void,
                0,
            );
        }

        let mut mouse_params = [0i32; 3];
        unsafe {
            SystemParametersInfoW(
                0x0003, // SPI_GETMOUSE
                0,
                mouse_params.as_mut_ptr() as *mut std::ffi::c_void,
                0,
            );
        }
        let enhance_precision = mouse_params[2] != 0;

        let mut lines: u32 = 3;
        unsafe {
            SystemParametersInfoW(
                0x0068, // SPI_GETWHEELSCROLLLINES
                0,
                &mut lines as *mut u32 as *mut std::ffi::c_void,
                0,
            );
        }
        let (scroll_one_page, scroll_lines) = if lines == 0xFFFFFFFF {
            (true, 3)
        } else {
            (false, lines.clamp(1, 10))
        };

        let dc_time = unsafe { GetDoubleClickTime() };
        // Map 900ms (step 1 - Slow) down to 200ms (step 10 - Fast)
        let double_click_speed = (((900i32 - dc_time as i32 + 39) / 78) + 1).clamp(1, 10) as u32;

        Ok(SystemPointerSettings {
            mouse_speed: mouse_speed.clamp(1, 20),
            enhance_precision,
            scroll_lines,
            scroll_one_page,
            double_click_speed,
        })
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(SystemPointerSettings {
            mouse_speed: 10,
            enhance_precision: true,
            scroll_lines: 3,
            scroll_one_page: false,
            double_click_speed: 6,
        })
    }
}

#[tauri::command]
async fn set_system_pointer_settings(
    mouse_speed: u32,
    enhance_precision: bool,
    scroll_lines: u32,
    scroll_one_page: bool,
    double_click_speed: u32,
) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let speed_val = mouse_speed.clamp(1, 20);
        unsafe {
            SystemParametersInfoW(
                0x0071, // SPI_SETMOUSESPEED
                0,
                speed_val as usize as *mut std::ffi::c_void,
                0x0001 | 0x0002, // SPIF_UPDATEINIFILE | SPIF_SENDCHANGE
            );
        }

        let mut mouse_params = if enhance_precision {
            [6i32, 10, 1]
        } else {
            [0i32, 0, 0]
        };
        unsafe {
            SystemParametersInfoW(
                0x0004, // SPI_SETMOUSE
                0,
                mouse_params.as_mut_ptr() as *mut std::ffi::c_void,
                0x0001 | 0x0002,
            );
        }

        let lines_val = if scroll_one_page {
            0xFFFFFFFF
        } else {
            scroll_lines.clamp(1, 10)
        };

        unsafe {
            SystemParametersInfoW(
                0x0069, // SPI_SETWHEELSCROLLLINES
                lines_val,
                std::ptr::null_mut(),
                0x0001 | 0x0002,
            );
        }

        let speed_step = double_click_speed.clamp(1, 10);
        let dc_ms = (900i32 - (speed_step as i32 - 1) * 78).clamp(200, 900) as u32;
        unsafe {
            SetDoubleClickTime(dc_ms);
        }

        // Persist to registry
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        if let Ok((mouse_key, _)) = hkcu.create_subkey("Control Panel\\Mouse") {
            let _ = mouse_key.set_value("MouseSensitivity", &speed_val.to_string());
            let _ = mouse_key.set_value("MouseSpeed", &(if enhance_precision { "1" } else { "0" }));
            let _ = mouse_key.set_value("DoubleClickSpeed", &dc_ms.to_string());
        }
        if let Ok((desktop_key, _)) = hkcu.create_subkey("Control Panel\\Desktop") {
            let _ = desktop_key.set_value("WheelScrollLines", &lines_val.to_string());
        }

        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (mouse_speed, enhance_precision, scroll_lines, scroll_one_page, double_click_speed);
        Ok(())
    }
}

#[tauri::command]
async fn set_polling_rate(state: State<'_, HidManager>, hz: u16) -> Result<(), String> {
    state.set_polling_rate(hz)
}

#[tauri::command]
async fn get_battery_status(state: State<'_, HidManager>) -> Result<BatteryStatus, String> {
    state.battery_status()
}

#[tauri::command]
async fn notify_desktop(app: tauri::AppHandle, title: String, body: String) -> Result<(), String> {
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|e| e.to_string())
}

#[derive(Clone, Serialize)]
struct BatteryAlertPayload {
    level: u8,
    charging: bool,
}

#[tauri::command]
async fn show_subtle_battery_alert(
    app: AppHandle,
    level: u8,
    charging: bool,
) -> Result<(), String> {
    let payload = BatteryAlertPayload { level, charging };

    let win_w = 190.0;
    let win_h = 76.0;

    let (pos_x, pos_y) = if let Ok(Some(monitor)) = app.primary_monitor() {
        let size = monitor.size();
        let scale = monitor.scale_factor();
        let mon_w = size.width as f64 / scale;
        let mon_h = size.height as f64 / scale;
        (
            (mon_w - win_w - 28.0).max(0.0),
            (mon_h - win_h - 75.0).max(0.0),
        )
    } else {
        (100.0, 100.0)
    };

    if let Some(window) = app.get_webview_window("subtle-alert") {
        let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(win_w, win_h)));
        let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition::new(pos_x, pos_y)));
        let _ = window.show();
        let _ = window.emit("battery-alert-data", &payload);
        return Ok(());
    }

    let builder = WebviewWindowBuilder::new(
        &app,
        "subtle-alert",
        WebviewUrl::App("index.html#subtle-alert".into()),
    )
    .title("KLIM Blaze Alert")
    .inner_size(win_w, win_h)
    .position(pos_x, pos_y)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .skip_taskbar(true)
    .focused(false)
    .resizable(false)
    .shadow(false);

    let window = builder.build().map_err(|e| e.to_string())?;

    let window_clone = window.clone();
    tauri::async_runtime::spawn_blocking(move || {
        std::thread::sleep(std::time::Duration::from_millis(200));
        let _ = window_clone.emit("battery-alert-data", payload);
    });

    Ok(())
}

#[tauri::command]
async fn hide_subtle_battery_alert(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("subtle-alert") {
        let _ = window.hide();
    }
    Ok(())
}

struct AppSettings {
    close_to_tray: AtomicBool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            close_to_tray: AtomicBool::new(true),
        }
    }
}

#[tauri::command]
fn set_close_to_tray(state: State<'_, Arc<AppSettings>>, enabled: bool) {
    state.close_to_tray.store(enabled, Ordering::Relaxed);
}

#[tauri::command]
fn get_close_to_tray(state: State<'_, Arc<AppSettings>>) -> bool {
    state.close_to_tray.load(Ordering::Relaxed)
}

#[tauri::command]
fn get_autostart() -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        if let Ok(run_key) = hkcu.open_subkey_with_flags(RUN_KEY_PATH, KEY_READ) {
            let val: Result<String, _> = run_key.get_value(APP_REG_NAME);
            return Ok(val.is_ok());
        }
        Ok(false)
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(false)
    }
}

#[tauri::command]
fn set_autostart(enabled: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        if enabled {
            let (run_key, _) = hkcu
                .create_subkey(RUN_KEY_PATH)
                .map_err(|e| format!("Failed to open registry run key: {e}"))?;
            let current_exe = std::env::current_exe()
                .map_err(|e| format!("Failed to get current executable path: {e}"))?;
            let exe_path = current_exe
                .to_str()
                .ok_or_else(|| "Executable path contains non-UTF-8 characters".to_string())?;
            let cmd = format!("\"{}\" --tray", exe_path);
            run_key
                .set_value(APP_REG_NAME, &cmd)
                .map_err(|e| format!("Failed to write autostart registry entry: {e}"))?;
        } else {
            if let Ok(run_key) = hkcu.open_subkey_with_flags(RUN_KEY_PATH, KEY_WRITE) {
                let _ = run_key.delete_value(APP_REG_NAME);
            }
        }
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let settings = Arc::new(AppSettings::default());
    let settings_clone = Arc::clone(&settings);

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .manage(HidManager::new())
        .manage(settings)
        .on_window_event(move |window, event| {
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    if settings_clone.close_to_tray.load(Ordering::Relaxed) {
                        let _ = window.hide();
                        api.prevent_close();
                    }
                }
            }
        })
        .setup(|app| {
            let start_in_tray = std::env::args().any(|arg| arg == "--tray" || arg == "--minimized" || arg == "--autostart");
            if start_in_tray {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }

            let open_item = MenuItem::with_id(app, "open", "Open KLIM Blaze", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&open_item, &quit_item])?;

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&tray_menu)
                .tooltip("KLIM Blaze")
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                });

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            tray_builder.build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_devices,
            apply_rgb,
            set_dpi_levels,
            set_active_dpi_stage,
            get_active_dpi_stage,
            set_dpi_effect,
            get_button_bindings,
            set_button_binding,
            reset_button_bindings,
            get_system_pointer_settings,
            set_system_pointer_settings,
            set_polling_rate,
            get_battery_status,
            notify_desktop,
            show_subtle_battery_alert,
            hide_subtle_battery_alert,
            set_close_to_tray,
            get_close_to_tray,
            get_autostart,
            set_autostart
        ])
        .run(tauri::generate_context!())
        .expect("error while running the KLIM Blaze configurator");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_system_pointer_settings_roundtrip() {
        tauri::async_runtime::block_on(async {
            let original = get_system_pointer_settings().await.expect("read pointer settings");
            println!("Original pointer settings: {:?}", original);

            // Test update
            let test_settings = SystemPointerSettings {
                mouse_speed: 12,
                enhance_precision: true,
                scroll_lines: 5,
                scroll_one_page: false,
                double_click_speed: 7,
            };
            assert!(set_system_pointer_settings(
                test_settings.mouse_speed,
                test_settings.enhance_precision,
                test_settings.scroll_lines,
                test_settings.scroll_one_page,
                test_settings.double_click_speed,
            )
            .await
            .is_ok());

            let readback = get_system_pointer_settings().await.expect("read back");
            assert_eq!(readback.mouse_speed, 12);
            assert_eq!(readback.enhance_precision, true);
            assert_eq!(readback.scroll_lines, 5);
            assert_eq!(readback.scroll_one_page, false);
            assert_eq!(readback.double_click_speed, 7);

            // Restore original
            assert!(set_system_pointer_settings(
                original.mouse_speed,
                original.enhance_precision,
                original.scroll_lines,
                original.scroll_one_page,
                original.double_click_speed,
            )
            .await
            .is_ok());
        });
    }
}
