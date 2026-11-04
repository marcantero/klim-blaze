import { invoke } from "@tauri-apps/api/core";
import type { BatteryStatus, DeviceInfo, DpiStage, LightingState } from "../types";

/**
 * True when the app is running inside the Tauri webview. All hardware
 * commands are skipped in a plain browser (`npm run dev`) so the UI can still
 * be designed and reviewed without a mouse attached.
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    throw new Error(toMessage(error));
  }
}

export async function listDevices(): Promise<DeviceInfo[]> {
  if (!isTauri()) return [];
  return call<DeviceInfo[]>("list_devices");
}

export async function applyRgb(lighting: LightingState): Promise<void> {
  if (!isTauri()) return;
  await call<void>("apply_rgb", {
    mode: lighting.mode,
    r: lighting.color.r,
    g: lighting.color.g,
    b: lighting.color.b,
    speed: lighting.speed,
  });
}

/** Returns the DPI values the sensor actually accepted (snapped to its grid). */
export async function setDpiLevels(stages: DpiStage[], activeIndex: number): Promise<number[]> {
  if (!isTauri()) return stages.map((stage) => stage.dpi);
  return call<number[]>("set_dpi_levels", {
    levels: stages.map((stage) => stage.dpi),
    activeIndex,
  });
}

export async function setPollingRate(hz: number): Promise<void> {
  if (!isTauri()) return;
  await call<void>("set_polling_rate", { hz });
}

export async function getBatteryStatus(): Promise<BatteryStatus> {
  if (!isTauri()) {
    return {
      supported: false,
      level: null,
      charging: false,
      note: "Battery telemetry is only available in the desktop app.",
    };
  }
  return call<BatteryStatus>("get_battery_status");
}
