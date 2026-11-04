import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Toast from "./components/Toast";
import DpiView from "./views/DpiView";
import KeyBindingsView from "./views/KeyBindingsView";
import LightingView from "./views/LightingView";
import SettingsView from "./views/SettingsView";
import { useDebouncedEffect } from "./hooks/useDebouncedEffect";
import {
  applyRgb,
  getBatteryStatus,
  isTauri,
  listDevices,
  setDpiLevels,
  setPollingRate,
} from "./lib/api";
import { loadProfiles, makeProfile, persistProfiles } from "./lib/profiles";
import {
  DEFAULT_DPI,
  DEFAULT_LIGHTING,
  accentStyle,
  rgbToHex,
  type BatteryStatus,
  type ConnectionState,
  type DeviceInfo,
  type DpiState,
  type LightingState,
  type Profile,
  type TabId,
  type ToastMessage,
} from "./types";

const TAB_META: Record<TabId, { title: string; subtitle: string }> = {
  lighting: { title: "LIGHTSYNC", subtitle: "Color effects, brightness, and animation speed" },
  dpi: { title: "SENSITIVITY (DPI)", subtitle: "Sensitivity stages and sensor polling rate" },
  keys: { title: "ASSIGNMENTS", subtitle: "Physical layout and 8-button matrix map" },
  settings: { title: "DEVICE CONFIG", subtitle: "Hardware status, battery telemetry, and profiles" },
};

export default function App() {
  const [tab, setTab] = useState<TabId>("lighting");
  const [lighting, setLighting] = useState<LightingState>(DEFAULT_LIGHTING);
  const [dpi, setDpi] = useState<DpiState>(DEFAULT_DPI);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [battery, setBattery] = useState<BatteryStatus | null>(null);
  const [batteryLoading, setBatteryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>(() => loadProfiles());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const lightingTouched = useRef(false);
  const dpiTouched = useRef(false);
  const pollingTouched = useRef(false);
  const autoProbed = useRef(false);
  const lastErrorAt = useRef(0);
  const toastSeq = useRef(0);

  const notify = useCallback(
    (kind: ToastMessage["kind"], title: string, detail?: string) => {
      const id = ++toastSeq.current;
      setToasts((current) => [...current.slice(-2), { id, kind, title, detail }]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 4500);
    },
    []
  );

  const reportHidError = useCallback(
    (error: unknown) => {
      const now = Date.now();
      if (now - lastErrorAt.current < 5000) return;
      lastErrorAt.current = now;
      notify(
        "error",
        "Could not reach the mouse",
        error instanceof Error ? error.message : String(error)
      );
    },
    [notify]
  );

  const refreshDevices = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      try {
        const found = await listDevices();
        setDevices(found);
        if (!silent && isTauri() && found.length === 0) {
          notify(
            "info",
            "No KLIM Blaze found",
            "Connect the mouse or its 2.4 GHz receiver, then rescan."
          );
        }
      } catch (error) {
        if (!silent) reportHidError(error);
      } finally {
        if (!silent) setRefreshing(false);
      }
    },
    [notify, reportHidError]
  );

  const probeBattery = useCallback(async () => {
    if (!isTauri()) {
      setBattery({
        supported: false,
        level: null,
        charging: false,
        note: "Battery telemetry is only available in the desktop build.",
      });
      return;
    }
    setBatteryLoading(true);
    try {
      setBattery(await getBatteryStatus());
    } catch (error) {
      reportHidError(error);
    } finally {
      setBatteryLoading(false);
    }
  }, [reportHidError]);

  useEffect(() => {
    void refreshDevices();
    // In the browser preview there is no device to probe; set the explanatory
    // note. In the desktop app the probe runs once a device shows up.
    if (!isTauri()) void probeBattery();
  }, [refreshDevices, probeBattery]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshDevices(true);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [refreshDevices]);

  useEffect(() => {
    if (devices.length === 0) {
      autoProbed.current = false;
      return;
    }
    if (autoProbed.current) return;
    autoProbed.current = true;
    void probeBattery();
  }, [devices.length, probeBattery]);

  // ---- live (debounced) writes -------------------------------------------------

  useDebouncedEffect(
    () => {
      if (!lightingTouched.current || devices.length === 0) return;
      void (async () => {
        try {
          await applyRgb(lighting);
        } catch (error) {
          reportHidError(error);
        }
      })();
    },
    [lighting, devices.length],
    30
  );

  useDebouncedEffect(
    () => {
      if (!dpiTouched.current || devices.length === 0) return;
      void (async () => {
        try {
          const applied = await setDpiLevels(dpi.stages, dpi.activeIndex);
          setDpi((current) => {
            if (applied.length !== current.stages.length) return current;
            if (!applied.some((value, index) => value !== current.stages[index].dpi)) {
              return current;
            }
            return {
              ...current,
              stages: current.stages.map((stage, index) => ({ ...stage, dpi: applied[index] })),
            };
          });
        } catch (error) {
          reportHidError(error);
        }
      })();
    },
    [dpi.stages, devices.length],
    30
  );

  useDebouncedEffect(
    () => {
      if (!pollingTouched.current || devices.length === 0) return;
      void (async () => {
        try {
          await setPollingRate(dpi.pollingRate);
        } catch (error) {
          reportHidError(error);
        }
      })();
    },
    [dpi.pollingRate, devices.length],
    30
  );

  // ---- change handlers ---------------------------------------------------------

  const changeLighting = useCallback((next: LightingState) => {
    lightingTouched.current = true;
    setLighting(next);
  }, []);

  const changeDpi = useCallback(
    (next: DpiState) => {
      dpiTouched.current = true;
      if (next.pollingRate !== dpi.pollingRate) pollingTouched.current = true;
      setDpi(next);
    },
    [dpi.pollingRate]
  );

  const applyLightingNow = useCallback(async () => {
    if (devices.length === 0) {
      notify("error", "No mouse detected", "Connect the device and press rescan.");
      return;
    }
    try {
      await applyRgb(lighting);
      notify("success", "Lighting applied");
    } catch (error) {
      reportHidError(error);
    }
  }, [devices.length, lighting, notify, reportHidError]);

  const applyDpiNow = useCallback(async () => {
    if (devices.length === 0) {
      notify("error", "No mouse detected", "Connect the device and press rescan.");
      return;
    }
    try {
      const applied = await setDpiLevels(dpi.stages, dpi.activeIndex);
      setDpi((current) => ({
        ...current,
        stages: current.stages.map((stage, index) =>
          applied[index] !== undefined ? { ...stage, dpi: applied[index] } : stage
        ),
      }));
      await setPollingRate(dpi.pollingRate);
      notify("success", "Sensitivity applied");
    } catch (error) {
      reportHidError(error);
    }
  }, [devices.length, dpi, notify, reportHidError]);

  // ---- profiles -----------------------------------------------------------------

  const updateProfiles = useCallback((next: Profile[]) => {
    setProfiles(next);
    persistProfiles(next);
  }, []);

  const saveProfile = useCallback(
    (name: string) => {
      const profile = makeProfile(name, lighting, dpi);
      const next = [
        profile,
        ...profiles.filter((item) => item.name.toLowerCase() !== profile.name.toLowerCase()),
      ];
      updateProfiles(next);
      notify("success", "Profile saved", profile.name);
    },
    [lighting, dpi, profiles, updateProfiles, notify]
  );

  const loadProfile = useCallback(
    (profile: Profile) => {
      lightingTouched.current = true;
      dpiTouched.current = true;
      pollingTouched.current = true;
      setLighting({ ...profile.lighting, color: { ...profile.lighting.color } });
      setDpi({ ...profile.dpi, stages: profile.dpi.stages.map((stage) => ({ ...stage })) });
      notify("info", "Profile loaded", profile.name);
      setTab("lighting");
    },
    [notify]
  );

  const deleteProfile = useCallback(
    (id: string) => {
      const target = profiles.find((profile) => profile.id === id);
      updateProfiles(profiles.filter((profile) => profile.id !== id));
      notify("info", "Profile deleted", target?.name);
    },
    [profiles, updateProfiles, notify]
  );

  const importProfiles = useCallback(
    (incoming: Profile[]) => {
      const seen = new Set<string>();
      const merged = [...incoming, ...profiles].filter((profile) => {
        if (seen.has(profile.id)) return false;
        seen.add(profile.id);
        return true;
      });
      updateProfiles(merged.slice(0, 100));
      notify(
        "success",
        "Profiles imported",
        `${incoming.length} profile${incoming.length === 1 ? "" : "s"} added.`
      );
    },
    [profiles, updateProfiles, notify]
  );

  const importFailed = useCallback(() => {
    notify(
      "error",
      "Could not import profiles",
      "The selected JSON file does not contain any valid profiles."
    );
  }, [notify]);

  // ---- render -------------------------------------------------------------------

  const connection: ConnectionState = !isTauri()
    ? "preview"
    : devices.length === 0
      ? "disconnected"
      : devices.some((device) => device.wireless)
        ? "wireless"
        : "connected";

  const activeStage = dpi.stages[Math.min(dpi.activeIndex, dpi.stages.length - 1)];
  const accent =
    tab === "dpi" ? activeStage.color : tab === "lighting" ? rgbToHex(lighting.color) : "#38bdf8";

  let content: ReactNode;
  switch (tab) {
    case "lighting":
      content = (
        <LightingView
          lighting={lighting}
          onChange={changeLighting}
          onApply={() => void applyLightingNow()}
        />
      );
      break;
    case "dpi":
      content = (
        <DpiView dpi={dpi} onChange={changeDpi} onApply={() => void applyDpiNow()} />
      );
      break;
    case "keys":
      content = <KeyBindingsView />;
      break;
    default:
      content = (
        <SettingsView
          devices={devices}
          battery={battery}
          batteryLoading={batteryLoading}
          refreshing={refreshing}
          onRefreshDevices={() => void refreshDevices()}
          onProbeBattery={() => void probeBattery()}
          profiles={profiles}
          onSaveProfile={saveProfile}
          onLoadProfile={loadProfile}
          onDeleteProfile={deleteProfile}
          onImportProfiles={importProfiles}
          onImportFailed={importFailed}
        />
      );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090a0f] text-[#f0f2f5]" style={accentStyle(accent)}>
      <Sidebar active={tab} onChange={setTab} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={TAB_META[tab].title}
          subtitle={TAB_META[tab].subtitle}
          connection={connection}
          battery={battery}
          batteryLoading={batteryLoading}
          refreshing={refreshing}
          onRefresh={() => void refreshDevices()}
          onProbeBattery={() => void probeBattery()}
        />

        {!isTauri() && (
          <div className="border-b border-zinc-800/70 bg-zinc-900/40 px-6 py-2 text-[11px] text-zinc-500">
            Preview mode — USB HID commands are disabled in the browser. Run{" "}
            <code className="rounded bg-zinc-800/70 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
              npm run tauri:dev
            </code>{" "}
            for hardware control.
          </div>
        )}

        <main className="min-h-0 flex-1 overflow-y-auto p-5 xl:p-8 flex flex-col">
          <div key={tab} className="w-full flex-1 flex flex-col animate-fade-in">
            {content}
          </div>
        </main>
      </div>

      <Toast
        messages={toasts}
        onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))}
      />
    </div>
  );
}
