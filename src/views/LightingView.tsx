import { Power, Rainbow, RotateCcw, Sun, Wind, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ColorPicker from "../components/ColorPicker";
import MousePreview from "../components/MousePreview";
import {
  DEFAULT_LIGHTING,
  LIGHT_MODE_LABELS,
  rgbToHex,
  type LightingState,
  type LightMode,
} from "../types";

interface EffectOption {
  mode: LightMode;
  title: string;
  icon: LucideIcon;
  description: string;
}

const EFFECTS: EffectOption[] = [
  { mode: 0, title: "STATIC", icon: Sun, description: "Solid static color illumination" },
  { mode: 1, title: "BREATHE", icon: Wind, description: "Soft rhythmic pulse animation" },
  { mode: 2, title: "SPECTRUM", icon: Rainbow, description: "Continuous RGB color spectrum" },
  { mode: 3, title: "OFF", icon: Power, description: "Turn off LEDs to save battery" },
];

interface LightingViewProps {
  lighting: LightingState;
  onChange: (lighting: LightingState) => void;
  onApply: () => void;
}

export default function LightingView({ lighting, onChange, onApply }: LightingViewProps) {
  const colorEnabled = lighting.mode === 0 || lighting.mode === 1;
  const speedEnabled = lighting.mode === 1 || lighting.mode === 2;
  const hex = rgbToHex(lighting.color);

  return (
    <div className="grid h-full flex-1 gap-6 lg:grid-cols-[440px_minmax(0,1fr)]">
      {/* Left Control Rail */}
      <div className="flex flex-col justify-between space-y-4">
        <div className="space-y-4">
          {/* Effect Selector Card */}
          <section className="card-hardware p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#00f0ff]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                  EFFECT
                </h2>
              </div>
              <span className="text-xs font-bold tracking-wider text-[#00f0ff]">
                {LIGHT_MODE_LABELS[lighting.mode]}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {EFFECTS.map(({ mode, title, icon: Icon, description }) => {
                const selected = lighting.mode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onChange({ ...lighting, mode })}
                    className={`group relative flex flex-col items-start gap-1 rounded-xl border p-3.5 text-left transition-all duration-150 ${
                      selected
                        ? "border-[#00f0ff] bg-[#00f0ff]/10 text-white"
                        : "border-[#2b2d32] bg-[#1f2024] text-[#9ca3af] hover:border-[#3f424a] hover:text-white"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between mb-0.5">
                      <Icon
                        size={17}
                        className={selected ? "text-[#00f0ff]" : "text-[#71717a] group-hover:text-zinc-200"}
                      />
                      {selected && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#00f0ff] shadow-[0_0_6px_#00f0ff]" />
                      )}
                    </div>
                    <span className={`text-xs font-bold tracking-wide ${selected ? "text-white" : "text-[#e4e4e7]"}`}>
                      {title}
                    </span>
                    <span className="text-[10px] leading-tight text-[#71717a]">
                      {description}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* LIGHTSYNC 2D Color Picker Card */}
          <section className={`card-hardware p-5 transition-opacity duration-150 ${!colorEnabled ? "opacity-35" : ""}`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                COLOR
              </h2>
              {colorEnabled && (
                <span className="font-mono text-xs font-bold text-[#00f0ff]">
                  {hex.toUpperCase()}
                </span>
              )}
            </div>
            <ColorPicker
              value={lighting.color}
              onChange={(color) => onChange({ ...lighting, color })}
              disabled={!colorEnabled}
            />
          </section>

          {/* Animation Rate Slider */}
          <section className={`card-hardware p-5 transition-opacity duration-150 ${!speedEnabled ? "opacity-35" : ""}`}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                RATE
              </h2>
              <span className="font-mono text-xs font-bold text-[#00f0ff]">
                {lighting.speed} / 10
              </span>
            </div>

            <div className="space-y-2">
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={lighting.speed}
                disabled={!speedEnabled}
                onChange={(event) => onChange({ ...lighting, speed: Number(event.target.value) })}
                className="ghub-slider w-full"
                aria-label="Animation speed"
              />
              <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider text-[#71717a]">
                <span>Slow</span>
                <span>Fast</span>
              </div>
            </div>
          </section>
        </div>

        {/* Action Buttons Panel */}
        <div className="flex items-center justify-between rounded-xl border border-[#2b2d32] bg-[#18191c] p-4 mt-auto">
          <div className="flex items-center gap-2 text-xs text-[#9ca3af]">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Synced with mouse memory</span>
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              className="btn-ghub"
              onClick={() => onChange(DEFAULT_LIGHTING)}
              title="Reset to default settings"
            >
              <RotateCcw size={13} />
              Reset
            </button>
            <button
              type="button"
              className="btn-ghub-primary"
              onClick={onApply}
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Main Hardware Stage Column */}
      <div className="flex flex-col h-full">
        <div className="card-hardware relative flex flex-1 flex-col items-center justify-between p-8 overflow-hidden">
          {/* Top-Left Device Stats Placement (Skill Requirement) */}
          <div className="flex w-full items-center justify-between border-b border-[#2b2d32]/50 pb-4">
            <div>
              <h1 className="text-sm font-black tracking-wider text-white">
                KLIM BLAZE WIRELESS
              </h1>
              <p className="text-[11px] font-medium text-[#71717a] mt-0.5">
                LIGHTSYNC RGB • 16.8M COLORS
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#1f2024] border border-[#2b2d32] px-3 py-1 text-xs font-bold text-[#00f0ff]">
                {LIGHT_MODE_LABELS[lighting.mode].toUpperCase()}
              </span>
            </div>
          </div>

          {/* Mouse Hardware Stage Render */}
          <div className="my-auto flex w-full flex-1 items-center justify-center py-6">
            <MousePreview
              color={hex}
              mode={lighting.mode}
              speed={lighting.speed}
              showViewToggle={true}
              className="w-full max-w-xl"
            />
          </div>

          {/* Footer Active Spec Pill */}
          <div className="flex w-full items-center justify-between rounded-xl border border-[#2b2d32] bg-[#1f2024] px-5 py-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span
                className="h-3 w-3 rounded-full border border-white/20 shadow-sm"
                style={{ backgroundColor: lighting.mode === 3 ? "transparent" : hex }}
              />
              <span className="text-white font-bold">
                {LIGHT_MODE_LABELS[lighting.mode]}
              </span>
            </div>
            <span className="font-mono font-bold tracking-wider text-[#00f0ff]">
              {lighting.mode === 3 ? "DISABLED" : hex.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
