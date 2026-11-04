# KLIM Blaze Configurator

A small Tauri v2 desktop app for the **KLIM Blaze Wireless Gaming Mouse** (VID `0x260D`). It talks to the mouse over USB HID, so it does not need the OEM application, a background service, or an account.

![stack](https://img.shields.io/badge/Tauri-2-24C8DB) ![stack](https://img.shields.io/badge/Rust-stable-B7410E) ![stack](https://img.shields.io/badge/React-18-61DAFB)

## Features

- **Lighting** — static, breathing, RGB wave and off, with color picker (hex + RGB), animation speed and a live SVG preview that reacts to the selected effect.
- **Sensitivity** — up to 8 DPI stages, per-stage color markers, a stepped 200–10 000 DPI slider, and polling rate selection (125 / 250 / 500 / 1000 Hz).
- **Live apply** — changes are debounced (30 ms) and written straight to the mouse's EEPROM.
- **Profiles** — save/load/delete named profiles, import and export JSON.
- **Device status** — wired vs. 2.4 GHz receiver, hot-plug rescan, best-effort battery readout.
- **Browser preview** — `npm run dev` renders the whole UI without hardware; hardware commands become no-ops.

> Not affiliated with KLIM. Use at your own risk; the writes below were derived by reverse engineering the bundled OEM binaries.

## Requirements

| Tool | Notes |
| --- | --- |
| Windows 10/11 | The protocol layer uses `hidapi` and works on other OSes, but only Windows was tested. |
| Node.js 18+ | Vite 6. Node 20 LTS recommended. |
| Rust (stable, MSVC) | Install with [rustup](https://rustup.rs). |
| Visual Studio Build Tools | "Desktop development with C++" workload (MSVC linker + Windows SDK). |
| WebView2 runtime | Preinstalled on Windows 11; install the Evergreen runtime on older systems. |

## Quick start

```powershell
npm install
npm run tauri:dev
```

`tauri:dev` starts Vite on port 1420 and launches the desktop window. To work on the UI without the mouse attached:

```powershell
npm run dev      # http://localhost:1420, hardware calls are skipped
```

## Production build

```powershell
npm run tauri:build
```

This type-checks the frontend, builds it, compiles the Rust backend in release mode and bundles installers:

- `src-tauri/target/release/klim-blaze.exe` — portable executable
- `src-tauri/target/release/bundle/msi/*.msi`
- `src-tauri/target/release/bundle/nsis/*-setup.exe`

For a quick compile check without installers:

```powershell
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

### Release checklist

1. Bump the version in `package.json`, `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json` (all three must match).
2. Test every write against real hardware (lighting, each effect, DPI low/high range, every polling rate).
3. Optionally sign the installers with your code-signing certificate.
4. Attach the `.msi` / `-setup.exe` files to the release.

## Project layout

```text
src/
  App.tsx                 application state, auto-apply effects, profiles
  components/             Sidebar, TopBar, MousePreview, ColorPicker, Toast
  hooks/useDebouncedEffect.ts
  lib/api.ts              Tauri invoke wrappers + browser fallback
  lib/profiles.ts         JSON profile validation/persistence
  views/                  Lighting, Dpi, KeyBindings, Settings
  types.ts                shared types, defaults, color helpers
src-tauri/
  src/hid_manager.rs      HID transport, checksums, EEPROM commands, battery probe
  src/lib.rs              Tauri commands (async, off the UI thread)
  src/main.rs
  examples/hid_probe.rs   read-only HID diagnostic
  tauri.conf.json
```

## Protocol notes

Everything here was recovered by statically analysing `OemDrv.exe` / `Lowerdev.dll` and confirmed against a real 2.4 GHz receiver.

### Device and collection selection

| | Wired | Wireless receiver |
| --- | --- | --- |
| VID | `0x260D` | `0x260D` |
| PID | `0x1016` | `0x1026` |
| Preferred | when alone | when both are present |

The receiver exposes **eight top-level collections** on interface 1. Only the vendor control collection with **usage page `0xFF02`** accepts the 17-byte feature report; the HID keyboard/mouse/consumer collections reject `HidD_SetFeature` with `ERROR_INVALID_FUNCTION`. The backend ranks candidates by wireless PID first, then usage page (`0xFF02` > other vendor pages > generic mouse), and shows one row per product in the UI. `hidapi`'s cached list is refreshed on every scan, so plugging the receiver in is picked up without restarting.

### Report frame

```text
byte 0       0x08                  report id
byte 1       0x07                  command (EEPROM write)
byte 2       0x00
byte 3       address high
byte 4       address low
byte 5       payload length
byte 6..15   payload (≤ 10 bytes, zero padded)
byte 16      0x55 - sum(bytes 1..15)
```

The checksum makes the sum of the whole 16-byte payload (report id excluded) equal `0x55`. Writes are sent with `send_feature_report`, 17 bytes total, with a ~9 ms pause between chunks (the OEM sleeps ~10 ms).

Reads are different: the OEM sends the request as a feature report and then drains **input reports** with `GetInputReport` until the reply arrives. On retail firmware `get_feature_report` therefore returns an all-zero report. This app does not need the read path.

### EEPROM blocks

| Block | Address | Layout |
| --- | --- | --- |
| Polling rate | `0x00` | `[code, 0x55 - code]` |
| DPI stages | `0x0C` | 4 bytes per stage: `[x_code, y_code, flag, checksum]` |
| Main RGB | `0xA0` | `[effect, R, G, B, brightness, speed, checksum]` |

- RGB checksum is computed over the first 6 bytes only.
- DPI checksum is `0x55 - (x_code + y_code + flag)`, so each 4-byte stage sums to `0x55`.
- DPI writes use 8-byte chunks (two stages per report).

### Effects and animation

| UI mode | Effect byte |
| --- | --- |
| Static | `0x02` |
| Breathing | `0x01` |
| RGB Wave | `0x00` |
| Off | `0x04` |

Brightness table (index 1..10): `FF E6 D2 BE AA 96 82 6E 46 28` — this build always writes index 10 (`0xFF`).

Speed table (index 1..10): `19 32 4B 64 7D 96 AF C8 E1 FF`.

### DPI encoding

Sensor `0x4090`. For 200–5000 DPI the firmware uses a 49-entry lookup table in 100 DPI steps:

```text
200→04 300→06 400→08 500→0B 600→0D 700→0F 800→12 900→14 1000→16
1100→19 1200→1B 1300→1D 1400→20 1500→22 1600→24 1700→27 1800→29
1900→2B 2000→2E 2100→30 2200→32 2300→34 2400→37 2500→39 2600→3B
2700→3E 2800→40 2900→42 3000→45 3100→47 3200→49 3300→4C 3400→4E
3500→50 3600→53 3700→55 3800→57 3900→5A 4000→5C 4100→5E 4200→61
4300→63 4400→65 4500→68 4600→6A 4700→6C 4800→6F 4900→71 5000→73
```

Above 5000 DPI the firmware looks up `dpi / 2` in the same table and sets the high-range flag byte to `0x01` (valid range 5200–10 000 DPI in 200 DPI steps). Values are snapped to the supported grid before writing, and the applied values are returned to the UI.

### Polling rate

`125 → 0x08`, `250 → 0x04`, `500 → 0x02`, `1000 → 0x01`.

### Battery

The decoded EEPROM protocol has no battery command. The OEM UI polls the wireless receiver's interrupt pipe. `get_battery_status` performs a short, best-effort probe of input reports and returns `supported: false` when nothing plausible arrives, which is what happens on the tested firmware. The UI shows a dash instead of inventing a percentage.

## Diagnostic

`src-tauri/examples/hid_probe.rs` lists every KLIM collection and tries a single EEPROM read on each. It writes nothing:

```powershell
cargo run --manifest-path src-tauri/Cargo.toml --example hid_probe
```

On a retail receiver, expect `SetFeature` to fail with `ERROR_INVALID_FUNCTION` on every collection except usage page `0xFF02`; that collection accepts the report and the feature reply is all zeros because the payload comes back over the input pipe.

## Troubleshooting

- **“HID write failed” / access denied** — close the OEM KLIM software and any tool that may hold the HID handle, then press rescan.
- **“Device disconnected”** — the wireless receiver is present but the mouse is asleep or off. Move the mouse and retry.
- **DPI jumps to a nearby value** — that is the sensor grid: 100 DPI steps up to 5000, 200 DPI steps above.
- **Battery shows “—”** — expected on firmware that does not report battery over the decoded protocol.
- **Settings look empty in the browser** — hardware commands are disabled in `npm run dev`; use `npm run tauri:dev`.
- **Changes do not stick** — the mouse stores them in EEPROM, but the OEM application may overwrite them when it exits. Close the OEM software.

## Limitations

- Key bindings are **read-only**. Remapping lives in an EEPROM region that has not been decoded.
- Brightness is fixed at maximum; `apply_rgb` has no brightness parameter.
- Battery is a best-effort probe, not a guaranteed feature.
- Profiles are app-side JSON (webview local storage); they are not written to the mouse's onboard profile slots.
