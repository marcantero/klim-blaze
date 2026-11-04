export type TabId = "lighting" | "dpi" | "keys" | "settings";

/** Hardware effect ids, kept in sync with `apply_rgb` in the Rust backend. */
export type LightMode = 0 | 1 | 2 | 3;

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface LightingState {
  mode: LightMode;
  color: Rgb;
  /** 1..10, matches the OEM speed table. */
  speed: number;
}

export interface DpiStage {
  dpi: number;
  /** Hex color used for the stage dot and the UI accent. */
  color: string;
}

export type PollingRate = 125 | 250 | 500 | 1000;

export interface DpiState {
  stages: DpiStage[];
  activeIndex: number;
  pollingRate: PollingRate;
}

export interface DeviceInfo {
  path: string;
  vendorId: number;
  productId: number;
  manufacturer: string | null;
  product: string | null;
  serialNumber: string | null;
  interfaceNumber: number;
  usagePage: number;
  usage: number;
  wireless: boolean;
}

export interface BatteryStatus {
  supported: boolean;
  level: number | null;
  charging: boolean;
  note: string;
}

export interface Profile {
  id: string;
  name: string;
  lighting: LightingState;
  dpi: DpiState;
  createdAt: number;
  updatedAt: number;
}

export type ConnectionState = "connected" | "wireless" | "disconnected" | "preview";

export interface ToastMessage {
  id: number;
  kind: "info" | "success" | "error";
  title: string;
  detail?: string;
}

export const LIGHT_MODE_LABELS: Record<LightMode, string> = {
  0: "Static",
  1: "Breathing",
  2: "Spectrum Cycle",
  3: "Off",
};

export const DEFAULT_LIGHTING: LightingState = {
  mode: 0,
  color: { r: 56, g: 189, b: 248 },
  speed: 6,
};

export const DEFAULT_DPI: DpiState = {
  stages: [
    { dpi: 600, color: "#ef4444" },
    { dpi: 1200, color: "#3b82f6" },
    { dpi: 2400, color: "#22c55e" },
    { dpi: 3600, color: "#eab308" },
    { dpi: 4800, color: "#f97316" },
    { dpi: 6000, color: "#d946ef" },
  ],
  activeIndex: 1,
  pollingRate: 1000,
};

export function rgbToHex({ r, g, b }: Rgb): string {
  const to = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function hexToRgb(hex: string): Rgb | null {
  let value = hex.trim().replace(/^#/, "");
  if (value.length === 3) {
    value = value
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

export function accentStyle(color: Rgb | string): React.CSSProperties {
  const rgb = typeof color === "string" ? hexToRgb(color) : color;
  if (!rgb) return {};
  return { "--accent": `${rgb.r} ${rgb.g} ${rgb.b}` } as React.CSSProperties;
}
