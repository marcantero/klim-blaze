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
    <div className="grid h-full flex-1 gap-6 lg:grid-cols-2 font-mono content-start">
      {/* Device Hardware Info Panel */}
      <section className="panel-instrument p-5">
        <div className="mb-4 flex items-center justify-between border-b border-[#1b2230] pb-3">
          <span className="text-[10px] font-bold tracking-widest text-[#00b8fc]">
            [ 04 // CONNECTED HARDWARE BUS ]
          </span>
          <button
            type="button"
            onClick={onRefreshDevices}
            disabled={refreshing}
            className="btn px-2.5 py-1 text-[11px]"
          >
            <RefreshCw size={11} className={refreshing ? "animate-spin text-[#00b8fc]" : undefined} />
            SCAN BUS
          </button>
        </div>

        {devices.length === 0 ? (
          <div className="border border-dashed border-[#1f2636] bg-[#07090e] px-4 py-8 text-center">
            <Usb size={20} className="mx-auto text-[#4d576e]" />
            <p className="mt-2 text-xs font-bold text-white">NO DEVICE DETECTED</p>
            <p className="mt-1 text-[10px] text-[#55627a]">
              Connect the USB cable (PID 0x1016) or the 2.4 GHz wireless receiver (PID 0x1026).
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {devices.map((device) => (
              <div
                key={device.path}
                className="border border-[#1b2230] bg-[#07090e] p-3 transition-colors hover:border-[#2b354c]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {device.wireless ? (
                      <Wifi size={14} className="shrink-0 text-[#00b8fc]" />
                    ) : (
                      <Usb size={14} className="shrink-0 text-emerald-400" />
                    )}
                    <span className="truncate text-xs font-bold text-white">
                      {device.product ?? "KLIM Blaze Wireless Mouse"}
                    </span>
                  </div>
                  <span className="badge-tech text-[#00b8fc]">
                    {device.wireless ? "RF 2.4 GHz" : "USB DIRECT"}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 text-[9px] text-[#55627a] sm:grid-cols-4">
                  <div>VID: <span className="text-white">0x{device.vendorId.toString(16).toUpperCase().padStart(4, "0")}</span></div>
                  <div>PID: <span className="text-white">0x{device.productId.toString(16).toUpperCase().padStart(4, "0")}</span></div>
                  <div>PAGE: <span className="text-white">0x{device.usagePage.toString(16).toUpperCase().padStart(4, "0")}</span></div>
                  <div>IFACE: <span className="text-white">#{device.interfaceNumber}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Battery State Instrument Panel */}
      <section className="panel-instrument p-5">
        <div className="mb-4 flex items-center justify-between border-b border-[#1b2230] pb-3">
          <span className="text-[10px] font-bold tracking-widest text-[#00b8fc]">
            [ BATTERY POWER TELEMETRY ]
          </span>
          <button
            type="button"
            onClick={onProbeBattery}
            disabled={batteryLoading}
            className="btn px-2.5 py-1 text-[11px]"
          >
            <RefreshCw size={11} className={batteryLoading ? "animate-spin text-[#00b8fc]" : undefined} />
            PROBE
          </button>
        </div>

        <div className="border border-[#1b2230] bg-[#07090e] p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#55627a]">
                LI-ION CELL CAPACITY
              </span>
              <p className="mt-1 font-mono text-4xl font-extrabold text-white">
                {battery?.supported && battery.level !== null ? `${battery.level}%` : "—"}
              </p>
              <p className="mt-0.5 text-[10px] text-[#5c6984]">
                {battery?.charging
                  ? "CHARGING (5V VBUS ACTIVE)"
                  : battery?.supported
                    ? "BATTERY VOLTAGE 3.7V - 4.2V"
                    : "STANDBY"}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center border border-[#1f2636] bg-[#0c0f16] text-[#00b8fc]">
              {battery?.charging ? <BatteryCharging size={20} /> : <BatteryMedium size={20} />}
            </div>
          </div>

          {/* Segmented 10-step battery bar matching mouse hardware 10-step ADC */}
          <div className="mt-4 space-y-2">
            <div className="flex gap-1">
              {Array.from({ length: 10 }).map((_, idx) => {
                const filled = idx < batteryBars;
                return (
                  <div
                    key={idx}
                    className={`h-2 flex-1 rounded-none transition-all ${filled
                        ? battery?.charging
                          ? "bg-emerald-400 shadow-[0_0_6px_#34d399]"
                          : idx < 2
                            ? "bg-red-400 shadow-[0_0_6px_#f87171]"
                            : "bg-[#00b8fc] shadow-[0_0_6px_#00b8fc]"
                        : "bg-[#141823]"
                      }`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-[8px] text-[#4d576e]">
              <span>STEP 00</span>
              <span>10-STEP HARDWARE ADC QUANTIZATION</span>
              <span>STEP 10</span>
            </div>
          </div>
        </div>

        <p className="mt-3 text-[10px] leading-relaxed text-[#55637e]">
          The Compx mouse controller reports battery charge discretely in 10% steps (0..10) via HID command 0x04 to prevent voltage drop fluctuations under motor and movement load.
        </p>
      </section>

      {/* Profiles Management Rack Panel */}
      <section className="panel-instrument p-5 lg:col-span-2">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#1b2230] pb-3">
          <span className="text-[10px] font-bold tracking-widest text-[#00b8fc]">
            [ CONFIGURATION PROFILE BANK ]
          </span>
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
              className="btn px-2.5 py-1 text-[11px]"
              onClick={() => fileInput.current?.click()}
            >
              <Upload size={11} />
              IMPORT JSON
            </button>
            <button
              type="button"
              className="btn px-2.5 py-1 text-[11px]"
              onClick={() => downloadProfiles(profiles)}
              disabled={profiles.length === 0}
            >
              <Download size={11} />
              EXPORT JSON
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
            placeholder="PROFILE NAME (E.G. CS2, VALORANT, CAD)"
            maxLength={60}
            className="field flex-1"
          />
          <button
            type="button"
            className="btn btn-primary px-3 py-1.5 text-[11px]"
            onClick={save}
            disabled={!name.trim()}
          >
            <Plus size={12} />
            SAVE ACTIVE PROFILE
          </button>
        </div>

        {profiles.length === 0 ? (
          <div className="mt-4 border border-dashed border-[#1f2636] bg-[#07090e] px-4 py-8 text-center">
            <HardDrive size={20} className="mx-auto text-[#4b556b]" />
            <p className="mt-2 text-xs font-bold text-white">NO PROFILES SAVED ON DISK</p>
            <p className="mt-1 text-[10px] text-[#55627a]">
              Create custom profiles for different games or applications to instantly recall lighting and sensitivity settings.
            </p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-[#171c26] border border-[#1b2230]">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-[#07090e] px-4 py-2.5 transition-colors hover:bg-[#0f121a]"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-none border border-white/20"
                    style={{ backgroundColor: profile.lighting.color ? `rgb(${profile.lighting.color.r}, ${profile.lighting.color.g}, ${profile.lighting.color.b})` : "#00b8fc" }}
                  />
                  <div>
                    <p className="text-xs font-bold text-white uppercase">{profile.name}</p>
                    <p className="text-[10px] text-[#55637e]">
                      {formatDate(profile.updatedAt)} // {profile.dpi.stages.length} STAGES // {profile.dpi.pollingRate} HZ
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn px-2.5 py-1 text-[11px] text-[#00b8fc]"
                    onClick={() => onLoadProfile(profile)}
                  >
                    LOAD
                  </button>
                  <button
                    type="button"
                    className="btn px-2 py-1 text-[11px] text-red-400 hover:text-red-300"
                    onClick={() => onDeleteProfile(profile.id)}
                    title="Delete profile"
                  >
                    <Trash2 size={11} />
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
