import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  BatteryCharging,
  BatteryMedium,
  Download,
  HardDrive,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  Usb,
  Wifi,
  Cpu,
  Sliders,
} from "lucide-react";
import { downloadProfiles, parseProfiles } from "../lib/profiles";
import type { BatteryStatus, DeviceInfo, Profile } from "../types";

interface SettingsViewProps {
  devices: DeviceInfo[];
  battery: BatteryStatus | null;
  batteryLoading: boolean;
  refreshing: boolean;
  onRefreshDevices: () => void;
  onProbeBattery: () => void;
  profiles: Profile[];
  onSaveProfile: (name: string) => void;
  onLoadProfile: (profile: Profile) => void;
  onDeleteProfile: (id: string) => void;
  onImportProfiles: (profiles: Profile[]) => void;
  onImportFailed: () => void;
}

function formatDate(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function SettingsView({
  devices,
  battery,
  batteryLoading,
  refreshing,
  onRefreshDevices,
  onProbeBattery,
  profiles,
  onSaveProfile,
  onLoadProfile,
  onDeleteProfile,
  onImportProfiles,
  onImportFailed,
}: SettingsViewProps) {
  const [name, setName] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const save = () => {
    if (!name.trim()) return;
    onSaveProfile(name);
    setName("");
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const parsed = parseProfiles(await file.text());
    if (parsed.length === 0) {
      onImportFailed();
      return;
    }
    onImportProfiles(parsed);
  };

  const batteryBars = Math.min(10, Math.max(0, Math.round((battery?.level ?? 0) / 10)));

  return (
    <div className="grid h-full flex-1 gap-6 lg:grid-cols-2 content-start">
      {/* Connected Hardware Card */}
      <section className="card-hardware p-6">
        <div className="mb-5 flex items-center justify-between border-b border-[#2b2d32]/60 pb-4">
          <div className="flex items-center gap-2">
            <Cpu size={18} className="text-[#00f0ff]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              CONNECTED PERIPHERALS
            </h2>
          </div>
          <button
            type="button"
            onClick={onRefreshDevices}
            disabled={refreshing}
            className="btn-ghub"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin text-[#00f0ff]" : undefined} />
            Rescan
          </button>
        </div>

        {devices.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#2b2d32] bg-[#141518] px-4 py-8 text-center">
            <Usb size={22} className="mx-auto text-[#71717a]" />
            <p className="mt-2 text-sm font-bold text-white">No Device Detected</p>
            <p className="mt-1 text-xs text-[#9ca3af]">
              Connect the USB cable (PID 0x1016) or the 2.4 GHz wireless receiver (PID 0x1026).
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <div
                key={device.path}
                className="card-module flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {device.wireless ? (
                      <Wifi size={16} className="shrink-0 text-[#00f0ff]" />
                    ) : (
                      <Usb size={16} className="shrink-0 text-emerald-400" />
                    )}
                    <span className="truncate text-sm font-bold text-white">
                      {device.product ?? "KLIM Blaze Wireless Mouse"}
                    </span>
                  </div>
                  <span className="rounded-full bg-[#141518] border border-[#2b2d32] px-3 py-0.5 text-[10px] font-bold text-[#9ca3af]">
                    {device.wireless ? "2.4 GHz Lightspeed" : "Direct USB Cable"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 font-mono text-[11px] text-[#71717a] sm:grid-cols-4 pt-1">
                  <div>VID: <span className="text-[#e4e4e7]">0x{device.vendorId.toString(16).toUpperCase().padStart(4, "0")}</span></div>
                  <div>PID: <span className="text-[#e4e4e7]">0x{device.productId.toString(16).toUpperCase().padStart(4, "0")}</span></div>
                  <div>PAGE: <span className="text-[#e4e4e7]">0x{device.usagePage.toString(16).toUpperCase().padStart(4, "0")}</span></div>
                  <div>IFACE: <span className="text-[#e4e4e7]">#{device.interfaceNumber}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Battery State Card */}
      <section className="card-hardware p-6">
        <div className="mb-5 flex items-center justify-between border-b border-[#2b2d32]/60 pb-4">
          <div className="flex items-center gap-2">
            <BatteryMedium size={18} className="text-[#00f0ff]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              BATTERY POWER TELEMETRY
            </h2>
          </div>
          <button
            type="button"
            onClick={onProbeBattery}
            disabled={batteryLoading}
            className="btn-ghub"
          >
            <RefreshCw size={13} className={batteryLoading ? "animate-spin text-[#00f0ff]" : undefined} />
            Probe
          </button>
        </div>

        <div className="rounded-xl border border-[#2b2d32] bg-[#141518] p-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#71717a]">
                LI-ION CELL CAPACITY
              </span>
              <p className="mt-1 font-mono text-4xl font-extrabold text-white">
                {battery?.supported && battery.level !== null ? `${battery.level}%` : "—"}
              </p>
              <p className="mt-0.5 text-xs text-[#9ca3af]">
                {battery?.charging
                  ? "Charging (5V VBUS Active)"
                  : battery?.supported
                  ? "Battery Powered (3.7V Nominal)"
                  : "Standby"}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20">
              {battery?.charging ? <BatteryCharging size={24} /> : <BatteryMedium size={24} />}
            </div>
          </div>

          {/* Segmented Micro-dot VU Battery Meter */}
          <div className="mt-5 space-y-2">
            <div className="flex gap-1.5">
              {Array.from({ length: 10 }).map((_, idx) => {
                const filled = idx < batteryBars;
                return (
                  <div
                    key={idx}
                    className={`h-2 flex-1 rounded-full transition-all duration-200 ${
                      filled
                        ? battery?.charging
                          ? "bg-emerald-400"
                          : idx < 2
                          ? "bg-red-400"
                          : "bg-[#00f0ff]"
                        : "bg-[#2b2d32]"
                    }`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] font-mono text-[#71717a]">
              <span>0%</span>
              <span>10-STEP HARDWARE ADC QUANTIZATION</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-[#9ca3af]">
          The Compx mouse controller reports battery charge discretely in 10% steps (0..10) via HID command 0x04 to prevent voltage drop fluctuations under motor and movement load.
        </p>
      </section>

      {/* Profiles Management Card */}
      <section className="card-hardware p-6 lg:col-span-2">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#2b2d32]/60 pb-4">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-[#00f0ff]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              PROFILE BANK
            </h2>
          </div>
          <div className="flex gap-2">
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              onChange={handleFile}
              className="hidden"
            />
            <button
              type="button"
              className="btn-ghub"
              onClick={() => fileInput.current?.click()}
            >
              <Upload size={13} />
              Import JSON
            </button>
            <button
              type="button"
              className="btn-ghub"
              onClick={() => downloadProfiles(profiles)}
              disabled={profiles.length === 0}
            >
              <Download size={13} />
              Export JSON
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") save();
            }}
            placeholder="Profile name (e.g. CS2, Valorant, Work)"
            maxLength={60}
            className="field-ghub flex-1 text-sm py-2"
          />
          <button
            type="button"
            className="btn-ghub-primary"
            onClick={save}
            disabled={!name.trim()}
          >
            <Plus size={14} />
            Save Current Profile
          </button>
        </div>

        {profiles.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-[#2b2d32] bg-[#141518] px-4 py-8 text-center">
            <HardDrive size={22} className="mx-auto text-[#71717a]" />
            <p className="mt-2 text-sm font-bold text-white">No Profiles Saved</p>
            <p className="mt-1 text-xs text-[#9ca3af]">
              Create custom profiles for different games or applications to instantly recall lighting and sensitivity settings.
            </p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-[#24262c] overflow-hidden rounded-xl border border-[#2b2d32]">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-[#18191c] px-5 py-3.5 transition-colors hover:bg-[#1f2024]"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border border-white/20"
                    style={{ backgroundColor: profile.lighting.color ? `rgb(${profile.lighting.color.r}, ${profile.lighting.color.g}, ${profile.lighting.color.b})` : "#00f0ff" }}
                  />
                  <div>
                    <p className="text-xs font-bold text-white uppercase">{profile.name}</p>
                    <p className="text-[11px] text-[#71717a]">
                      {formatDate(profile.updatedAt)} • {profile.dpi.stages.length} DPI Stages • {profile.dpi.pollingRate} Hz
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn-ghub text-[#00f0ff] hover:text-white"
                    onClick={() => onLoadProfile(profile)}
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    className="btn-ghub text-red-400 hover:text-red-300"
                    onClick={() => onDeleteProfile(profile.id)}
                    title="Delete profile"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
