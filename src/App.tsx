import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
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
  getActiveDpiStage,
  getBatteryStatus,
  isTauri,
  listDevices,
  setActiveDpiStage,
  setDpiLevels,
  setPollingRate,
} from "./lib/api";
import { loadProfiles, makeProfile, persistProfiles } from "./lib/profiles";
import {
  checkAndNotifyBattery,
  loadBatteryNotificationConfig,
  saveBatteryNotificationConfig,
} from "./lib/notifications";
import {
  DEFAULT_DPI,
  DEFAULT_LIGHTING,
  STORAGE_KEY_CLOSE_TO_TRAY,
  accentStyle,
  rgbToHex,
  type BatteryNotificationConfig,
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

const STORAGE_KEY_DPI = "klim-blaze.dpi";

function loadDpiState(): DpiState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DPI);
    if (!raw) return DEFAULT_DPI;
    const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.stages) && typeof parsed.activeIndex === "number") {
        const stages = DEFAULT_DPI.stages.map((def, i) => {
          const stored = parsed.stages[i];
          return {
            dpi: typeof stored?.dpi === "number" ? stored.dpi : def.dpi,
            color: def.color,
          };
        });
        return {
          stages,
          activeIndex: Math.max(0, Math.min(5, parsed.activeIndex)),
          pollingRate: parsed.pollingRate ?? 1000,
        };
      }
    } catch { }
    return DEFAULT_DPI;
  }

export default function App() {
    const [tab, setTab] = useState<TabId>("lighting");
    const [lighting, setLighting] = useState<LightingState>(DEFAULT_LIGHTING);
    const [dpi, setDpi] = useState<DpiState>(() => loadDpiState());
    const [devices, setDevices] = useState<DeviceInfo[]>([]);
    const [battery, setBattery] = useState<BatteryStatus | null>(null);
    const [batteryLoading, setBatteryLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [profiles, setProfiles] = useState<Profile[]>(() => loadProfiles());
    const [batteryConfig, setBatteryConfig] = useState<BatteryNotificationConfig>(() =>
      loadBatteryNotificationConfig()
    );
    const [closeToTray, setCloseToTray] = useState<boolean>(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_CLOSE_TO_TRAY);
        return raw !== null ? Boolean(JSON.parse(raw)) : true;
      } catch {
        return true;
      }
    });
    const [autostart, setAutostart] = useState<boolean>(false);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const lightingTouched = useRef(false);
    const dpiTouched = useRef(false);
    const pollingTouched = useRef(false);
    const prevStagesDpi = useRef(dpi.stages.map((s) => s.dpi).join(","));
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

    const syncDpiFromMouse = useCallback(async () => {
      if (devices.length === 0 || !isTauri()) return;
      try {
        const stage = await getActiveDpiStage();
        if (typeof stage === "number" && stage >= 0) {
          setDpi((current) => {
            if (current.activeIndex === stage) return current;
            return {
              ...current,
              activeIndex: Math.min(stage, current.stages.length - 1),
            };
          });
        }
      } catch {
        // ignore
      }
    }, [devices.length]);

    // Fast periodic check for active DPI stage changes (e.g. user pressed physical DPI button)
    useEffect(() => {
      if (devices.length === 0 || !isTauri()) return;
      void syncDpiFromMouse();
      const timer = window.setInterval(() => {
        void syncDpiFromMouse();
      }, 1500);
      return () => window.clearInterval(timer);
    }, [devices.length, syncDpiFromMouse]);

    useEffect(() => {
      if (tab === "dpi") {
        void syncDpiFromMouse();
      }
    }, [tab, syncDpiFromMouse]);

    const prevDeviceSig = useRef<string>("");
    const hasSyncedDpiOnConnect = useRef(false);
    useEffect(() => {
      if (devices.length === 0) {
        autoProbed.current = false;
        prevDeviceSig.current = "";
        hasSyncedDpiOnConnect.current = false;
        return;
      }
      const sig = devices.map((d) => `${d.productId}-${d.wireless}`).join(",");
      if (sig !== prevDeviceSig.current) {
        prevDeviceSig.current = sig;
        void probeBattery();
        if (!hasSyncedDpiOnConnect.current) {
          hasSyncedDpiOnConnect.current = true;
          void (async () => {
            try {
              const mouseStage = await getActiveDpiStage();
              const stageToUse =
                typeof mouseStage === "number" && mouseStage >= 0
                  ? Math.min(mouseStage, dpi.stages.length - 1)
                  : dpi.activeIndex;
              if (stageToUse !== dpi.activeIndex) {
                setDpi((curr) => ({ ...curr, activeIndex: stageToUse }));
              }
              await setDpiLevels(dpi.stages, stageToUse);
            } catch { }
          })();
        }
      }
    }, [devices, probeBattery, dpi.stages, dpi.activeIndex]);

    // Periodic battery telemetry refresh (every 10s when mouse is connected)
    useEffect(() => {
      if (devices.length === 0) return;
      const timer = window.setInterval(() => {
        void probeBattery();
      }, 10000);
      return () => window.clearInterval(timer);
    }, [devices.length, probeBattery]);

    // Check battery status against notification settings
    useEffect(() => {
      void checkAndNotifyBattery(battery, batteryConfig);
    }, [battery, batteryConfig]);

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
        const sig = dpi.stages.map((s) => s.dpi).join(",");
        if (sig !== prevStagesDpi.current) {
          prevStagesDpi.current = sig;
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
        }
      },
      [dpi.stages, devices.length],
      100
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
        if (next.activeIndex !== dpi.activeIndex) {
          void setActiveDpiStage(next.activeIndex);
        }
        setDpi(next);
        try {
          localStorage.setItem(STORAGE_KEY_DPI, JSON.stringify(next));
        } catch { }
      },
      [dpi.activeIndex, dpi.pollingRate]
    );

    // ---- battery notification config ---------------------------------------------

    const changeBatteryConfig = useCallback((next: BatteryNotificationConfig) => {
      setBatteryConfig(next);
      saveBatteryNotificationConfig(next);
    }, []);

    const changeCloseToTray = useCallback((enabled: boolean) => {
      setCloseToTray(enabled);
      try {
        localStorage.setItem(STORAGE_KEY_CLOSE_TO_TRAY, JSON.stringify(enabled));
      } catch {
        // ignore
      }
      if (isTauri()) {
        void invoke("set_close_to_tray", { enabled });
      }
    }, []);

    useEffect(() => {
      if (isTauri()) {
        void invoke("set_close_to_tray", { enabled: closeToTray });
      }
    }, [closeToTray]);

    useEffect(() => {
      if (isTauri()) {
        void (async () => {
          try {
            const enabled = await invoke<boolean>("get_autostart");
            setAutostart(enabled);
          } catch {
            // ignore
          }
        })();
      }
    }, []);

    const changeAutostart = useCallback(async (enabled: boolean) => {
      setAutostart(enabled);
      if (isTauri()) {
        try {
          await invoke("set_autostart", { enabled });
          notify(
            "success",
            enabled ? "Start with Windows enabled" : "Start with Windows disabled",
            enabled
              ? "KLIM Blaze will now start silently in the tray on boot."
              : "KLIM Blaze will no longer start automatically on Windows boot."
          );
        } catch (error) {
          reportHidError(error);
          try {
            const current = await invoke<boolean>("get_autostart");
            setAutostart(current);
          } catch {
            // ignore
          }
        }
      }
    }, [notify, reportHidError]);

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

    const hasWired = devices.some((device) => !device.wireless);
    const effectiveBattery: BatteryStatus | null = battery
      ? {
        ...battery,
        charging: Boolean(battery.charging || hasWired),
      }
      : null;

    const connection: ConnectionState = !isTauri()
      ? "preview"
      : devices.length === 0
        ? "disconnected"
        : hasWired
          ? "connected"
          : "wireless";

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
          />
        );
        break;
      case "dpi":
        content = (
          <DpiView dpi={dpi} onChange={changeDpi} />
        );
        break;
      case "keys":
        content = <KeyBindingsView onNotify={notify} />;
        break;
      default:
        content = (
          <SettingsView
            devices={devices}
            battery={effectiveBattery}
            batteryLoading={batteryLoading}
            batteryConfig={batteryConfig}
            onChangeBatteryConfig={changeBatteryConfig}
            closeToTray={closeToTray}
            onChangeCloseToTray={changeCloseToTray}
            autostart={autostart}
            onChangeAutostart={changeAutostart}
            onNotifyFeedback={notify}
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

        <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
          <TopBar
            title={TAB_META[tab].title}
            subtitle={TAB_META[tab].subtitle}
            connection={connection}
            battery={effectiveBattery}
            batteryLoading={batteryLoading}
            refreshing={refreshing}
            onRefresh={() => void refreshDevices()}
            onProbeBattery={() => void probeBattery()}
          />

          {!isTauri() && (
            <div className="border-b border-zinc-800/70 bg-zinc-900/40 px-6 py-2 text-xs text-zinc-500">
              Preview mode — USB HID commands are disabled in the browser. Run{" "}
              <code className="rounded bg-zinc-800/70 px-1.5 py-0.5 font-mono text-xs text-zinc-300">
                npm run tauri:dev
              </code>{" "}
              for hardware control.
            </div>
          )}

          <main className="min-h-0 flex-1 p-3.5 xl:p-4 2xl:p-5 flex flex-col overflow-y-auto">
            <div key={tab} className="w-full flex-1 flex flex-col h-full min-h-0 animate-fade-in">
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
