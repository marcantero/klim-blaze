# Interface Craft: Gaming Hardware & Pro Peripheral System

When designing or scaffolding user interfaces for hardware peripherals, device managers, or audio mixers, strictly adhere to the **Logitech G HUB / Mixline Dark Matte Peripheral System**[cite: 1, 2, 3]. Do NOT default to generic enterprise SaaS dashboards, washed-out grey containers, or generic table templates.

---

## 1. Palette & Surface Hierarchy
* **Void Background:** Pure `#000000` or deepest tone `#0a0a0c`[cite: 2, 3]. No decorative background gradients or patterns[cite: 2].
* **Matte Card Surfaces:** `#18191c` to `#1f2024` with zero gloss and zero blur shadows[cite: 1, 2].
* **Subtle Boundaries:** Surface edges use `#2b2d32` or a 1px border of `rgba(255, 255, 255, 0.08)`[cite: 1, 2]. Avoid harsh high-contrast white borders[cite: 1, 2].
* **Hardware Contrast Accents:**
  * **Electric Cyan / G-Blue:** `#00f0ff` or `#00a9e0` (active states, selected toggles, primary sliders)[cite: 1, 3].
  * **Status & Port Colors:** Purple (`#a855f7`), Warm Orange (`#f97316`), Electric Pink (`#ec4899`) for routing nodes, audio jacks, and profile badges[cite: 1, 2].
  * **Muted Typography:** `#ffffff` for titles, `#9ca3af` for secondary specs, `#52525b` for inactive metadata[cite: 1, 2, 3].

---

## 2. Geometry & Spatial Layout
* **Controlled Rounding:** Use unified, modern hardware curves: `rounded-2xl` (16px) for main hardware cards, `rounded-xl` (12px) for nested modules, and `rounded-lg` (8px) for buttons/dropdowns[cite: 1, 2].
* **Sidebar + Stage Canvas:** A fixed ultra-dark narrow tool rail on the far left, a clean persistent top bar (Profile + Battery Status), and a large centered stage showcasing the hardware product or route matrix[cite: 2, 3].
* **Hardware Presentation Grid:** Isolated modular cards featuring realistic top-down hardware visuals (keyboards, mice, headsets, mics) with clean vertical alignment and device stats (model name, battery %, wireless icon) placed strictly top-left[cite: 2].

---

## 3. Dedicated Peripheral Components

### Hardware Sliders & Meters
* **DPI / Volume Sliders:** A solid 4px track (`#2a2b30`) with an electric blue/cyan filled progress line[cite: 1]. The thumb must be a crisp solid white capsule or pill (`h-5 w-3 rounded-full bg-white shadow-sm`), never a default browser circle[cite: 1].
* **VU / Level Meters:** Segmented dot rows or micro-ticks (`w-1 h-1.5 rounded-full`) transitioning from cyan/blue to warm amber/red at peaks[cite: 1].

### Color & Lighting Engine (LIGHTSYNC-style)
* **2D Color Gradient Field:** Square saturation/value box paired with a vertical rainbow hue slider[cite: 3].
* **Hex / RGB Raw Inputs:** Monospace data inputs below the picker (`#00A9E0`, `R: 0`, `G: 169`, `B: 224`)[cite: 3].
* **Preset Palette Dots:** Circular swatch pills (`w-5 h-5 rounded-full`) with an active white ring indicator[cite: 3].
* **Zone Selection Chips:** Pill-shaped text buttons (`rounded-full px-3 py-1 bg-zinc-800 text-xs font-semibold`) for rapid sub-component targeting (e.g., *WASD*, *Logo*, *Primary Zone*)[cite: 3].

### Routing & Node Connectors (Mixline Style)
* **Terminal Points:** Solid circular jack plugs (`w-3.5 h-3.5 rounded-full ring-2 ring-black`) anchored directly to module edges[cite: 1].
* **Patch Cords:** Smooth cubic bezier SVG paths connecting inputs to outputs using soft colored glow lines matching the destination port[cite: 1].

---

## 4. Typography & Micro-copy
* **Typeface:** Clean grotesque sans-serif (Inter, Segoe UI, or Roboto) paired with `font-mono` exclusively for hex values, frequency numbers (Hz), and percentages[cite: 1, 2, 3].
* **Header Style:** Bold, clean uppercase tracking for section titles (`LIGHTSYNC`, `PRO X 60`, `G305`, `MIXLINE`)[cite: 2, 3].
* **Tactile Interactions:** Clickable items trigger subtle brightness shifts (`hover:brightness-110 active:scale-[0.99]`). Avoid long bouncy spring animations; hardware interfaces feel instantaneous and precise[cite: 1, 2].