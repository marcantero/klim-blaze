import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  BatteryCharging,
  BatteryMedium,
  Bell,
  Check,
  Cpu,
  Download,
  HardDrive,
  Layers,
  Plus,
  RefreshCw,
  Sliders,
  Trash2,
  Upload,
  Usb,
  Wifi,
  Zap,
} from "lucide-react";
import { downloadProfiles, parseProfiles } from "../lib/profiles";
import { triggerTestNotification } from "../lib/notifications";
import type {
  BatteryNotificationConfig,
  BatteryStatus,
  DeviceInfo,
  Profile,
} from "../types";

interface SettingsViewProps {
  devices: DeviceInfo[];
  battery: BatteryStatus | null;
  batteryLoading: boolean;
  batteryConfig: BatteryNotificationConfig;
  onChangeBatteryConfig: (config: BatteryNotificationConfig) => void;
  closeToTray: boolean;
  onChangeCloseToTray: (enabled: boolean) => void;
  autostart: boolean;
  onChangeAutostart: (enabled: boolean) => void;
  onNotifyFeedback?: (kind: "info" | "success" | "error", title: string, detail?: string) => void;
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
  batteryConfig,
  onChangeBatteryConfig,
  closeToTray,
  onChangeCloseToTray,
  autostart,
  onChangeAutostart,
  onNotifyFeedback,
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
  const [profileName, setProfileName] = useState("");
  const [testingNotification, setTestingNotification] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTestNotification = async () => {
    setTestingNotification(true);
    try {
      const sent = await triggerTestNotification(batteryConfig);
      if (sent) {
        if (batteryConfig.style === "subtle") {
          onNotifyFeedback?.("success", "Subtle Alert Triggered", "Check the bottom-right corner of your desktop.");
        } else if (batteryConfig.style === "windows") {
          onNotifyFeedback?.("success", "Windows Notification Sent", "Check your Windows Action Center.");
        } else {
          onNotifyFeedback?.("success", "Test Alerts Triggered", "Both subtle HUD and Windows notification sent.");
        }
      } else {
        onNotifyFeedback?.("info", "Alerts Unavailable", "Make sure the desktop application is running.");
      }
    } catch {
      onNotifyFeedback?.("error", "Notification Error", "Could not trigger test alert.");
    } finally {
      setTestingNotification(false);
    }
  };

  const handleSaveProfile = () => {
    if (!profileName.trim()) return;
    onSaveProfile(profileName.trim());
    setProfileName("");
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
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
  const isCharging = Boolean(battery?.charging);
  const batteryLevel = battery?.level ?? null;

  return (
    <div className="flex h-full flex-1 flex-col gap-4 overflow-y-auto pr-1 select-none">
      {/* ============================================================== */}
      {/* ROW 1: HARDWARE CONNECTION & BATTERY TELEMETRY */}
      {/* ============================================================== */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Card 1: Connected Peripheral */}
        <section className="card-hardware p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#2b2d32]/60 pb-2.5">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-[#00f0ff]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                PERIPHERAL HARDWARE
              </h2>
            </div>
            <button
              type="button"
              onClick={onRefreshDevices}
              disabled={refreshing}
              className="btn-ghub py-1 px-2.5 text-xs flex items-center gap-1.5"
              title="Rescan USB/Wireless endpoints"
            >
              <RefreshCw size={12} className={refreshing ? "animate-spin text-[#00f0ff]" : undefined} />
              <span>Rescan</span>
            </button>
          </div>

          {devices.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#2b2d32] bg-[#141518] py-6 px-4 text-center">
              <Usb size={24} className="text-[#52525b]" />
              <p className="mt-2 text-xs font-bold uppercase tracking-wider text-white">
                No Device Detected
              </p>
              <p className="mt-0.5 text-xs text-[#9ca3af]">
                Connect USB cable (PID 0x1016) or 2.4 GHz receiver (PID 0x1026).
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {devices.map((device) => (
                <div key={device.path} className="card-module p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {device.wireless ? (
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#00f0ff]/30 bg-[#00f0ff]/10 text-[#00f0ff]">
                          <Wifi size={14} />
                        </div>
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                          <Usb size={14} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-white">
                          {device.product ?? "KLIM Blaze Wireless"}
                        </p>
                        <p className="text-xs text-[#71717a]">
                          {device.wireless ? "2.4 GHz Lightspeed" : "Direct USB Cable"}
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full border border-[#2b2d32] bg-[#141518] px-2.5 py-0.5 font-mono text-xs font-bold text-[#00f0ff]">
                      {device.wireless ? "WIRELESS" : "WIRED"}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 rounded-lg border border-[#2b2d32]/60 bg-[#141518] p-2 font-mono text-xs text-[#71717a]">
                    <div>
                      <span className="block text-[#52525b]">VID</span>
                      <span className="font-bold text-white">
                        0x{device.vendorId.toString(16).toUpperCase().padStart(4, "0")}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[#52525b]">PID</span>
                      <span className="font-bold text-white">
                        0x{device.productId.toString(16).toUpperCase().padStart(4, "0")}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[#52525b]">PAGE</span>
                      <span className="font-bold text-white">
                        0x{device.usagePage.toString(16).toUpperCase().padStart(4, "0")}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[#52525b]">EP</span>
                      <span className="font-bold text-white">#{device.interfaceNumber}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Card 2: Battery Telemetry */}
        <section className="card-hardware p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#2b2d32]/60 pb-2.5">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-[#00f0ff]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                BATTERY POWER TELEMETRY
              </h2>
            </div>
            <button
              type="button"
              onClick={onProbeBattery}
              disabled={batteryLoading}
              className="btn-ghub py-1 px-2.5 text-xs flex items-center gap-1.5"
              title="Query battery level"
            >
              <RefreshCw size={12} className={batteryLoading ? "animate-spin text-[#00f0ff]" : undefined} />
              <span>Probe</span>
            </button>
          </div>

          <div className="rounded-xl border border-[#2b2d32] bg-[#141518] p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#71717a]">
                  CHARGE CAPACITY
                </span>
                <div className="mt-0.5 flex items-baseline gap-2">
                  <span
                    className={`font-mono text-4xl font-black tracking-tight ${
                      isCharging
                        ? "text-emerald-400"
                        : batteryLevel !== null && batteryLevel <= 20
                        ? "text-red-400"
                        : "text-white"
                    }`}
                  >
                    {battery?.supported && batteryLevel !== null ? `${batteryLevel}%` : "—"}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#71717a]">
                    {isCharging ? "5V VBUS" : "3.7V LI-ION"}
                  </span>
                </div>
                <p className={`text-xs font-semibold ${isCharging ? "text-emerald-400" : "text-[#9ca3af]"}`}>
                  {isCharging
                    ? "Charging (USB Cable Connected)"
                    : battery?.supported
                    ? "Operating on Battery"
                    : "Standby / Offline"}
                </p>
              </div>

              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl border ${
                  isCharging
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    : "border-[#00f0ff]/30 bg-[#00f0ff]/10 text-[#00f0ff]"
                }`}
              >
                {isCharging ? (
                  <BatteryCharging size={24} className="animate-pulse" />
                ) : (
                  <BatteryMedium size={24} />
                )}
              </div>
            </div>

            {/* 10-Step Hardware ADC Micro-Tick Meter */}
            <div className="mt-3.5 space-y-1.5">
              <div className="flex gap-1.5">
                {Array.from({ length: 10 }).map((_, idx) => {
                  const filled = idx < batteryBars;
                  const isLow = batteryLevel !== null && batteryLevel <= 20;
                  return (
                    <div
                      key={idx}
                      className={`h-2 flex-1 rounded-full transition-all duration-200 ${
                        batteryLoading
                          ? "animate-pulse bg-[#00f0ff]"
                          : filled
                          ? isCharging
                            ? "bg-emerald-400 shadow-[0_0_6px_#34d399]"
                            : isLow
                            ? "bg-red-400 shadow-[0_0_6px_#f87171]"
                            : "bg-[#00f0ff] shadow-[0_0_6px_rgba(0,240,255,0.4)]"
                          : "bg-[#2b2d32]"
                      }`}
                    />
                  );
                })}
              </div>

              <div className="flex justify-between font-mono text-xs text-[#71717a]">
                <span>0%</span>
                <span>10-STEP ADC QUANTIZATION</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ============================================================== */}
      {/* ROW 2: SYSTEM BEHAVIOR & LOW BATTERY ALERTS */}
      {/* ============================================================== */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Card 3: Windows System Integration */}
        <section className="card-hardware p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#2b2d32]/60 pb-2.5">
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-[#00f0ff]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                APPLICATION BEHAVIOR
              </h2>
            </div>
          </div>

          <div className="space-y-2.5">
            {/* Close to Tray */}
            <div className="card-module flex items-center justify-between gap-3 p-3">
              <div>
                <span className="text-xs font-bold text-white block">
                  Close to System Tray
                </span>
                <p className="text-xs text-[#71717a]">
                  Keeps the app active in the background for battery polling and alerts.
                </p>
              </div>

              <label className="relative inline-flex cursor-pointer items-center shrink-0">
                <input
                  type="checkbox"
                  checked={closeToTray}
                  onChange={(e) => onChangeCloseToTray(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-5 w-9 rounded-full bg-[#2b2d32] after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#00f0ff] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none" />
              </label>
            </div>

            {/* Start with Windows */}
            <div className="card-module flex items-center justify-between gap-3 p-3">
              <div>
                <span className="text-xs font-bold text-white block">
                  Start with Windows
                </span>
                <p className="text-xs text-[#71717a]">
                  Silently launch in the system tray on Windows startup.
                </p>
              </div>

              <label className="relative inline-flex cursor-pointer items-center shrink-0">
                <input
                  type="checkbox"
                  checked={autostart}
                  onChange={(e) => onChangeAutostart(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-5 w-9 rounded-full bg-[#2b2d32] after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#00f0ff] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none" />
              </label>
            </div>
          </div>
        </section>

        {/* Card 4: Battery Warning HUD & Alerts */}
        <section className="card-hardware p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#2b2d32]/60 pb-2.5">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-[#00f0ff]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                LOW BATTERY ALERTS
              </h2>
            </div>

            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={batteryConfig.enabled}
                onChange={(e) =>
                  onChangeBatteryConfig({ ...batteryConfig, enabled: e.target.checked })
                }
                className="peer sr-only"
              />
              <div className="peer h-5 w-9 rounded-full bg-[#2b2d32] after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#00f0ff] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none" />
            </label>
          </div>

          <div
            className={`space-y-3 transition-opacity duration-150 ${
              !batteryConfig.enabled ? "pointer-events-none opacity-35" : ""
            }`}
          >
            {/* Style Selector */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-[#9ca3af] block">
                Presentation Style
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChangeBatteryConfig({ ...batteryConfig, style: "subtle" })}
                  className={`flex items-center justify-between rounded-lg border p-2 text-left transition-all duration-150 hover:brightness-110 active:scale-[0.99] ${
                    batteryConfig.style === "subtle"
                      ? "border-[#00f0ff] bg-[#00f0ff]/15 text-white shadow-[0_0_8px_rgba(0,240,255,0.2)]"
                      : "border-[#2b2d32] bg-[#141518] text-[#9ca3af] hover:border-[#3f424a] hover:text-white"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold block text-white">Subtle HUD</span>
                    <span className="text-xs text-[#71717a]">Floating desktop pill</span>
                  </div>
                  {batteryConfig.style === "subtle" && <Check size={14} className="text-[#00f0ff]" />}
                </button>

                <button
                  type="button"
                  onClick={() => onChangeBatteryConfig({ ...batteryConfig, style: "windows" })}
                  className={`flex items-center justify-between rounded-lg border p-2 text-left transition-all duration-150 hover:brightness-110 active:scale-[0.99] ${
                    batteryConfig.style === "windows"
                      ? "border-[#00f0ff] bg-[#00f0ff]/15 text-white shadow-[0_0_8px_rgba(0,240,255,0.2)]"
                      : "border-[#2b2d32] bg-[#141518] text-[#9ca3af] hover:border-[#3f424a] hover:text-white"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold block text-white">Windows Toast</span>
                    <span className="text-xs text-[#71717a]">Action Center banner</span>
                  </div>
                  {batteryConfig.style === "windows" && <Check size={14} className="text-[#00f0ff]" />}
                </button>
              </div>
            </div>

            {/* Threshold & Test Trigger */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-[#9ca3af] mr-1">Threshold:</span>
                {[10, 20, 30, 40].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onChangeBatteryConfig({ ...batteryConfig, threshold: val })}
                    className={`rounded-lg border px-2.5 py-1 font-mono text-xs font-bold transition-all duration-150 hover:brightness-110 active:scale-[0.99] ${
                      batteryConfig.threshold === val
                        ? "border-[#00f0ff] bg-[#00f0ff]/15 text-white"
                        : "border-[#2b2d32] bg-[#141518] text-[#9ca3af] hover:border-[#3f424a] hover:text-white"
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleTestNotification}
                disabled={testingNotification}
                className="btn-ghub py-1 px-3 text-xs flex items-center gap-1.5"
              >
                <Bell size={12} className={testingNotification ? "animate-spin text-[#00f0ff]" : undefined} />
                <span>{testingNotification ? "Testing..." : "Test Alert"}</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* ============================================================== */}
      {/* ROW 3: PROFILE BANK */}
      {/* ============================================================== */}
      <section className="card-hardware p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2b2d32]/60 pb-2.5">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-[#00f0ff]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              PROFILE BANK
            </h2>
            <span className="rounded-full bg-[#141518] border border-[#2b2d32] px-2 py-0.2 font-mono text-xs font-bold text-[#00f0ff]">
              {profiles.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              className="btn-ghub py-1 px-2.5 text-xs flex items-center gap-1.5"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={12} />
              <span>Import JSON</span>
            </button>
            <button
              type="button"
              className="btn-ghub py-1 px-2.5 text-xs flex items-center gap-1.5"
              onClick={() => downloadProfiles(profiles)}
              disabled={profiles.length === 0}
            >
              <Download size={12} />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Save Current Profile Strip */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={profileName}
            onChange={(event) => setProfileName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSaveProfile();
            }}
            placeholder="New profile name (e.g. CS2, Valorant, Work Mode)"
            maxLength={60}
            className="field-ghub flex-1 text-xs py-2"
          />
          <button
            type="button"
            className="btn-ghub-primary py-2 px-4 text-xs flex items-center gap-1.5 shrink-0"
            onClick={handleSaveProfile}
            disabled={!profileName.trim()}
          >
            <Plus size={13} />
            <span>Save Current Profile</span>
          </button>
        </div>

        {/* Profiles Grid */}
        {profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#2b2d32] bg-[#141518] py-6 px-4 text-center">
            <HardDrive size={24} className="text-[#52525b]" />
            <p className="mt-2 text-xs font-bold uppercase tracking-wider text-white">
              No Profiles Saved
            </p>
            <p className="mt-0.5 text-xs text-[#9ca3af]">
              Save profiles to quickly switch DPI stages and lighting colors.
            </p>
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="card-module flex flex-col justify-between gap-2.5 p-3 hover:border-[#3f424a]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full border border-white/20 shadow-sm"
                      style={{
                        backgroundColor: profile.lighting.color
                          ? `rgb(${profile.lighting.color.r}, ${profile.lighting.color.g}, ${profile.lighting.color.b})`
                          : "#00f0ff",
                      }}
                    />
                    <span className="truncate text-xs font-bold text-white uppercase">
                      {profile.name}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteProfile(profile.id)}
                    title="Delete profile"
                    className="text-[#71717a] transition-colors hover:text-red-400 p-0.5"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-[#2b2d32]/60 bg-[#141518] px-2.5 py-1.5 text-xs">
                  <span className="text-[#9ca3af]">
                    {profile.dpi.stages.length} DPI Stages
                  </span>
                  <span className="font-mono font-bold text-[#00f0ff]">
                    {profile.dpi.pollingRate} Hz
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#2b2d32]/60">
                  <span className="text-xs text-[#71717a]">
                    {formatDate(profile.updatedAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onLoadProfile(profile)}
                    className="btn-ghub py-1 px-2.5 text-xs text-[#00f0ff] hover:text-white"
                  >
                    Load
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
