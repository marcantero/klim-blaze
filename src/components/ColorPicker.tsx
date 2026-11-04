import { useEffect, useRef, useState, useCallback } from "react";
import { hexToRgb, rgbToHex, type Rgb } from "../types";

const PRESETS = [
  "#00f0ff", // Logitech G Cyan
  "#2563eb", // Deep Blue
  "#a855f7", // Violet / Routing Purple
  "#ec4899", // Neon Pink
  "#ef4444", // Red
  "#f97316", // Warm Orange
  "#eab308", // Yellow
  "#10b981", // Phosphor Green
  "#ffffff", // Clean White
];

interface ColorPickerProps {
  value: Rgb;
  onChange: (color: Rgb) => void;
  disabled?: boolean;
}

function rgbToHsv(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
}

function hsvToRgb(h: number, s: number, v: number): Rgb {
  s /= 100;
  v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h >= 0 && h < 60) {
    r = c;
    g = x;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
  } else if (h >= 120 && h < 180) {
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export default function ColorPicker({ value, onChange, disabled = false }: ColorPickerProps) {
  const currentHex = rgbToHex(value);
  const [hsv, setHsv] = useState(() => rgbToHsv(value.r, value.g, value.b));
  const [hexDraft, setHexDraft] = useState(currentHex);

  const satBoxRef = useRef<HTMLDivElement>(null);
  const isDraggingSat = useRef(false);

  useEffect(() => {
    setHexDraft(currentHex);
    setHsv(rgbToHsv(value.r, value.g, value.b));
  }, [value.r, value.g, value.b, currentHex]);

  const updateFromSatBox = useCallback(
    (clientX: number, clientY: number) => {
      const rect = satBoxRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
      const s = Math.round((x / rect.width) * 100);
      const v = Math.round((1 - y / rect.height) * 100);
      const nextHsv = { ...hsv, s, v };
      setHsv(nextHsv);
      onChange(hsvToRgb(nextHsv.h, s, v));
    },
    [hsv, onChange]
  );

  const handlePointerDown = (event: React.PointerEvent) => {
    isDraggingSat.current = true;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    updateFromSatBox(event.clientX, event.clientY);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!isDraggingSat.current) return;
    updateFromSatBox(event.clientX, event.clientY);
  };

  const handlePointerUp = () => {
    isDraggingSat.current = false;
  };

  const handleHueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const h = Number(event.target.value);
    const nextHsv = { ...hsv, h };
    setHsv(nextHsv);
    onChange(hsvToRgb(h, nextHsv.s, nextHsv.v));
  };

  const commitHex = (val: string) => {
    setHexDraft(val);
    const parsed = hexToRgb(val);
    if (parsed) onChange(parsed);
  };

  const commitChannel = (channel: keyof Rgb, raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    const next = Number.isFinite(parsed) ? Math.min(255, Math.max(0, parsed)) : 0;
    onChange({ ...value, [channel]: next });
  };

  return (
    <div className={`space-y-4 ${disabled ? "pointer-events-none opacity-40" : ""}`}>
      {/* 2D Color Gradient Field + Vertical Rainbow Hue Slider */}
      <div className="flex gap-3">
        {/* 2D Saturation / Value Gradient Box */}
        <div
          ref={satBoxRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative h-44 flex-1 cursor-crosshair rounded-xl overflow-hidden touch-none select-none border border-[#2b2d32]"
          style={{ backgroundColor: `hsl(${hsv.h}, 100%, 50%)` }}
        >
          {/* Horizontal white-to-transparent gradient */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(to right, #ffffff, transparent)",
            }}
          />
          {/* Vertical transparent-to-black gradient */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(to top, #000000, transparent)",
            }}
          />

          {/* Draggable Circle Thumb */}
          <div
            className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
            style={{
              left: `${hsv.s}%`,
              top: `${100 - hsv.v}%`,
              backgroundColor: currentHex,
            }}
          />
        </div>

        {/* Vertical Rainbow Hue Slider */}
        <div className="relative flex flex-col items-center w-8">
          <input
            type="range"
            min={0}
            max={360}
            value={hsv.h}
            onChange={handleHueChange}
            aria-label="Color hue"
            className="h-44 w-7 rounded-xl appearance-none cursor-pointer outline-none border border-[#2b2d32]"
            style={{
              writingMode: "vertical-lr",
              direction: "rtl",
              background:
                "linear-gradient(to bottom, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)",
            }}
          />
        </div>
      </div>

      {/* Hex & Raw RGB Monospace Inputs */}
      <div className="grid grid-cols-[110px_1fr_1fr_1fr] gap-2 pt-1">
        {/* Hex input */}
        <div className="flex items-center rounded-lg border border-[#2b2d32] bg-[#141518] px-2.5 py-1.5 font-mono">
          <span className="text-[11px] font-bold text-[#52525b] mr-1">#</span>
          <input
            type="text"
            value={hexDraft.replace(/^#/, "").toUpperCase()}
            onChange={(event) =>
              commitHex(`#${event.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6)}`)
            }
            onBlur={() => setHexDraft(currentHex)}
            spellCheck={false}
            className="w-full bg-transparent font-mono text-xs font-bold uppercase tracking-wider text-white outline-none"
            aria-label="Hex color"
          />
        </div>

        {/* R channel */}
        {(["r", "g", "b"] as const).map((ch) => (
          <div
            key={ch}
            className="flex items-center rounded-lg border border-[#2b2d32] bg-[#141518] px-2 py-1.5 font-mono"
          >
            <span className="text-[10px] font-bold uppercase text-[#52525b] mr-1">
              {ch.toUpperCase()}:
            </span>
            <input
              type="number"
              min={0}
              max={255}
              value={value[ch]}
              onChange={(e) => commitChannel(ch, e.target.value)}
              className="w-full bg-transparent font-mono text-xs font-bold text-white text-right outline-none"
              aria-label={`${ch.toUpperCase()} channel`}
            />
          </div>
        ))}
      </div>

      {/* Preset Palette Dots (Circular swatch pills with active white ring) */}
      <div className="pt-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] block mb-2">
          PRESETS
        </span>
        <div className="flex flex-wrap gap-2.5">
          {PRESETS.map((preset) => {
            const selected = preset.toLowerCase() === currentHex.toLowerCase();
            return (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  const parsed = hexToRgb(preset);
                  if (parsed) onChange(parsed);
                }}
                className={`relative h-6 w-6 rounded-full transition-all duration-150 hover:scale-110 ${
                  selected
                    ? "ring-2 ring-white ring-offset-2 ring-offset-[#18191c] scale-110"
                    : "border border-white/10"
                }`}
                style={{ backgroundColor: preset }}
                title={preset}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
