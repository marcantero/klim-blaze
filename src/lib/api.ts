import { invoke } from "@tauri-apps/api/core";
import { hexToRgb, type BatteryStatus, type DeviceInfo, type DpiStage, type LightingState } from "../types";

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
    brightness: lighting.brightness,
  });
}

/** Returns the DPI values the sensor actually accepted (snapped to its grid). */
export async function setDpiLevels(stages: DpiStage[], activeIndex: number): Promise<number[]> {
  if (!isTauri()) return stages.map((stage) => stage.dpi);
  const colors = stages.map((stage) => {
    const rgb = hexToRgb(stage.color) ?? { r: 0, g: 240, b: 255 };
    return [rgb.r, rgb.g, rgb.b];
  });
  return call<number[]>("set_dpi_levels", {
    levels: stages.map((stage) => stage.dpi),
    colors,
    activeIndex,
  });
}

export async function setActiveDpiStage(stage: number): Promise<void> {
  if (!isTauri()) return;
  await call<void>("set_active_dpi_stage", { stage });
}

export async function getActiveDpiStage(): Promise<number | null> {
  if (!isTauri()) return null;
  return call<number | null>("get_active_dpi_stage");
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

export async function getButtonBindings(): Promise<[number, number, number][]> {
  if (!isTauri()) {
    return [
      [0x01, 0x01, 0x00],
      [0x01, 0x02, 0x00],
      [0x01, 0x04, 0x00],
      [0x01, 0x08, 0x00],
      [0x01, 0x10, 0x00],
      [0x09, 0x00, 0x00],
      [0x02, 0x01, 0x00],
    ];
  }
  return call<[number, number, number][]>("get_button_bindings");
}

export async function setButtonBinding(
  buttonIndex: number,
  action: [number, number, number]
): Promise<void> {
  if (!isTauri()) return;
  await call<void>("set_button_binding", { buttonIndex, action });
}

export async function resetButtonBindings(): Promise<void> {
  if (!isTauri()) return;
  await call<void>("reset_button_bindings");
}

export async function setDpiEffect(mode: number, speed: number): Promise<void> {
  if (!isTauri()) return;
  await call<void>("set_dpi_effect", { mode, speed });
}

export async function getSystemPointerSettings(): Promise<{
  mouseSpeed: number;
  enhancePrecision: boolean;
  scrollLines: number;
  scrollOnePage: boolean;
  doubleClickSpeed: number;
}> {
  if (!isTauri()) {
    return {
      mouseSpeed: 10,
      enhancePrecision: true,
      scrollLines: 3,
      scrollOnePage: false,
      doubleClickSpeed: 6,
    };
  }
  return call<{
    mouseSpeed: number;
    enhancePrecision: boolean;
    scrollLines: number;
    scrollOnePage: boolean;
    doubleClickSpeed: number;
  }>("get_system_pointer_settings");
}

export async function setSystemPointerSettings(settings: {
  mouseSpeed: number;
  enhancePrecision: boolean;
  scrollLines: number;
  scrollOnePage: boolean;
  doubleClickSpeed: number;
}): Promise<void> {
  if (!isTauri()) return;
  await call<void>("set_system_pointer_settings", {
    mouseSpeed: settings.mouseSpeed,
    enhancePrecision: settings.enhancePrecision,
    scrollLines: settings.scrollLines,
    scrollOnePage: settings.scrollOnePage,
    doubleClickSpeed: settings.doubleClickSpeed,
  });
}
