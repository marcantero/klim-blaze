import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { hexToRgb, rgbToHex, type Rgb } from "../types";

const PRESETS = [
  "#00b8fc", // Logitech Cyan
  "#2563eb", // Deep Blue
  "#a855f7", // Violet
  "#ec4899", // Magenta
  "#ef4444", // Red
  "#f97316", // Amber
  "#eab308", // Yellow
  "#10b981", // Phosphor Green
  "#ffffff", // 6500K White
];

interface ColorPickerProps {
  value: Rgb;
  onChange: (color: Rgb) => void;
  disabled?: boolean;
}

export default function ColorPicker({ value, onChange, disabled = false }: ColorPickerProps) {
  const current = rgbToHex(value);
  const [hex, setHex] = useState(current);

  useEffect(() => {
    setHex(current);
  }, [current]);

  const commitHex = (next: string) => {
    setHex(next);
    const parsed = hexToRgb(next);
    if (parsed) onChange(parsed);
  };

  const commitChannel = (channel: keyof Rgb, raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    const next = Number.isFinite(parsed) ? Math.min(255, Math.max(0, parsed)) : 0;
    onChange({ ...value, [channel]: next });
  };

  return (
    <div className={`space-y-3.5 font-mono ${disabled ? "pointer-events-none opacity-40" : ""}`}>
      {/* Precision Swatch & Hex input */}
      <div className="flex items-center gap-2">
        <label
          className="relative h-9 w-9 shrink-0 cursor-pointer rounded-none border border-[#262f42] transition-colors hover:border-[#00b8fc]"
          style={{ backgroundColor: current }}
          title="Click to open native color palette"
        >
          <input
            type="color"
            value={current}
            onChange={(event) => {
              const parsed = hexToRgb(event.target.value);
              if (parsed) onChange(parsed);
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Color selector"
          />
        </label>

        <div className="flex min-w-0 flex-1 items-center gap-1.5 border border-[#1f2738] bg-[#07090e] px-2.5 py-1.5">
          <span className="text-[11px] font-bold text-[#55627c]">HEX:</span>
          <input
            type="text"
            value={hex.toUpperCase()}
            onChange={(event) =>
              commitHex(`#${event.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6)}`)
            }
            onBlur={() => setHex(current)}
            spellCheck={false}
            className="w-full bg-transparent font-mono text-xs font-bold uppercase tracking-widest text-white outline-none"
            aria-label="HEX Color"
          />
        </div>
      </div>

      {/* Discrete RGB Channel Fields */}
      <div className="grid grid-cols-3 gap-2">
        {(["r", "g", "b"] as const).map((channel) => (
          <div key={channel} className="flex items-center border border-[#1f2738] bg-[#07090e] px-2 py-1">
            <span className="text-[9px] font-bold uppercase text-[#5a6782] mr-1.5">
              {channel.toUpperCase()}:
            </span>
            <input
              type="number"
              min={0}
              max={255}
              value={value[channel]}
              onChange={(event) => commitChannel(channel, event.target.value)}
              className="w-full bg-transparent font-mono text-xs font-bold text-white text-right outline-none"
            />
          </div>
        ))}
      </div>

      {/* Preset Swatches Matrix */}
      <div>
        <span className="text-[9px] font-bold uppercase tracking-wider text-[#525f78] block mb-1.5">
          HARDWARE PRESETS
        </span>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => {
            const selected = preset.toLowerCase() === current.toLowerCase();
            return (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  const parsed = hexToRgb(preset);
                  if (parsed) onChange(parsed);
                }}
                className={`relative h-6 w-6 rounded-none border transition-all ${
                  selected
                    ? "border-white shadow-[0_0_8px_rgba(255,255,255,0.5)] scale-105"
                    : "border-[#1c2230] hover:border-[#38435d]"
                }`}
                style={{ backgroundColor: preset }}
                title={preset}
              >
                {selected && (
                  <span className="flex h-full w-full items-center justify-center">
                    <Check
                      size={10}
                      className={preset === "#ffffff" ? "text-black" : "text-white"}
                      strokeWidth={3.5}
                    />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
