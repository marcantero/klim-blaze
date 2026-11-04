import { useEffect, useState, useRef } from "react";
import { Gauge, Zap, Sliders, Check } from "lucide-react";
import MousePreview from "../components/MousePreview";
import {
  type DpiState,
  type PollingRate,
  type SystemPointerSettings,
  DEFAULT_SYSTEM_POINTER_SETTINGS,
} from "../types";
import {
  getSystemPointerSettings,
  setSystemPointerSettings,
  setDpiEffect,
} from "../lib/api";

const MIN_DPI = 200;
const MAX_DPI = 10000;

const POLLING_OPTIONS: Array<{ hz: PollingRate; ms: string; label: string }> = [
  { hz: 125, ms: "8ms", label: "Standard" },
  { hz: 250, ms: "4ms", label: "Balanced" },
  { hz: 500, ms: "2ms", label: "Gaming" },
  { hz: 1000, ms: "1ms", label: "Pro" },
];

const DPI_EFFECT_OPTIONS = [
  { mode: 1, label: "Respiration" },
  { mode: 0, label: "Steady" },
  { mode: 2, label: "OFF" },
];

function clampDpi(value: number): number {
  if (!Number.isFinite(value)) return MIN_DPI;
  return Math.min(MAX_DPI, Math.max(MIN_DPI, Math.round(value / 100) * 100));
}

interface DpiViewProps {
  dpi: DpiState;
  onChange: (dpi: DpiState) => void;
}

export default function DpiView({ dpi, onChange }: DpiViewProps) {
  const activeIndex = Math.min(dpi.activeIndex, dpi.stages.length - 1);
  const active = dpi.stages[activeIndex];

  // Windows System Pointer Settings
  const [pointerSettings, setPointerSettings] = useState<SystemPointerSettings>(
    DEFAULT_SYSTEM_POINTER_SETTINGS
  );
  const [dcTestSuccess, setDcTestSuccess] = useState(false);

  // DPI Effect state (EEPROM 0x4C)
  const [dpiEffectMode, setDpiEffectMode] = useState<number>(1);
  const [dpiEffectSpeed, setDpiEffectSpeed] = useState<number>(3);

  // Color picker hidden input ref
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [editingColorIndex, setEditingColorIndex] = useState<number | null>(null);

  // Load system pointer settings on mount
  useEffect(() => {
    let cancelled = false;
    async function loadSettings() {
      try {
        const settings = await getSystemPointerSettings();
        if (!cancelled && settings) {
          setPointerSettings(settings);
        }
      } catch (err) {
        console.warn("Failed to load Windows pointer settings:", err);
      }
    }
    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const updatePointerSettings = (patch: Partial<SystemPointerSettings>) => {
    const updated = { ...pointerSettings, ...patch };
    setPointerSettings(updated);
    void setSystemPointerSettings(updated);
  };

  const handleDpiEffectChange = (mode: number, speed: number) => {
    setDpiEffectMode(mode);
    setDpiEffectSpeed(speed);
    void setDpiEffect(mode, speed);
  };

  const handleTestDoubleClick = () => {
    setDcTestSuccess(true);
    window.setTimeout(() => setDcTestSuccess(false), 1200);
  };

  const setStageDpi = (index: number, nextDpi: number) => {
    onChange({
      ...dpi,
      stages: dpi.stages.map((stage, i) =>
        i === index ? { ...stage, dpi: clampDpi(nextDpi) } : stage
      ),
    });
  };

  const toggleStageEnabled = (index: number) => {
    const stage = dpi.stages[index];
    const isCurrentlyEnabled = stage.enabled !== false;

    // Safety: at least 1 stage must remain enabled
    const enabledCount = dpi.stages.filter((s) => s.enabled !== false).length;
    if (isCurrentlyEnabled && enabledCount <= 1) {
      return;
    }

    const nextEnabled = !isCurrentlyEnabled;
    onChange({
      ...dpi,
      stages: dpi.stages.map((s, i) =>
        i === index ? { ...s, enabled: nextEnabled } : s
      ),
    });
  };

  const handleColorBoxClick = (index: number) => {
    setEditingColorIndex(index);
    if (colorInputRef.current) {
      colorInputRef.current.value = dpi.stages[index].color;
      colorInputRef.current.click();
    }
  };

  const handleColorChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editingColorIndex === null) return;
    const newColor = e.target.value;
    onChange({
      ...dpi,
      stages: dpi.stages.map((stage, i) =>
        i === editingColorIndex ? { ...stage, color: newColor } : stage
      ),
    });
  };

  return (
    <div className="grid h-full flex-1 gap-3.5 xl:gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] overflow-hidden">
      {/* Hidden native color input for stage color picker */}
      <input
        ref={colorInputRef}
        type="color"
        onChange={handleColorChanged}
        className="sr-only"
        aria-hidden="true"
      />

      {/* Left Column: DPI Stages, DPI Effect & Polling Rate (Unified single-card layout) */}
      <section className="card-hardware flex flex-col justify-between p-4 xl:p-4.5 overflow-hidden">
        <div>
          {/* Header */}
          <div className="mb-2.5 flex items-center justify-between border-b border-[#2b2d32]/60 pb-2">
            <div className="flex items-center gap-2">
              <Gauge size={15} className="text-[#00f0ff]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                DPI STAGES
              </h2>
            </div>
            <span className="text-xs font-bold tracking-wider text-[#9ca3af]">
              {dpi.stages.filter((s) => s.enabled !== false).length} OF {dpi.stages.length} ACTIVE
            </span>
          </div>

          {/* 6 Individual Stage Sliders (Ultra-compact rows) */}
          <div className="space-y-1.5">
            {dpi.stages.map((stage, index) => {
              const isActive = index === activeIndex;
              const isEnabled = stage.enabled !== false;

              return (
                <div
                  key={index}
                  className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-1 transition-all ${
                    isActive
                      ? "bg-[#1f2024] border border-[#2b2d32]"
                      : "hover:bg-[#18191c]"
                  }`}
                >
                  {/* Enable / Disable Checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleStageEnabled(index)}
                    title={isEnabled ? "Disable stage" : "Enable stage"}
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      isEnabled
                        ? "border-[#00f0ff] bg-[#00f0ff] text-black"
                        : "border-[#3f4148] bg-[#141518] text-transparent hover:border-[#71717a]"
                    }`}
                  >
                    {isEnabled && <Check size={11} strokeWidth={3} />}
                  </button>

                  {/* Color Preview Square */}
                  <button
                    type="button"
                    onClick={() => handleColorBoxClick(index)}
                    title="Change stage color"
                    className="h-4.5 w-4.5 shrink-0 rounded border border-white/20 shadow-sm transition-transform hover:scale-110 active:scale-95"
                    style={{ backgroundColor: stage.color }}
                  />

                  {/* Stage Range Slider */}
                  <div className="flex-1 min-w-0">
                    <input
                      type="range"
                      min={MIN_DPI}
                      max={MAX_DPI}
                      step={100}
                      disabled={!isEnabled}
                      value={stage.dpi}
                      onChange={(e) => setStageDpi(index, Number(e.target.value))}
                      className={`ghub-slider w-full ${!isEnabled ? "opacity-30 cursor-not-allowed" : ""}`}
                      aria-label={`Stage ${index + 1} DPI`}
                    />
                  </div>

                  {/* DPI Readout */}
                  <button
                    type="button"
                    onClick={() => onChange({ ...dpi, activeIndex: index })}
                    title={`Set Stage ${index + 1} as active`}
                    className={`min-w-[55px] text-right font-mono text-xs font-black transition-all ${
                      isActive
                        ? "scale-105"
                        : isEnabled
                        ? "text-white hover:text-[#00f0ff]"
                        : "text-[#52525b] hover:text-[#71717a]"
                    }`}
                    style={isActive ? { color: stage.color } : undefined}
                  >
                    {stage.dpi}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Section: DPI Effect + Polling Rate */}
        <div className="mt-3 space-y-3 border-t border-[#2b2d32]/60 pt-2.5">
          {/* DPI Effect & Speed Controls */}
          <div className="grid grid-cols-2 gap-3 items-center">
            {/* DPI Effect Dropdown */}
            <div>
              <label className="text-xs font-bold text-white block mb-1">
                DPI Effect
              </label>
              <select
                value={dpiEffectMode}
                onChange={(e) =>
                  handleDpiEffectChange(Number(e.target.value), dpiEffectSpeed)
                }
                className="w-full rounded-lg border border-[#2b2d32] bg-[#141518] px-2.5 py-1.5 text-xs font-medium text-white focus:border-[#00f0ff] focus:outline-none"
              >
                {DPI_EFFECT_OPTIONS.map((opt) => (
                  <option key={opt.mode} value={opt.mode}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* DPI Effect Speed Slider */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-bold text-white">Speed</span>
                <span className="font-mono text-xs font-bold text-[#00f0ff]">
                  {dpiEffectSpeed} / 5
                </span>
              </div>
              <div className="relative py-0.5">
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={dpiEffectSpeed}
                  onChange={(e) =>
                    handleDpiEffectChange(dpiEffectMode, Number(e.target.value))
                  }
                  className="ghub-slider w-full"
                  aria-label="DPI Effect Speed"
                />
                <div className="mt-1 flex justify-between px-0.5">
                  {[1, 2, 3, 4, 5].map((t) => (
                    <span
                      key={t}
                      className={`h-1 w-1 rounded-full ${
                        dpiEffectSpeed === t ? "bg-[#00f0ff]" : "bg-[#3f4148]"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Polling Rate (Report Rate) - Compact 4-button strip */}
          <div className="border-t border-[#2b2d32]/40 pt-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Zap size={13} className="text-[#00f0ff]" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  REPORT RATE (POLLING RATE)
                </span>
              </div>
              <span className="rounded-full bg-[#141518] border border-[#2b2d32] px-2 py-0.2 text-[11px] font-mono font-bold text-[#00f0ff]">
                {dpi.pollingRate} Hz
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {POLLING_OPTIONS.map(({ hz, ms, label }) => {
                const selected = dpi.pollingRate === hz;
                return (
                  <button
                    key={hz}
                    type="button"
                    onClick={() => onChange({ ...dpi, pollingRate: hz })}
                    className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg border transition-all ${
                      selected
                        ? "border-[#00f0ff] bg-[#00f0ff]/15 text-white"
                        : "border-[#2b2d32] bg-[#141518] text-[#9ca3af] hover:border-[#3f424a] hover:text-white"
                    }`}
                  >
                    <span className="font-mono text-xs font-bold text-white">
                      {hz}Hz
                    </span>
                    <span
                      className={`text-[11px] font-bold ${
                        selected ? "text-[#00f0ff]" : "text-[#71717a]"
                      }`}
                    >
                      {ms} • {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Right Column: Mouse Preview + Windows Pointer Controls */}
      <div className="flex flex-col gap-3.5 xl:gap-4 overflow-hidden">
        {/* Mouse Side Preview Card (Compact) */}
        <div className="card-hardware flex flex-col justify-between p-3.5 xl:p-4 shrink-0">
          <div className="relative z-20 flex w-full items-center justify-between border-b border-[#2b2d32]/50 pb-2">
            <div>
              <h2 className="text-xs font-bold tracking-wider text-white uppercase">
                OPTICAL SENSOR
              </h2>
              <p className="text-[11px] font-medium text-[#71717a]">
                PIXART PMW3325 • 10,000 MAX DPI
              </p>
            </div>
            <span
              className="rounded-full border border-current px-2.5 py-0.5 text-xs font-mono font-bold"
              style={{ color: active.color }}
            >
              {active.dpi.toLocaleString()} DPI
            </span>
          </div>

          <div className="my-1 flex w-full items-center justify-center py-1">
            <MousePreview
              variant="side"
              logoColor={active.color}
              color={active.color}
              showUnderglow={true}
              className="w-full max-w-[240px] xl:max-w-[270px] max-h-[110px] xl:max-h-[125px]"
            />
          </div>

          <div className="relative z-20 flex w-full items-center justify-between rounded-lg border border-[#2b2d32] bg-[#141518] px-3 py-1.5 text-xs">
            <span className="text-[#9ca3af] font-medium">STAGE #{activeIndex + 1} ACTIVE</span>
            <span className="font-mono font-bold text-xs" style={{ color: active.color }}>
              {active.dpi.toLocaleString()} DPI
            </span>
          </div>
        </div>

        {/* Pointer Behavior Card (Mouse Sensitivity, Scrolling Speed, Double-Click Speed) */}
        <section className="card-hardware flex-1 flex flex-col justify-between p-3.5 xl:p-4 overflow-hidden">
          <div className="mb-2 flex items-center justify-between border-b border-[#2b2d32]/60 pb-1.5">
            <div className="flex items-center gap-1.5">
              <Sliders size={14} className="text-[#00f0ff]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                POINTER & SCROLL BEHAVIOR
              </h2>
            </div>
            <span className="text-[11px] text-[#71717a] font-medium">Windows System Settings</span>
          </div>

          <div className="space-y-2.5">
            {/* 1. Mouse Sensitivity */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-bold text-white">Mouse sensitivity</span>
                <span className="font-mono text-xs font-bold text-[#00f0ff] rounded bg-[#141518] border border-[#2b2d32] px-2 py-0.2">
                  {pointerSettings.mouseSpeed}
                </span>
              </div>

              <div className="relative py-0.5">
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={pointerSettings.mouseSpeed}
                  onChange={(e) =>
                    updatePointerSettings({ mouseSpeed: Number(e.target.value) })
                  }
                  className="ghub-slider w-full"
                  aria-label="Mouse sensitivity"
                />
                <div className="mt-1 flex justify-between px-0.5">
                  {[1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20].map((t) => (
                    <span
                      key={t}
                      className={`h-1 w-1 rounded-full ${
                        pointerSettings.mouseSpeed === t
                          ? "bg-[#00f0ff]"
                          : "bg-[#3f4148]"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <label className="mt-1 flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() =>
                    updatePointerSettings({
                      enhancePrecision: !pointerSettings.enhancePrecision,
                    })
                  }
                  className={`flex h-3.5 w-3.5 items-center justify-center rounded border transition-colors ${
                    pointerSettings.enhancePrecision
                      ? "border-[#00f0ff] bg-[#00f0ff] text-black"
                      : "border-[#3f4148] bg-[#141518]"
                  }`}
                >
                  {pointerSettings.enhancePrecision && (
                    <Check size={10} strokeWidth={3} />
                  )}
                </div>
                <span className="text-xs font-medium text-[#d1d5db]">
                  Improve pointer precision
                </span>
              </label>
            </div>

            {/* 2. Scrolling Speed */}
            <div className="border-t border-[#2b2d32]/40 pt-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-bold text-white">Scrolling speed</span>
                <span className="font-mono text-xs font-bold text-[#00f0ff] rounded bg-[#141518] border border-[#2b2d32] px-2 py-0.2">
                  {pointerSettings.scrollOnePage ? "1 Page" : pointerSettings.scrollLines}
                </span>
              </div>

              <div className="relative py-0.5">
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  disabled={pointerSettings.scrollOnePage}
                  value={pointerSettings.scrollLines}
                  onChange={(e) =>
                    updatePointerSettings({
                      scrollLines: Number(e.target.value),
                      scrollOnePage: false,
                    })
                  }
                  className={`ghub-slider w-full ${
                    pointerSettings.scrollOnePage ? "opacity-35 cursor-not-allowed" : ""
                  }`}
                  aria-label="Scrolling speed"
                />
                <div className="mt-1 flex justify-between px-0.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((t) => (
                    <span
                      key={t}
                      className={`h-1 w-1 rounded-full ${
                        !pointerSettings.scrollOnePage && pointerSettings.scrollLines === t
                          ? "bg-[#00f0ff]"
                          : "bg-[#3f4148]"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <label className="mt-1 flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() =>
                    updatePointerSettings({
                      scrollOnePage: !pointerSettings.scrollOnePage,
                    })
                  }
                  className={`flex h-3.5 w-3.5 items-center justify-center rounded border transition-colors ${
                    pointerSettings.scrollOnePage
                      ? "border-[#00f0ff] bg-[#00f0ff] text-black"
                      : "border-[#3f4148] bg-[#141518]"
                  }`}
                >
                  {pointerSettings.scrollOnePage && <Check size={10} strokeWidth={3} />}
                </div>
                <span className="text-xs font-medium text-[#d1d5db]">
                  Scroll one page
                </span>
              </label>
            </div>

            {/* 3. Double-click Speed */}
            <div className="border-t border-[#2b2d32]/40 pt-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-bold text-white">Double-click speed</span>
                <button
                  type="button"
                  onDoubleClick={handleTestDoubleClick}
                  className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-bold transition-all select-none ${
                    dcTestSuccess
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                      : "border-[#2b2d32] bg-[#141518] text-[#9ca3af] hover:text-white hover:border-[#00f0ff]/40"
                  }`}
                  title="Double-click here to test responsiveness"
                >
                  <span>{dcTestSuccess ? "✓ Responsive!" : "Test Double-Click"}</span>
                </button>
              </div>

              <div className="relative py-0.5">
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={pointerSettings.doubleClickSpeed}
                  onChange={(e) =>
                    updatePointerSettings({ doubleClickSpeed: Number(e.target.value) })
                  }
                  className="ghub-slider w-full"
                  aria-label="Double-click speed"
                />
                <div className="mt-1 flex justify-between px-0.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((t) => (
                    <span
                      key={t}
                      className={`h-1 w-1 rounded-full ${
                        pointerSettings.doubleClickSpeed === t
                          ? "bg-[#00f0ff]"
                          : "bg-[#3f4148]"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-1 flex justify-between text-[11px] font-bold text-[#71717a]">
                <span>Slow</span>
                <span>Fast</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
