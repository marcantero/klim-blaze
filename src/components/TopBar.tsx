import {
  Battery,
  BatteryCharging,
  Monitor,
  RefreshCw,
  Unplug,
  Usb,
  Wifi,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BatteryStatus, ConnectionState } from "../types";

interface TopBarProps {
  title: string;
  subtitle: string;
  connection: ConnectionState;
  battery: BatteryStatus | null;
  batteryLoading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onProbeBattery: () => void;
}

const CONNECTION_META: Record<
  ConnectionState,
  { label: string; bus: string; icon: LucideIcon; dot: string; text: string }
> = {
  wireless: {
    label: "2.4G LIGHTSPEED",
    bus: "PID 0x1026",
    icon: Wifi,
    dot: "bg-[#00b8fc] shadow-[0_0_6px_#00b8fc]",
    text: "text-[#00b8fc]",
  },
  connected: {
    label: "USB DIRECT BUS",
    bus: "PID 0x1016",
    icon: Usb,
    dot: "bg-emerald-400 shadow-[0_0_6px_#34d399]",
    text: "text-emerald-400",
  },
  disconnected: {
    label: "OFFLINE",
    bus: "DISCONNECTED",
    icon: Unplug,
    dot: "bg-amber-400",
    text: "text-amber-400",
  },
  preview: {
    label: "EMULATOR",
    bus: "VIRTUAL BUS",
    icon: Monitor,
    dot: "bg-zinc-500",
    text: "text-zinc-400",
  },
};

export default function TopBar({
  title,
  subtitle,
  connection,
  battery,
  batteryLoading,
  refreshing,
  onRefresh,
  onProbeBattery,
}: TopBarProps) {
  const conn = CONNECTION_META[connection];
  const ConnIcon = conn.icon;
  const batteryLevel = battery?.level ?? null;
  const batterySteps = batteryLevel !== null ? Math.round(batteryLevel / 10) : 0;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#1b212e] bg-[#090b10] px-6 select-none font-mono">
      {/* Device brand & technical index */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-2">
            <span className="font-sans text-[13px] font-black tracking-[0.16em] text-white">
              {title.toUpperCase()}
            </span>
            <span className="text-[10px] font-mono tracking-widest text-[#00b8fc]">
              // INSTRUMENT
            </span>
          </div>
          <span className="badge-tech text-[#7c879c]">
            {conn.bus}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-2 border-l border-[#1a202c] pl-4 text-[10px] text-[#606b82]">
          <span className="h-1.5 w-1.5 rounded-none bg-emerald-400" />
          <span className="font-sans uppercase tracking-wider">{subtitle}</span>
        </div>
      </div>

      {/* Hardware Telemetry: Battery Segment Bar + Protocol Link + Refresh */}
      <div className="flex items-center gap-2.5">
        {/* Discrete Hardware Battery Cell Segment Meter */}
        <button
          type="button"
          onClick={onProbeBattery}
          disabled={batteryLoading}
          title={battery?.note ?? "Probe battery ADC voltage telemetry"}
          className="group flex items-center gap-3 rounded-none border border-[#1d2331] bg-[#0c0e14] px-3 py-1.5 text-xs transition-all hover:border-[#2d374d] hover:bg-[#11141d] disabled:opacity-50"
        >
          <div className="flex items-center gap-1.5">
            {battery?.charging ? (
              <BatteryCharging size={13} className="text-emerald-400" />
            ) : (
              <Battery size={13} className="text-[#00b8fc]" />
            )}
            <span className="text-[10px] uppercase tracking-wider text-[#636e84]">
              BAT:
            </span>
          </div>

          {/* 10 physical segments */}
          <div className="flex items-center gap-[2px]">
            {Array.from({ length: 10 }).map((_, i) => {
              const active = i < batterySteps;
              const isLow = batteryLevel !== null && batteryLevel <= 20;
              return (
                <span
                  key={i}
                  className={`h-2.5 w-1 rounded-none transition-all ${
                    batteryLoading
                      ? "animate-pulse bg-[#00b8fc]"
                      : active
                      ? isLow
                        ? "bg-red-400 shadow-[0_0_4px_#f87171]"
                        : battery?.charging
                        ? "bg-emerald-400 shadow-[0_0_4px_#34d399]"
                        : "bg-[#00b8fc] shadow-[0_0_4px_#00b8fc]"
                      : "bg-[#181d28]"
                  }`}
                />
              );
            })}
          </div>

          <span className="font-mono text-[11px] font-bold text-white min-w-[32px] text-right">
            {batteryLoading ? "..." : batteryLevel !== null ? `${batteryLevel}%` : "N/A"}
          </span>
        </button>

        {/* Link protocol badge */}
        <div
          className="flex items-center gap-2 rounded-none border border-[#1d2331] bg-[#0c0e14] px-3 py-1.5 text-[10px] font-bold tracking-wider"
          title={conn.label}
        >
          <span className={`h-1.5 w-1.5 rounded-none ${conn.dot}`} />
          <ConnIcon size={12} className={conn.text} />
          <span className={conn.text}>{conn.label}</span>
        </div>

        {/* Scan / Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          title="Rescan USB/HID hardware bus"
          className="flex h-7 w-7 items-center justify-center rounded-none border border-[#1d2331] bg-[#0c0e14] text-[#69748b] transition-all hover:border-[#2f394f] hover:bg-[#121620] hover:text-white disabled:opacity-40"
        >
          <RefreshCw
            size={12}
            className={refreshing ? "animate-spin text-[#00b8fc]" : undefined}
          />
        </button>
      </div>
    </header>
  );
}
