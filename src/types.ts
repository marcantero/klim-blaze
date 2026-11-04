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
  /** 1..10, effect animation speed. */
  speed: number;
  /** 1..10, LED brightness (10% to 100%). */
  brightness: number;
}

export interface DpiStage {
  dpi: number;
  /** Hex color used for the stage dot and the UI accent. */
  color: string;
  /** Whether this stage is enabled in the cycling rotation. Defaults to true. */
  enabled?: boolean;
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

export type NotificationStyle = "subtle" | "windows" | "both";

export interface BatteryNotificationConfig {
  enabled: boolean;
  /** Threshold percentage at or below which to alert (e.g. 10, 20, 30, 40). */
  threshold: number;
  /** Visual presentation style of the notification. */
  style: NotificationStyle;
}

export interface SystemPointerSettings {
  mouseSpeed: number; // 1..20
  enhancePrecision: boolean;
  scrollLines: number;
  scrollOnePage: boolean;
  doubleClickSpeed: number; // 1..10
}

export const DEFAULT_SYSTEM_POINTER_SETTINGS: SystemPointerSettings = {
  mouseSpeed: 10,
  enhancePrecision: true,
  scrollLines: 3,
  scrollOnePage: false,
  doubleClickSpeed: 6,
};

export const DEFAULT_BATTERY_NOTIFICATION_CONFIG: BatteryNotificationConfig = {
  enabled: true,
  threshold: 20,
  style: "subtle",
};

export const STORAGE_KEY_CLOSE_TO_TRAY = "klim-blaze.close-to-tray";

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
  brightness: 10,
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

export type ActionCategory = "mouse" | "dpi" | "multimedia" | "windows" | "special" | "keyboard";

export interface ButtonActionDef {
  id: string;
  name: string;
  category: ActionCategory;
  bytes: [number, number, number];
  description: string;
}

export const ACTION_CATEGORIES: { id: ActionCategory; label: string }[] = [
  { id: "mouse", label: "Mouse" },
  { id: "dpi", label: "DPI" },
  { id: "multimedia", label: "Multimedia" },
  { id: "windows", label: "Windows / Web" },
  { id: "special", label: "Special" },
  { id: "keyboard", label: "Key Combination" },
];

export const AVAILABLE_ACTIONS: ButtonActionDef[] = [
  // Mouse
  { id: "btn_left", name: "Left button", category: "mouse", bytes: [0x01, 0x01, 0x00], description: "Standard primary mouse click" },
  { id: "btn_right", name: "Right button", category: "mouse", bytes: [0x01, 0x02, 0x00], description: "Standard secondary context click" },
  { id: "btn_middle", name: "Middle button", category: "mouse", bytes: [0x01, 0x04, 0x00], description: "Scroll wheel center click" },
  { id: "btn_forward", name: "Forward", category: "mouse", bytes: [0x01, 0x08, 0x00], description: "Browser / system forward" },
  { id: "btn_back", name: "Back", category: "mouse", bytes: [0x01, 0x10, 0x00], description: "Browser / system back" },

  // DPI
  { id: "dpi_loop", name: "DPI Loop", category: "dpi", bytes: [0x09, 0x00, 0x00], description: "Cycle through all active DPI stages" },
  { id: "dpi_plus", name: "DPI +", category: "dpi", bytes: [0x02, 0x00, 0x00], description: "Increase sensitivity to next stage" },
  { id: "dpi_minus", name: "DPI -", category: "dpi", bytes: [0x02, 0x01, 0x00], description: "Decrease sensitivity to previous stage" },
  { id: "dpi_lock", name: "DPI Lock", category: "dpi", bytes: [0x02, 0x02, 0x00], description: "Sniper mode: lock DPI to 400 while held" },

  // Special
  { id: "three_click", name: "Three click", category: "special", bytes: [0x07, 0x00, 0x00], description: "Simulate 3 rapid left clicks" },
  { id: "fire_key", name: "Fire key", category: "special", bytes: [0x08, 0x00, 0x00], description: "Continuous rapid fire while held" },
  { id: "rgb_toggle", name: "RGB ON/OFF", category: "special", bytes: [0x09, 0x01, 0x00], description: "Toggle LED lighting on or off" },
  { id: "poll_switch", name: "Polling rate switch", category: "special", bytes: [0x09, 0x02, 0x00], description: "Cycle USB polling rate (125/250/500/1000Hz)" },
  { id: "disable", name: "Disable", category: "special", bytes: [0x05, 0x00, 0x00], description: "Deactivate button switch" },

  // Multimedia
  { id: "media_play_pause", name: "Play/Pause", category: "multimedia", bytes: [0x06, 0xCD, 0x00], description: "Play or pause current audio/video" },
  { id: "media_stop", name: "Stop play", category: "multimedia", bytes: [0x06, 0xB7, 0x00], description: "Stop playback" },
  { id: "media_prev", name: "Previous", category: "multimedia", bytes: [0x06, 0xB6, 0x00], description: "Previous media track" },
  { id: "media_next", name: "Next", category: "multimedia", bytes: [0x06, 0xB5, 0x00], description: "Next media track" },
  { id: "vol_up", name: "Volume up", category: "multimedia", bytes: [0x06, 0xE9, 0x00], description: "Increase system master volume" },
  { id: "vol_down", name: "Volume down", category: "multimedia", bytes: [0x06, 0xEA, 0x00], description: "Decrease system master volume" },
  { id: "vol_mute", name: "Mute", category: "multimedia", bytes: [0x06, 0xE2, 0x00], description: "Mute or unmute system audio" },
  { id: "media_player", name: "Media Player", category: "multimedia", bytes: [0x06, 0x83, 0x01], description: "Launch default media player" },

  // Windows & Web
  { id: "win_calc", name: "Calculator", category: "windows", bytes: [0x06, 0x92, 0x01], description: "Open Windows Calculator" },
  { id: "win_explorer", name: "Explorer / My PC", category: "windows", bytes: [0x06, 0x94, 0x01], description: "Open File Explorer (This PC)" },
  { id: "web_home", name: "Web Home", category: "windows", bytes: [0x06, 0x23, 0x02], description: "Navigate to browser homepage" },
  { id: "web_search", name: "Web Search", category: "windows", bytes: [0x06, 0x21, 0x02], description: "Open Windows or browser search" },
  { id: "web_back", name: "Web Back", category: "windows", bytes: [0x06, 0x24, 0x02], description: "Browser back history" },
  { id: "web_forward", name: "Web Forward", category: "windows", bytes: [0x06, 0x25, 0x02], description: "Browser forward history" },
  { id: "web_refresh", name: "Web Refresh", category: "windows", bytes: [0x06, 0x27, 0x02], description: "Reload active webpage" },
  { id: "win_mail", name: "Email", category: "windows", bytes: [0x06, 0x8A, 0x01], description: "Open default mail client" },
];

export interface PhysicalButtonDef {
  index: number; // 0..6
  number: number; // 1..7
  name: string;
  defaultActionName: string;
  defaultBytes: [number, number, number];
}

export const PHYSICAL_BUTTONS: PhysicalButtonDef[] = [
  { index: 0, number: 1, name: "Left button", defaultActionName: "Left button", defaultBytes: [0x01, 0x01, 0x00] },
  { index: 1, number: 2, name: "Right button", defaultActionName: "Right button", defaultBytes: [0x01, 0x02, 0x00] },
  { index: 2, number: 3, name: "Middle button", defaultActionName: "Middle button", defaultBytes: [0x01, 0x04, 0x00] },
  { index: 3, number: 4, name: "Forward", defaultActionName: "Forward", defaultBytes: [0x01, 0x08, 0x00] },
  { index: 4, number: 5, name: "Back", defaultActionName: "Back", defaultBytes: [0x01, 0x10, 0x00] },
  { index: 5, number: 6, name: "DPI Loop", defaultActionName: "DPI Loop", defaultBytes: [0x09, 0x00, 0x00] },
  { index: 6, number: 7, name: "DPI -", defaultActionName: "DPI -", defaultBytes: [0x02, 0x01, 0x00] },
];

export const HID_KEY_MAP: Record<number, string> = {
  0x04: "A", 0x05: "B", 0x06: "C", 0x07: "D", 0x08: "E", 0x09: "F", 0x0a: "G", 0x0b: "H",
  0x0c: "I", 0x0d: "J", 0x0e: "K", 0x0f: "L", 0x10: "M", 0x11: "N", 0x12: "O", 0x13: "P",
  0x14: "Q", 0x15: "R", 0x16: "S", 0x17: "T", 0x18: "U", 0x19: "V", 0x1a: "W", 0x1b: "X",
  0x1c: "Y", 0x1d: "Z",
  0x1e: "1", 0x1f: "2", 0x20: "3", 0x21: "4", 0x22: "5", 0x23: "6", 0x24: "7", 0x25: "8", 0x26: "9", 0x27: "0",
  0x28: "Enter", 0x29: "Escape", 0x2a: "Backspace", 0x2b: "Tab", 0x2c: "Space",
  0x3a: "F1", 0x3b: "F2", 0x3c: "F3", 0x3d: "F4", 0x3e: "F5", 0x3f: "F6",
  0x40: "F7", 0x41: "F8", 0x42: "F9", 0x43: "F10", 0x44: "F11", 0x45: "F12",
  0x49: "Insert", 0x4a: "Home", 0x4b: "Page Up", 0x4c: "Delete", 0x4d: "End", 0x4e: "Page Down",
  0x4f: "Right", 0x50: "Left", 0x51: "Down", 0x52: "Up",
};

export function findActionName(bytes: [number, number, number]): string {
  if (bytes[0] === 0x04) {
    const mods: string[] = [];
    if (bytes[2] & 0x01) mods.push("Ctrl");
    if (bytes[2] & 0x02) mods.push("Shift");
    if (bytes[2] & 0x04) mods.push("Alt");
    if (bytes[2] & 0x08) mods.push("Win");
    const key = HID_KEY_MAP[bytes[1]] ?? `Key#${bytes[1]}`;
    return mods.length > 0 ? `${mods.join("+")}+${key}` : key;
  }
  const match = AVAILABLE_ACTIONS.find(
    (a) => a.bytes[0] === bytes[0] && a.bytes[1] === bytes[1] && a.bytes[2] === bytes[2]
  );
  return match?.name ?? "Custom";
}
