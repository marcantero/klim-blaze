import { Power, Rainbow, RotateCcw, Sun, Wind } from "lucide-react";
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
  code: string;
  title: string;
  icon: LucideIcon;
  description: string;
}

const EFFECTS: EffectOption[] = [
  { mode: 0, code: "MOD-00", title: "STATIC", icon: Sun, description: "Continuous static illumination" },
  { mode: 1, code: "MOD-01", title: "BREATHE", icon: Wind, description: "Cyclic breathing pulse" },
  { mode: 2, code: "MOD-02", title: "SPECTRUM", icon: Rainbow, description: "Full RGB spectrum rotation" },
  { mode: 3, code: "MOD-03", title: "OFF", icon: Power, description: "Power off LEDs to save battery" },
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
    <div className="grid h-full flex-1 gap-6 lg:grid-cols-[420px_minmax(0,1fr)] font-mono">
      {/* Rack Controls Column */}
      <div className="flex flex-col justify-between space-y-4">
        <div className="space-y-4">
          {/* Module Header & Effect Selector */}
          <section className="panel-instrument p-5">
            <div className="mb-4 flex items-center justify-between border-b border-[#1b2230] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-widest text-[#00b8fc]">
                  [ 01 // LIGHTSYNC ]
                </span>
              </div>
              <span className="text-[10px] text-[#55637e]">
                REG: 0x08/0x07
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {EFFECTS.map(({ mode, code, title, icon: Icon, description }) => {
                const selected = lighting.mode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onChange({ ...lighting, mode })}
                    className={`group relative flex flex-col items-start gap-1 rounded-none border p-3.5 text-left transition-all ${
                      selected
                        ? "border-[#00b8fc] bg-[#00b8fc]/10 text-white"
                        : "border-[#1b2230] bg-[#090b10] text-[#717e99] hover:border-[#2a354c] hover:text-[#c4cedf]"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-[8px] tracking-wider text-[#4d5973]">
                        {code}
                      </span>
                      <Icon
                        size={15}
                        className={selected ? "text-[#00b8fc]" : "text-[#58647e]"}
                      />
                    </div>
                    <span className={`text-xs font-bold tracking-wider ${selected ? "text-white" : "text-[#c2cbdb]"}`}>
                      {title}
                    </span>
                    <span className="text-[9px] leading-snug text-[#54607a]">
                      {description}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Color Matrix */}
          <section className={`panel-instrument p-5 transition-opacity ${!colorEnabled ? "opacity-35" : ""}`}>
            <div className="mb-3.5 flex items-center justify-between border-b border-[#1b2230] pb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7987a4]">
                COLOR MATRIX
              </span>
              {colorEnabled && (
                <span className="text-[10px] font-bold text-[#00b8fc]">
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

          {/* Animation Frequency / Speed Potentiometer */}
          <section className={`panel-instrument p-5 transition-opacity ${!speedEnabled ? "opacity-35" : ""}`}>
            <div className="mb-3 flex items-center justify-between border-b border-[#1b2230] pb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7987a4]">
                OSCILLATION FREQUENCY
              </span>
              <span className="text-[11px] font-bold text-[#00b8fc]">
                {lighting.speed.toString().padStart(2, "0")} / 10
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
                className="w-full h-1.5 appearance-none bg-[#1b2230] cursor-pointer rounded-none disabled:cursor-not-allowed"
                aria-label="Animation speed"
              />
              {/* Calibration graduation marks */}
              <div className="flex justify-between text-[8px] text-[#4d5973]">
                {Array.from({ length: 10 }).map((_, i) => (
                  <span key={i} className={i + 1 === lighting.speed ? "text-[#00b8fc] font-bold" : ""}>
                    {(i + 1).toString().padStart(2, "0")}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Bus Commit Action Panel */}
        <div className="flex items-center justify-between border border-[#1b2230] bg-[#0a0c12] p-3.5 mt-auto">
          <div className="flex items-center gap-2 text-[10px] text-[#63708a]">
            <span className="h-1.5 w-1.5 rounded-none bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            <span>NVRAM SYNCHRONIZED</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn px-3 py-1.5 text-[11px]"
              onClick={() => onChange(DEFAULT_LIGHTING)}
              title="Reset to factory defaults"
            >
              <RotateCcw size={11} />
              RESET
            </button>
            <button
              type="button"
              className="btn btn-primary px-3.5 py-1.5 text-[11px]"
              onClick={onApply}
            >
              COMMIT // 0x55
            </button>
          </div>
        </div>
      </div>

      {/* Main Hardware Visual Stage Column (CAD / Instrument viewport) */}
      <div className="flex flex-col h-full">
        <div className="panel-instrument corner-reticle relative flex flex-1 flex-col items-center justify-between p-8 overflow-hidden">
          {/* Top Stage Indicators */}
          <div className="flex w-full items-center justify-between border-b border-[#1b2230]/70 pb-3">
            <div className="flex items-center gap-3 text-[10px] tracking-wider text-[#525f7a]">
              <span>VIEWPORT // 1:1 CAD HARDWARE STAGE</span>
              <span className="text-[#323a4d]">|</span>
              <span>CALIBRATION: ACTIVE</span>
            </div>
            <span className="badge-tech text-[#00b8fc]">
              {LIGHT_MODE_LABELS[lighting.mode].toUpperCase()}
            </span>
          </div>

          {/* Mouse Hardware Stage */}
          <div className="my-auto flex w-full flex-1 items-center justify-center py-4">
            <MousePreview
              color={hex}
              mode={lighting.mode}
              speed={lighting.speed}
              showViewToggle={true}
              className="w-full max-w-xl"
            />
          </div>

          {/* Telemetry Footer Spec Bar */}
          <div className="flex w-full items-center justify-between border border-[#1b2230] bg-[#07090e] px-5 py-3 text-[10px]">
            <div className="flex items-center gap-2.5">
              <span
                className="h-2.5 w-2.5 rounded-none border border-white/20"
                style={{ backgroundColor: lighting.mode === 3 ? "transparent" : hex }}
              />
              <span className="text-white font-bold tracking-wider">
                {LIGHT_MODE_LABELS[lighting.mode].toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="text-[#55637e]">TELEMETRY REG:</span>
              <span className="font-bold text-[#00b8fc] tracking-wider">
                {lighting.mode === 3 ? "DISABLED" : hex.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
