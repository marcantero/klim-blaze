import { invoke } from "@tauri-apps/api/core";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { isTauri } from "./api";
import {
  DEFAULT_BATTERY_NOTIFICATION_CONFIG,
  type BatteryNotificationConfig,
  type BatteryStatus,
  type NotificationStyle,
} from "../types";

const STORAGE_KEY = "klim-blaze.battery-notifications";

// In-memory tracker to prevent notifying repeatedly during the same discharge level
let lastAlertedThresholdLevel: number | null = null;

export function loadBatteryNotificationConfig(): BatteryNotificationConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BATTERY_NOTIFICATION_CONFIG;
    const parsed = JSON.parse(raw);
    const style: NotificationStyle =
      parsed.style === "subtle" || parsed.style === "windows" || parsed.style === "both"
        ? parsed.style
        : DEFAULT_BATTERY_NOTIFICATION_CONFIG.style;
    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULT_BATTERY_NOTIFICATION_CONFIG.enabled,
      threshold:
        typeof parsed.threshold === "number" && parsed.threshold >= 10 && parsed.threshold <= 50
          ? parsed.threshold
          : DEFAULT_BATTERY_NOTIFICATION_CONFIG.threshold,
      style,
    };
  } catch {
    return DEFAULT_BATTERY_NOTIFICATION_CONFIG;
  }
}

export function saveBatteryNotificationConfig(config: BatteryNotificationConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage quota errors
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    let granted = await isPermissionGranted();
    if (!granted) {
      const permission = await requestPermission();
      granted = permission === "granted";
    }
    return granted;
  } catch {
    return false;
  }
}

export async function triggerSubtleAlert(level = 20, charging = false): Promise<boolean> {
  if (!isTauri()) {
    console.warn("Subtle overlay alerts are only supported inside the Tauri desktop app.");
    return false;
  }
  try {
    await invoke("show_subtle_battery_alert", { level, charging });
    return true;
  } catch (err) {
    console.error("Failed to show subtle battery alert:", err);
    return false;
  }
}

export async function triggerWindowsToast(title: string, body: string): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    await invoke("notify_desktop", { title, body });
    return true;
  } catch {
    const granted = await ensureNotificationPermission();
    if (granted) {
      sendNotification({ title, body });
      return true;
    }
  }
  return false;
}

export async function triggerTestNotification(config?: BatteryNotificationConfig): Promise<boolean> {
  const currentConfig = config ?? loadBatteryNotificationConfig();
  if (currentConfig.style === "windows") {
    return triggerWindowsToast(
      "KLIM Blaze Wireless",
      "Test alert: Battery notifications are working properly!"
    );
  }
  if (currentConfig.style === "both") {
    const [subtle, win] = await Promise.all([
      triggerSubtleAlert(currentConfig.threshold, false),
      triggerWindowsToast("KLIM Blaze Wireless", "Test alert: Low battery notification"),
    ]);
    return subtle || win;
  }
  // Default is "subtle"
  return triggerSubtleAlert(currentConfig.threshold, false);
}

export async function checkAndNotifyBattery(
  battery: BatteryStatus | null,
  config: BatteryNotificationConfig
): Promise<void> {
  if (!battery || !battery.supported || battery.level === null) {
    return;
  }

  // If charging or disconnected, reset alert tracking for the next discharge cycle
  if (battery.charging) {
    lastAlertedThresholdLevel = null;
    return;
  }

  // If notifications are disabled, don't notify
  if (!config.enabled) {
    return;
  }

  // If battery is at or below threshold and hasn't notified yet for this level
  if (battery.level <= config.threshold) {
    if (lastAlertedThresholdLevel === null || battery.level < lastAlertedThresholdLevel) {
      lastAlertedThresholdLevel = battery.level;
      if (config.style === "subtle" || config.style === "both") {
        void triggerSubtleAlert(battery.level, battery.charging);
      }
      if (config.style === "windows" || config.style === "both") {
        void triggerWindowsToast(
          "KLIM Blaze Wireless — Low Battery",
          `Mouse battery is at ${battery.level}%. Connect the USB cable to recharge.`
        );
      }
    }
  } else {
    // Battery is above threshold (e.g. charged back up), reset tracker
    lastAlertedThresholdLevel = null;
  }
}

