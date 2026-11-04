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
}

export default function LightingView({ lighting, onChange }: LightingViewProps) {
  const colorEnabled = lighting.mode === 0 || lighting.mode === 1;
  const speedEnabled = lighting.mode === 1 || lighting.mode === 2;
  const brightnessEnabled = lighting.mode !== 3;
  const hex = rgbToHex(lighting.color);

  return (
    <div className="grid h-full flex-1 gap-4 xl:gap-5 lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[410px_minmax(0,1fr)]">
      {/* Left Control Rail */}
      <div className="flex flex-col gap-3">
        {/* Effect Selector Card */}
        <section className="card-hardware p-3.5 xl:p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-[#00f0ff]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                EFFECT
              </h2>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold tracking-wider text-[#00f0ff]">
                {LIGHT_MODE_LABELS[lighting.mode]}
              </span>
              <button
                type="button"
                onClick={() => onChange(DEFAULT_LIGHTING)}
                title="Reset to default lighting"
                className="text-[#71717a] hover:text-white transition-colors p-1"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {EFFECTS.map(({ mode, title, icon: Icon, description }) => {
              const selected = lighting.mode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onChange({ ...lighting, mode })}
                  className={`group relative flex flex-col items-start gap-0.5 rounded-xl border p-2.5 xl:p-3 text-left transition-all duration-150 hover:brightness-110 active:scale-[0.99] ${
                    selected
                      ? "border-[#00f0ff] bg-[#00f0ff]/10 text-white"
                      : "border-[#2b2d32] bg-[#1f2024] text-[#9ca3af] hover:border-[#3f424a] hover:text-white"
                  }`}
                >
                  <div className="flex w-full items-center justify-between mb-0.5">
                    <Icon
                      size={15}
                      className={selected ? "text-[#00f0ff]" : "text-[#71717a] group-hover:text-zinc-200"}
                    />
                    {selected && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#00f0ff] shadow-[0_0_6px_#00f0ff]" />
                    )}
                  </div>
                  <span className={`text-xs font-bold tracking-wide ${selected ? "text-white" : "text-[#e4e4e7]"}`}>
                    {title}
                  </span>
                  <span className="text-xs leading-tight text-[#71717a]">
                    {description}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* LIGHTSYNC 2D Color Picker Card */}
        {colorEnabled ? (
          <section className="card-hardware p-3.5 xl:p-4 animate-fade-in">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                COLOR
              </h2>
              <span className="font-mono text-xs font-bold text-[#00f0ff]">
                {hex.toUpperCase()}
              </span>
            </div>
            <ColorPicker
              value={lighting.color}
              onChange={(color) => onChange({ ...lighting, color })}
              disabled={!colorEnabled}
            />
          </section>
        ) : (
          <section className="card-hardware p-3 flex items-center justify-between text-xs text-[#71717a]">
            <div className="flex items-center gap-2">
              <Sparkles size={13} className="text-[#00f0ff]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#9ca3af]">
                {lighting.mode === 2 ? "COLOR SPECTRUM" : "LIGHTING DISABLED"}
              </span>
            </div>
            <span className="font-mono text-xs font-bold text-[#00f0ff]/80">
              {lighting.mode === 2 ? "FULL RGB SPECTRUM CYCLE" : "OFF"}
            </span>
          </section>
        )}

        {/* Unified Lighting Controls (Brightness & Speed) */}
        <section className="card-hardware p-3.5 xl:p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#2b2d32]/50 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              CONTROLS
            </h2>
          </div>

          {/* LED Brightness Slider */}
          <div className={`space-y-1 transition-opacity duration-150 ${!brightnessEnabled ? "opacity-35 pointer-events-none" : ""}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#9ca3af]">
                BRIGHTNESS
              </span>
              <span className="font-mono text-xs font-bold text-[#00f0ff]">
                {lighting.brightness * 10}%
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={lighting.brightness}
              disabled={!brightnessEnabled}
              onChange={(event) =>
                onChange({ ...lighting, brightness: Number(event.target.value) })
              }
              className="ghub-slider w-full"
              aria-label="LED Brightness"
            />
            <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-[#71717a]">
              <span>10%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Animation Speed Slider */}
          <div className={`space-y-1 pt-2 border-t border-[#2b2d32]/50 transition-opacity duration-150 ${!speedEnabled ? "opacity-35 pointer-events-none" : ""}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#9ca3af]">
                SPEED
              </span>
              <span className="font-mono text-xs font-bold text-[#00f0ff]">
                {lighting.speed} / 10
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={lighting.speed}
              disabled={!speedEnabled}
              onChange={(event) =>
                onChange({ ...lighting, speed: Number(event.target.value) })
              }
              className="ghub-slider w-full"
              aria-label="Animation speed"
            />
            <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-[#71717a]">
              <span>Slow</span>
              <span>Fast</span>
            </div>
          </div>
        </section>
      </div>

      {/* Main Hardware Stage Column */}
      <div className="flex flex-col h-full min-h-0">
        <div className="card-hardware relative flex flex-1 flex-col items-center justify-between p-5 xl:p-6 overflow-hidden">
          {/* Top-Left Device Stats Placement (Skill Requirement) */}
          <div className="relative z-20 flex w-full items-center justify-between border-b border-[#2b2d32]/50 pb-4">
            <div>
              <h1 className="text-sm font-black tracking-wider text-white">
                KLIM BLAZE WIRELESS
              </h1>
              <p className="text-xs font-medium text-[#71717a] mt-0.5">
                LIGHTSYNC RGB • 16.8M COLORS
              </p>
            </div>
            <span className="rounded-full bg-[#1f2024] border border-[#2b2d32] px-3 py-1 text-xs font-bold text-[#00f0ff]">
              {LIGHT_MODE_LABELS[lighting.mode].toUpperCase()}
            </span>
          </div>

          {/* Mouse Hardware Stage Render */}
          <div className="my-auto flex w-full flex-1 items-center justify-center py-6">
            <MousePreview
              color={hex}
              mode={lighting.mode}
              speed={lighting.speed}
              brightness={lighting.brightness}
              className="w-full max-w-xl"
            />
          </div>

          {/* Footer Active Spec Pill */}
          <div className="relative z-20 flex w-full items-center justify-between rounded-xl border border-[#2b2d32] bg-[#1f2024] px-5 py-3 text-xs">
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
