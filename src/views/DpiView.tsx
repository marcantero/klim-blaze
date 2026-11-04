import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import MousePreview from "../components/MousePreview";
import type { DpiState, PollingRate } from "../types";

const MIN_DPI = 200;
const MAX_DPI = 10000;
const STAGE_COLORS = [
  "#00b8fc", // Logitech / Industrial Cyan
  "#a855f7", // Violet
  "#f97316", // Amber
  "#22c55e", // Green
  "#eab308", // Yellow
  "#ec4899", // Magenta
  "#14b8a6", // Teal
  "#ef4444", // Red
];

const POLLING_OPTIONS: Array<{ hz: PollingRate; ms: string; label: string; register: string }> = [
  { hz: 125, ms: "8.0 ms", label: "STANDARD", register: "0x01" },
  { hz: 250, ms: "4.0 ms", label: "BALANCED", register: "0x02" },
  { hz: 500, ms: "2.0 ms", label: "ESPORTS", register: "0x03" },
  { hz: 1000, ms: "1.0 ms", label: "EXTREME", register: "0x04" },
];

const TICKS = [200, 2000, 4000, 6000, 8000, 10000];

function clampDpi(value: number): number {
  if (!Number.isFinite(value)) return MIN_DPI;
  return Math.min(MAX_DPI, Math.max(MIN_DPI, Math.round(value / 100) * 100));
}

interface DpiViewProps {
  dpi: DpiState;
  onChange: (dpi: DpiState) => void;
  onApply: () => void;
}

export default function DpiView({ dpi, onChange, onApply }: DpiViewProps) {
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
    <div className="grid h-full flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_440px] font-mono">
      {/* Settings Column */}
      <div className="flex flex-col justify-between space-y-4">
        <div className="space-y-4">
          {/* Main DPI Speedometer & Stages */}
          <section className="panel-instrument p-5">
          <div className="mb-4 flex items-center justify-between border-b border-[#1b2230] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest text-[#00b8fc]">
                [ 02 // SENSOR CALIBRATION ]
              </span>
            </div>
            <span className="text-[10px] text-[#55637e]">
              STAGE {activeIndex + 1} OF {dpi.stages.length}
            </span>
          </div>

          {/* Large Hero Digital Readout */}
          <div className="mb-5 flex items-baseline justify-between border border-[#1b2230] bg-[#07090e] p-5">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#596680]">
                ACTIVE SENSITIVITY // PMW3325
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span
                  className="font-mono text-5xl font-black tracking-tight"
                  style={{ color: active.color }}
                >
                  {active.dpi.toLocaleString()}
                </span>
                <span className="text-xs font-bold tracking-widest text-[#616f8b]">
                  DPI
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label
                className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-none border border-[#212838] bg-[#0c0f16] transition-colors hover:border-[#00b8fc]"
                title="Change stage dot color"
              >
                <span
                  className="h-3.5 w-3.5 rounded-none"
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
                className="w-24 border border-[#212838] bg-[#0c0f16] px-2 py-1.5 text-right font-mono text-sm font-bold text-white outline-none focus:border-[#00b8fc]"
                aria-label="DPI value"
              />
            </div>
          </div>

          {/* Stepped Stage Selectors */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {dpi.stages.map((stage, index) => {
                const selected = index === activeIndex;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => onChange({ ...dpi, activeIndex: index })}
                    className={`flex items-center gap-2 rounded-none border px-3 py-1.5 text-xs font-bold transition-all ${
                      selected
                        ? "border-[#00b8fc] bg-[#00b8fc]/10 text-white"
                        : "border-[#1b2230] bg-[#090b10] text-[#717e97] hover:border-[#2b354d] hover:text-white"
                    }`}
                  >
                    <span
                      className="h-2 w-2 rounded-none"
                      style={{
                        backgroundColor: stage.color,
                        boxShadow: selected ? `0 0 6px ${stage.color}` : "none",
                      }}
                    />
                    <span className="font-mono">{stage.dpi.toLocaleString()}</span>
                  </button>
                );
              })}
            </div>

            {/* Continuous Precision Slider Track */}
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
                className="h-1.5 w-full appearance-none rounded-none bg-[#1b2230] cursor-pointer"
                style={{ accentColor: active.color }}
                aria-label="DPI slider"
              />
              <div className="mt-2 flex justify-between text-[8px] font-mono text-[#4b556b]">
                {TICKS.map((tick) => (
                  <span key={tick}>{tick.toLocaleString()}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Stage Controls: Add / Remove */}
          <div className="mt-5 flex items-center justify-between border-t border-[#1b2230] pt-3">
            <div className="flex gap-2">
              <button
                type="button"
                className="btn px-2.5 py-1 text-[11px]"
                onClick={addStage}
                disabled={dpi.stages.length >= 8}
              >
                <Plus size={12} />
                ADD STAGE
              </button>
              <button
                type="button"
                className="btn px-2.5 py-1 text-[11px]"
                onClick={removeStage}
                disabled={dpi.stages.length <= 1}
              >
                <Trash2 size={12} />
                DELETE
              </button>
            </div>
            <span className="text-[9px] text-[#55617a]">
              MAX: 08 STAGES // RAM
            </span>
          </div>
        </section>

        {/* Polling Rate (Mechanical Stepped Selector Switch) */}
        <section className="panel-instrument p-5">
          <div className="mb-4 flex items-center justify-between border-b border-[#1b2230] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest text-[#00b8fc]">
                [ USB BUS RATE // REPORT FREQ ]
              </span>
            </div>
            <span className="badge-tech text-[#00b8fc]">
              {dpi.pollingRate} HZ
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {POLLING_OPTIONS.map(({ hz, ms, label, register }) => {
              const selected = dpi.pollingRate === hz;
              return (
                <button
                  key={hz}
                  type="button"
                  onClick={() => onChange({ ...dpi, pollingRate: hz })}
                  className={`flex flex-col items-start gap-1 rounded-none border p-3 transition-all ${
                    selected
                      ? "border-[#00b8fc] bg-[#00b8fc]/10 text-white"
                      : "border-[#1b2230] bg-[#090b10] hover:border-[#2b354d] text-[#6d7992] hover:text-white"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-[8px] text-[#48536b]">{register}</span>
                    <span
                      className={`h-1.5 w-1.5 rounded-none ${
                        selected ? "bg-[#00b8fc] shadow-[0_0_6px_#00b8fc]" : "bg-[#181d28]"
                      }`}
                    />
                  </div>
                  <span className="font-mono text-sm font-black text-white">
                    {hz} <span className="text-[10px] font-normal text-[#65728c]">Hz</span>
                  </span>
                  <div className="flex w-full items-center justify-between text-[9px]">
                    <span className={selected ? "text-[#00b8fc] font-bold" : "text-[#5e6b84]"}>
                      {ms}
                    </span>
                    <span className="text-[8px] text-[#4d5971]">{label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
        </div>

        {/* Bus Commit Action Panel */}
        <div className="flex items-center justify-between border border-[#1b2230] bg-[#0a0c12] p-3.5 mt-auto">
          <div className="flex items-center gap-2 text-[10px] text-[#63708a]">
            <span className="h-1.5 w-1.5 rounded-none bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            <span>DIRECT REG WRITE // SENSOR</span>
          </div>
          <button type="button" className="btn btn-primary px-3.5 py-1.5 text-[11px]" onClick={onApply}>
            APPLY // 0x55
          </button>
        </div>
      </div>

      {/* Visual Mouse Preview Column */}
      <div className="flex flex-col h-full space-y-4">
        <div className="panel-instrument corner-reticle flex flex-1 flex-col items-center justify-between p-6">
          <div className="flex w-full items-center justify-between border-b border-[#1b2230] pb-2 text-[10px] text-[#55637e]">
            <span>PMW3325 OPTICAL SENSOR</span>
            <span>AXIS: X/Y 1:1</span>
          </div>

          <div className="my-auto flex w-full flex-1 items-center justify-center py-4">
            <MousePreview
              color={active.color}
              mode={0}
              speed={6}
              showViewToggle={true}
              className="w-full max-w-sm xl:max-w-md"
            />
          </div>

          <div className="flex w-full items-center justify-between border border-[#1b2230] bg-[#07090e] px-4 py-2.5 text-[10px]">
            <span className="text-[#67748e]">STAGE #{activeIndex + 1} ACTIVE</span>
            <span className="font-mono font-bold text-sm" style={{ color: active.color }}>
              {active.dpi.toLocaleString()} DPI
            </span>
          </div>
        </div>

        <div className="border border-[#1b2230] bg-[#090b10] p-4 text-[10px] leading-relaxed text-[#59667f]">
          <span className="font-bold text-[#00b8fc] block mb-1">
            // HARDWARE EEPROM NOTICE
          </span>
          Sensitivity stages are written directly to on-board MCU memory. You can switch stages using the mouse DPI button without any background software running.
        </div>
      </div>
    </div>
  );
}
