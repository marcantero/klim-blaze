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
    label: "LIGHTSPEED 2.4G",
    bus: "WIRELESS",
    icon: Wifi,
    dot: "bg-[#00f0ff]",
    text: "text-[#00f0ff]",
  },
  connected: {
    label: "USB WIRED",
    bus: "WIRED",
    icon: Usb,
    dot: "bg-emerald-400",
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
    label: "PREVIEW",
    bus: "VIRTUAL",
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
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#2b2d32]/60 bg-[#0a0a0c] px-8 select-none">
      {/* Device Identity & Active Configuration */}
      <div className="flex items-center gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-[14px] font-black tracking-wider text-white">
              {title.toUpperCase()}
            </span>
            <span className="rounded-full border border-[#2b2d32] bg-[#18191c] px-2.5 py-0.5 text-xs font-bold tracking-wider text-[#9ca3af]">
              {conn.bus}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs font-medium text-[#9ca3af]">
            <span className={`h-1.5 w-1.5 rounded-full ${conn.dot}`} />
            <span>{subtitle}</span>
          </div>
        </div>
      </div>

      {/* Hardware Telemetry: Battery Segment Bar + Protocol Link + Refresh */}
      <div className="flex items-center gap-3">
        {/* Segmented Micro-dot VU Battery Meter */}
        <button
          type="button"
          onClick={onProbeBattery}
          disabled={batteryLoading}
          title={battery?.note ?? "Probe battery status"}
          className="group flex items-center gap-3 rounded-lg border border-[#2b2d32] bg-[#18191c] px-3.5 py-2 transition-all hover:brightness-110 hover:border-[#3f424a] active:scale-[0.99] disabled:opacity-50"
        >
          <div className="flex items-center gap-1.5">
            {battery?.charging ? (
              <BatteryCharging size={14} className="text-emerald-400" />
            ) : (
              <Battery size={14} className="text-[#00f0ff]" />
            )}
            <span className="text-xs font-bold uppercase tracking-wider text-[#9ca3af]">
              BATTERY
            </span>
          </div>

          {/* 10 micro-ticks */}
          <div className="flex items-center gap-1">
            {Array.from({ length: 10 }).map((_, i) => {
              const active = i < batterySteps;
              const isLow = batteryLevel !== null && batteryLevel <= 20;
              return (
                <span
                  key={i}
                  className={`h-2.5 w-1 rounded-full transition-all ${
                    batteryLoading
                      ? "animate-pulse bg-[#00f0ff]"
                      : active
                      ? isLow
                        ? "bg-red-400 shadow-[0_0_6px_#f87171]"
                        : battery?.charging
                        ? "bg-emerald-400"
                        : "bg-[#00f0ff] shadow-[0_0_6px_rgba(0,240,255,0.4)]"
                      : "bg-[#2b2d32]"
                  }`}
                />
              );
            })}
          </div>

          <span className="font-mono text-xs font-bold min-w-[34px] text-right text-white">
            {batteryLoading ? "…" : batteryLevel !== null ? `${batteryLevel}%` : "—"}
          </span>        </button>

        {/* Link protocol status pill */}
        <div
          className="flex items-center gap-2 rounded-lg border border-[#2b2d32] bg-[#18191c] px-3.5 py-2 text-xs font-bold tracking-wider"
          title={conn.label}
        >
          <span className={`h-2 w-2 rounded-full ${conn.dot}`} />
          <ConnIcon size={13} className={conn.text} />
          <span className="text-white text-xs">{conn.label}</span>
        </div>

        {/* Scan / Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          title="Rescan hardware"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2b2d32] bg-[#18191c] text-[#9ca3af] transition-all hover:brightness-110 hover:border-[#3f424a] hover:text-white active:scale-[0.99] disabled:opacity-40"
        >
          <RefreshCw
            size={13}
            className={refreshing ? "animate-spin text-[#00f0ff]" : undefined}
          />
        </button>
      </div>
    </header>
  );
}
