import { useEffect, useState } from "react";
import { Plus, Trash2, Gauge, Zap } from "lucide-react";
import MousePreview from "../components/MousePreview";
import type { DpiState, PollingRate } from "../types";

const MIN_DPI = 200;
const MAX_DPI = 10000;
const STAGE_COLORS = [
  "#00f0ff", // Logitech G Cyan
  "#a855f7", // Routing Purple
  "#f97316", // Warm Orange
  "#22c55e", // Green
  "#eab308", // Yellow
  "#ec4899", // Electric Pink
  "#14b8a6", // Teal
  "#ef4444", // Red
];

const POLLING_OPTIONS: Array<{ hz: PollingRate; ms: string; label: string }> = [
  { hz: 125, ms: "8 ms", label: "Standard" },
  { hz: 250, ms: "4 ms", label: "Balanced" },
  { hz: 500, ms: "2 ms", label: "Gaming" },
  { hz: 1000, ms: "1 ms", label: "Pro Competitor" },
];

const TICKS = [200, 2000, 4000, 6000, 8000, 10000];

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
  const [draft, setDraft] = useState(() => String(active.dpi));

  useEffect(() => {
    setDraft(String(active.dpi));
  }, [active.dpi, activeIndex]);

  const setStage = (index: number, patch: Partial<DpiState["stages"][number]>) => {
    onChange({
      ...dpi,
      stages: dpi.stages.map((stage, i) => (i === index ? { ...stage, ...patch } : stage)),
    });
  };

  const commitDraft = () => {
    const next = clampDpi(Number(draft));
    setDraft(String(next));
    if (next !== active.dpi) setStage(activeIndex, { dpi: next });
  };

  const addStage = () => {
    if (dpi.stages.length >= 8) return;
    const color = STAGE_COLORS[dpi.stages.length % STAGE_COLORS.length];
    const stage = { dpi: clampDpi(Math.min(MAX_DPI, active.dpi + 400)), color };
    onChange({
      ...dpi,
      stages: [...dpi.stages, stage],
      activeIndex: dpi.stages.length,
    });
  };

  const removeStage = () => {
    if (dpi.stages.length <= 1) return;
    const stages = dpi.stages.filter((_, index) => index !== activeIndex);
    onChange({
      ...dpi,
      stages,
      activeIndex: Math.min(activeIndex, stages.length - 1),
    });
  };

  return (
    <div className="grid h-full flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_440px]">
      {/* Settings Column */}
      <div className="flex flex-col justify-between space-y-4">
        <div className="space-y-4">
          {/* Main DPI Speedometer & Stages Card */}
          <section className="card-hardware p-6">
            <div className="mb-6 flex items-center justify-between border-b border-[#2b2d32]/60 pb-4">
              <div className="flex items-center gap-2">
                <Gauge size={18} className="text-[#00f0ff]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                  DPI SPEED (SENSITIVITY)
                </h2>
              </div>
              <span className="text-xs font-bold tracking-wider text-[#9ca3af]">
                STAGE {activeIndex + 1} OF {dpi.stages.length}
              </span>
            </div>

            {/* Large Hero DPI Readout */}
            <div className="mb-6 flex items-baseline justify-between rounded-xl border border-[#2b2d32] bg-[#141518] p-5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#71717a]">
                  ACTIVE SENSITIVITY
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span
                    className="font-mono text-5xl font-black tracking-tight"
                    style={{ color: active.color }}
                  >
                    {active.dpi.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold tracking-widest text-[#71717a]">
                    DPI
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <label
                  className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[#2b2d32] bg-[#1f2024] hover:border-[#3f424a]"
                  title="Change stage color"
                >
                  <span
                    className="h-4 w-4 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: active.color }}
                  />
                  <input
                    type="color"
                    value={active.color}
                    onChange={(event) => setStage(activeIndex, { color: event.target.value })}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label="Stage color"
                  />
                </label>

                <input
                  type="number"
                  min={MIN_DPI}
                  max={MAX_DPI}
                  step={100}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={commitDraft}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                  className="field-ghub w-28 py-2 text-right font-mono text-base font-bold"
                  aria-label="DPI value"
                />
              </div>
            </div>

            {/* Stage Pills Track */}
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {dpi.stages.map((stage, index) => {
                  const selected = index === activeIndex;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => onChange({ ...dpi, activeIndex: index })}
                      className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all duration-150 ${
                        selected
                          ? "border-[#00f0ff] bg-[#00f0ff]/15 text-white shadow-none"
                          : "border-[#2b2d32] bg-[#1f2024] text-[#9ca3af] hover:border-[#3f424a] hover:text-white"
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: stage.color,
                          boxShadow: selected ? `0 0 8px ${stage.color}` : "none",
                        }}
                      />
                      <span className="font-mono">{stage.dpi.toLocaleString()}</span>
                    </button>
                  );
                })}
              </div>

              {/* Hardware 4px Slider with Solid White Capsule Thumb */}
              <div className="pt-2">
                <input
                  type="range"
                  min={MIN_DPI}
                  max={MAX_DPI}
                  step={100}
                  value={active.dpi}
                  onChange={(event) =>
                    setStage(activeIndex, { dpi: clampDpi(Number(event.target.value)) })
                  }
                  className="ghub-slider w-full"
                  aria-label="DPI slider"
                />
                <div className="mt-2 flex justify-between text-[10px] font-mono text-[#71717a]">
                  {TICKS.map((tick) => (
                    <span key={tick}>{tick.toLocaleString()}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Stage Controls: Add / Remove */}
            <div className="mt-6 flex items-center justify-between border-t border-[#2b2d32]/60 pt-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-ghub"
                  onClick={addStage}
                  disabled={dpi.stages.length >= 8}
                >
                  <Plus size={13} />
                  Add Stage
                </button>
                <button
                  type="button"
                  className="btn-ghub"
                  onClick={removeStage}
                  disabled={dpi.stages.length <= 1}
                >
                  <Trash2 size={13} />
                  Delete Stage
                </button>
              </div>
              <span className="text-[11px] font-medium text-[#71717a]">
                Up to 8 stages on-board
              </span>
            </div>
          </section>

          {/* Polling Rate (Report Rate) Card */}
          <section className="card-hardware p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-[#00f0ff]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                  REPORT RATE (POLLING RATE)
                </h2>
              </div>
              <span className="rounded-full bg-[#1f2024] border border-[#2b2d32] px-3 py-0.5 text-xs font-mono font-bold text-[#00f0ff]">
                {dpi.pollingRate} Hz
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {POLLING_OPTIONS.map(({ hz, ms, label }) => {
                const selected = dpi.pollingRate === hz;
                return (
                  <button
                    key={hz}
                    type="button"
                    onClick={() => onChange({ ...dpi, pollingRate: hz })}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-3.5 transition-all duration-150 ${
                      selected
                        ? "border-[#00f0ff] bg-[#00f0ff]/15 text-white"
                        : "border-[#2b2d32] bg-[#1f2024] text-[#9ca3af] hover:border-[#3f424a] hover:text-white"
                    }`}
                  >
                    <span className="font-mono text-base font-extrabold text-white">
                      {hz} <span className="text-xs font-normal text-[#9ca3af]">Hz</span>
                    </span>
                    <span className={`text-[11px] font-bold ${selected ? "text-[#00f0ff]" : "text-[#9ca3af]"}`}>
                      {ms}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-[#71717a]">
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* Visual Mouse Preview Column */}
      <div className="flex flex-col h-full space-y-4">
        <div className="card-hardware flex flex-1 flex-col items-center justify-between p-8">
          <div className="flex w-full items-center justify-between border-b border-[#2b2d32]/50 pb-4">
            <div>
              <h2 className="text-sm font-black tracking-wider text-white">
                OPTICAL SENSOR
              </h2>
              <p className="text-[11px] font-medium text-[#71717a] mt-0.5">
                PIXART PMW3325 • 10,000 MAX DPI
              </p>
            </div>
            <span className="rounded-full bg-[#1f2024] border border-[#2b2d32] px-3 py-1 text-xs font-mono font-bold text-[#00f0ff]">
              {active.dpi.toLocaleString()} DPI
            </span>
          </div>

          <div className="my-auto flex w-full flex-1 items-center justify-center py-6">
            <MousePreview
              logoColor={active.color}
              showUnderglow={false}
              showViewToggle={true}
              className="w-full max-w-sm xl:max-w-md"
            />
          </div>

          <div className="flex w-full items-center justify-between rounded-xl border border-[#2b2d32] bg-[#1f2024] px-5 py-3 text-xs">
            <span className="text-[#9ca3af]">STAGE #{activeIndex + 1} ACTIVE</span>
            <span className="font-mono font-bold text-sm" style={{ color: active.color }}>
              {active.dpi.toLocaleString()} DPI
            </span>
          </div>
        </div>

        <div className="card-hardware p-4">
          <p className="text-xs leading-relaxed text-[#9ca3af]">
            DPI stages are stored directly in the mouse's internal memory. You can switch sensitivity at any time using the hardware DPI button without having this software running.
          </p>
        </div>
      </div>
    </div>
  );
}
