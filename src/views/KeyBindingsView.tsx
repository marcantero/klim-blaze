import { useEffect, useState, useMemo } from "react";
import {
  MousePointer2,
  RotateCcw,
  Sliders,
  Volume2,
  VolumeX,
  Play,
  Square,
  SkipBack,
  SkipForward,
  Calculator,
  Folder,
  Globe,
  Search,
  Mail,
  RefreshCw,
  Flame,
  Zap,
  Crosshair,
  Keyboard,
  Ban,
  Check,
  X,
  ChevronRight,
  Info,
  type LucideIcon,
} from "lucide-react";
import {
  PHYSICAL_BUTTONS,
  AVAILABLE_ACTIONS,
  ACTION_CATEGORIES,
  HID_KEY_MAP,
  findActionName,
  type ActionCategory,
  type ButtonActionDef,
  type PhysicalButtonDef,
} from "../types";
import { getButtonBindings, setButtonBinding, resetButtonBindings, isTauri } from "../lib/api";

interface KeyBindingsViewProps {
  onNotify?: (kind: "info" | "success" | "error", title: string, detail?: string) => void;
}

// Icon mapping for action categories & specific actions
function getActionIcon(actionDef?: ButtonActionDef, bytes?: [number, number, number]): LucideIcon {
  if (bytes && bytes[0] === 0x04) return Keyboard;
  if (!actionDef) return Sliders;

  switch (actionDef.id) {
    case "btn_left":
    case "btn_right":
    case "btn_middle":
    case "btn_forward":
    case "btn_back":
      return MousePointer2;
    case "dpi_loop":
      return RefreshCw;
    case "dpi_plus":
    case "dpi_minus":
    case "dpi_lock":
      return Crosshair;
    case "three_click":
      return Zap;
    case "fire_key":
      return Flame;
    case "rgb_toggle":
      return Sliders;
    case "poll_switch":
      return RefreshCw;
    case "disable":
      return Ban;
    case "media_play_pause":
      return Play;
    case "media_stop":
      return Square;
    case "media_prev":
      return SkipBack;
    case "media_next":
      return SkipForward;
    case "vol_up":
    case "vol_down":
      return Volume2;
    case "vol_mute":
      return VolumeX;
    case "win_calc":
      return Calculator;
    case "win_explorer":
      return Folder;
    case "web_home":
      return Globe;
    case "web_search":
      return Search;
    case "win_mail":
      return Mail;
    case "web_refresh":
      return RefreshCw;
    default:
      return Sliders;
  }
}

// Normalized hotspots for the 7 physical buttons overlaid on the mouse graphic
const BUTTON_HOTSPOTS = [
  { index: 0, number: 1, name: "Left button", top: "37%", left: "37%" },
  { index: 1, number: 2, name: "Right button", top: "37%", left: "63%" },
  { index: 2, number: 3, name: "Middle button", top: "40%", left: "50%" },
  { index: 3, number: 4, name: "Forward", top: "51%", left: "32%" },
  { index: 4, number: 5, name: "Back", top: "58%", left: "33%" },
  { index: 5, number: 6, name: "DPI Loop", top: "48%", left: "50%" },
  { index: 6, number: 7, name: "DPI -", top: "54%", left: "50%" },
];

export default function KeyBindingsView({ onNotify }: KeyBindingsViewProps) {
  // Bindings state: array of 7 actions [byte0, byte1, byte2]
  const [bindings, setBindings] = useState<[number, number, number][]>(() =>
    PHYSICAL_BUTTONS.map((b) => b.defaultBytes)
  );
  const [selectedButtonIdx, setSelectedButtonIdx] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<ActionCategory>("mouse");
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [resetting, setResetting] = useState(false);

  // Keyboard shortcut builder state
  const [customKey, setCustomKey] = useState<number>(0x06); // Default: 'C'
  const [ctrlMod, setCtrlMod] = useState(true);
  const [shiftMod, setShiftMod] = useState(false);
  const [altMod, setAltMod] = useState(false);
  const [winMod, setWinMod] = useState(false);

  // Load hardware bindings on mount
  useEffect(() => {
    let cancelled = false;
    async function loadBindings() {
      try {
        const hwBindings = await getButtonBindings();
        if (!cancelled && hwBindings && hwBindings.length === 7) {
          setBindings(hwBindings);
        }
      } catch (err) {
        console.warn("Failed to read button bindings from hardware:", err);
      }
    }
    void loadBindings();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedButton: PhysicalButtonDef | null =
    selectedButtonIdx !== null ? PHYSICAL_BUTTONS[selectedButtonIdx] : null;

  const handleSelectAction = async (action: ButtonActionDef) => {
    if (selectedButtonIdx === null) return;
    setSavingIdx(selectedButtonIdx);

    const oldBytes = bindings[selectedButtonIdx];
    const newBytes = action.bytes;

    // Optimistic update
    const updated = [...bindings];
    updated[selectedButtonIdx] = newBytes;
    setBindings(updated);

    try {
      await setButtonBinding(selectedButtonIdx, newBytes);
      onNotify?.(
        "success",
        `Button ${selectedButtonIdx + 1} Assigned`,
        `Set to "${action.name}" and saved to mouse memory.`
      );
      setSelectedButtonIdx(null);
    } catch (err) {
      // Rollback on error
      const rollback = [...bindings];
      rollback[selectedButtonIdx] = oldBytes;
      setBindings(rollback);
      onNotify?.(
        "error",
        "Failed to assign button",
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setSavingIdx(null);
    }
  };

  const handleApplyKeyCombination = async () => {
    if (selectedButtonIdx === null) return;
    setSavingIdx(selectedButtonIdx);

    let modMask = 0;
    if (ctrlMod) modMask |= 0x01;
    if (shiftMod) modMask |= 0x02;
    if (altMod) modMask |= 0x04;
    if (winMod) modMask |= 0x08;

    const actionBytes: [number, number, number] = [0x04, customKey, modMask];
    const oldBytes = bindings[selectedButtonIdx];

    const updated = [...bindings];
    updated[selectedButtonIdx] = actionBytes;
    setBindings(updated);

    const actionName = findActionName(actionBytes);

    try {
      await setButtonBinding(selectedButtonIdx, actionBytes);
      onNotify?.(
        "success",
        `Button ${selectedButtonIdx + 1} Shortcut Assigned`,
        `Set to "${actionName}".`
      );
      setSelectedButtonIdx(null);
    } catch (err) {
      const rollback = [...bindings];
      rollback[selectedButtonIdx] = oldBytes;
      setBindings(rollback);
      onNotify?.(
        "error",
        "Failed to assign shortcut",
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setSavingIdx(null);
    }
  };

  const handleResetDefaults = async () => {
    if (resetting) return;
    setResetting(true);
    try {
      await resetButtonBindings();
      const defaultBindings = PHYSICAL_BUTTONS.map((b) => b.defaultBytes);
      setBindings(defaultBindings);
      onNotify?.(
        "info",
        "Buttons Reset",
        "All 7 buttons restored to factory default mappings."
      );
      setSelectedButtonIdx(null);
    } catch (err) {
      onNotify?.(
        "error",
        "Reset failed",
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setResetting(false);
    }
  };

  const filteredActions = useMemo(() => {
    return AVAILABLE_ACTIONS.filter((a) => a.category === activeCategory);
  }, [activeCategory]);

  return (
    <div className="grid h-full flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_460px]">
      {/* Visual Button Map Stage Card */}
      <section className="card-hardware relative flex flex-1 flex-col items-center justify-between p-6 xl:p-8 overflow-hidden select-none">
        <div className="flex w-full items-center justify-between border-b border-[#2b2d32]/50 pb-4">
          <div>
            <h1 className="text-sm font-black tracking-wider text-white">
              BUTTON MAPPING
            </h1>
            <p className="text-xs font-medium text-[#71717a] mt-0.5">
              ON-BOARD EEPROM • 7 PROGRAMMABLE SWITCHES
            </p>
          </div>
          <span className="rounded-full bg-[#1f2024] border border-[#2b2d32] px-3 py-1 text-xs font-bold text-[#00f0ff]">
            7 BUTTONS
          </span>
        </div>

        {/* Real Mouse Graphic with interactive click hotspots */}
        <div className="relative my-auto flex w-full flex-1 items-center justify-center py-6">
          <div className="relative inline-block">
            <img
              src="/images/buttons-mouse.png"
              alt="KLIM Blaze Buttons Layout"
              className="max-h-[380px] xl:max-h-[460px] 2xl:max-h-[500px] w-auto object-contain drop-shadow-[0_25px_40px_rgba(0,0,0,0.95)]"
            />

            {/* Interactive hotspot pills over the pins */}
            {BUTTON_HOTSPOTS.map((spot) => {
              const isSelected = selectedButtonIdx === spot.index;
              const currentActionName = findActionName(bindings[spot.index]);
              return (
                <button
                  key={spot.index}
                  type="button"
                  onClick={() => setSelectedButtonIdx(spot.index)}
                  style={{ top: spot.top, left: spot.left }}
                  title={`Click to configure Button ${spot.number} (${currentActionName})`}
                  className={`group absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-200 z-10 ${
                    isSelected ? "scale-125" : "hover:scale-115"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-black shadow-lg transition-all duration-200 border ${
                      isSelected
                        ? "bg-[#00f0ff] text-black border-white shadow-[0_0_15px_rgba(0,240,255,0.7)]"
                        : "bg-[#090a0f]/90 text-[#00f0ff] border-[#00f0ff]/50 hover:bg-[#00f0ff] hover:text-black hover:border-white shadow-[0_0_10px_rgba(0,0,0,0.8)]"
                    }`}
                  >
                    {spot.number}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Status bar / helper note */}
        <div className="flex w-full items-center justify-between rounded-xl border border-[#2b2d32] bg-[#1f2024] px-5 py-3 text-xs text-[#9ca3af]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#00f0ff] animate-pulse" />
            <span>Select any button on the mouse or the list to remap</span>
          </div>
          <span className="font-mono text-xs text-[#71717a]">
            {isTauri() ? "Hardware Synced" : "Preview Mode"}
          </span>
        </div>
      </section>

      {/* Buttons List & Configurator Column */}
      <div className="flex flex-col h-full space-y-4">
        <section className="card-hardware flex flex-1 flex-col overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-[#2b2d32] px-6 py-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                ASSIGNED COMMANDS
              </h2>
              <p className="text-xs text-[#71717a] mt-0.5">
                Hardware persistent configuration
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleResetDefaults()}
              disabled={resetting}
              className="flex items-center gap-1.5 rounded-lg border border-[#2b2d32] bg-[#141518] px-3 py-1.5 text-xs font-medium text-[#9ca3af] transition-all hover:border-[#00f0ff]/40 hover:text-white disabled:opacity-50"
              title="Reset all 7 buttons to factory defaults"
            >
              <RotateCcw size={13} className={resetting ? "animate-spin" : ""} />
              <span>Reset</span>
            </button>
          </div>

          {/* List of 7 Physical Buttons */}
          <div className="divide-y divide-[#24262c] flex-1 overflow-y-auto">
            {PHYSICAL_BUTTONS.map((btn) => {
              const actionBytes = bindings[btn.index] ?? btn.defaultBytes;
              const actionName = findActionName(actionBytes);
              const actionDef = AVAILABLE_ACTIONS.find(
                (a) =>
                  a.bytes[0] === actionBytes[0] &&
                  a.bytes[1] === actionBytes[1] &&
                  a.bytes[2] === actionBytes[2]
              );
              const Icon = getActionIcon(actionDef, actionBytes);
              const isSelected = selectedButtonIdx === btn.index;
              const isSaving = savingIdx === btn.index;

              return (
                <div
                  key={btn.index}
                  onClick={() => setSelectedButtonIdx(btn.index)}
                  className={`group flex items-center gap-4 px-6 py-3.5 cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? "bg-[#00f0ff]/10 border-l-2 border-[#00f0ff]"
                      : "hover:bg-[#1f2024]/70"
                  }`}
                >
                  {/* Button Number Badge */}
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border font-mono text-xs font-black transition-all ${
                      isSelected
                        ? "border-[#00f0ff] bg-[#00f0ff] text-black shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                        : "border-[#2b2d32] bg-[#141518] text-[#00f0ff] group-hover:border-[#00f0ff]/50"
                    }`}
                  >
                    {btn.number}
                  </div>

                  {/* Button Info & Current Action */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white group-hover:text-[#00f0ff] transition-colors">
                        {btn.name}
                      </span>
                      {actionBytes[0] === btn.defaultBytes[0] &&
                        actionBytes[1] === btn.defaultBytes[1] &&
                        actionBytes[2] === btn.defaultBytes[2] && (
                          <span className="rounded bg-[#2b2d32]/60 px-1.5 py-0.2 text-[11px] font-bold text-[#71717a]">
                            DEFAULT
                          </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Icon size={12} className="text-[#00f0ff] shrink-0" />
                      <p className="truncate text-xs text-[#9ca3af] font-medium">
                        {actionName}
                      </p>
                    </div>
                  </div>

                  {/* Remap Action Button */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold tracking-wide transition-all ${
                        isSelected
                          ? "border-[#00f0ff] bg-[#00f0ff] text-black"
                          : "border-[#2b2d32] bg-[#141518] text-[#9ca3af] group-hover:border-[#00f0ff]/40 group-hover:text-white"
                      }`}
                    >
                      {isSaving ? "Saving..." : isSelected ? "Configuring" : "Edit"}
                    </span>
                    <ChevronRight
                      size={14}
                      className={`text-[#71717a] transition-transform ${
                        isSelected ? "rotate-90 text-[#00f0ff]" : "group-hover:translate-x-0.5"
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Informational Callout Card */}
        <div className="card-hardware p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20">
              <Info size={15} />
            </span>
            <div className="text-xs leading-relaxed text-[#9ca3af]">
              <span className="font-bold text-white block mb-0.5">
                Hardware EEPROM Execution
              </span>
              All button mappings are written directly into the KLIM Blaze on-board EEPROM at address 0x60..0x7F, ensuring immediate response without CPU overhead.
            </div>
          </div>
        </div>
      </div>

      {/* Action Picker Modal / Drawer */}
      {selectedButton && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="card-hardware w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden border border-[#2b2d32] shadow-2xl bg-[#141518]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#2b2d32] px-6 py-4 bg-[#1a1b1f]">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00f0ff] text-black font-mono text-xs font-black shadow-[0_0_12px_rgba(0,240,255,0.4)]">
                  {selectedButton.number}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Configure Button {selectedButton.number}: {selectedButton.name}
                  </h3>
                  <p className="text-xs text-[#71717a]">
                    Current:{" "}
                    <span className="text-[#00f0ff] font-medium">
                      {findActionName(bindings[selectedButton.index])}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedButtonIdx(null)}
                className="rounded-lg p-1.5 text-[#71717a] hover:bg-[#2b2d32] hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Category Tabs */}
            <div className="flex border-b border-[#2b2d32] bg-[#121316] px-4 overflow-x-auto scrollbar-none">
              {ACTION_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
                    activeCategory === cat.id
                      ? "border-[#00f0ff] text-[#00f0ff]"
                      : "border-transparent text-[#71717a] hover:text-[#d1d5db]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeCategory === "keyboard" ? (
                /* Key Combination Builder */
                <div className="space-y-5">
                  <div className="rounded-xl border border-[#2b2d32] bg-[#18191d] p-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-white block mb-3">
                      Modifier Keys
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { label: "Ctrl", checked: ctrlMod, toggle: () => setCtrlMod(!ctrlMod) },
                        { label: "Shift", checked: shiftMod, toggle: () => setShiftMod(!shiftMod) },
                        { label: "Alt", checked: altMod, toggle: () => setAltMod(!altMod) },
                        { label: "Win", checked: winMod, toggle: () => setWinMod(!winMod) },
                      ].map((m) => (
                        <label
                          key={m.label}
                          onClick={m.toggle}
                          className={`flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer transition-all ${
                            m.checked
                              ? "border-[#00f0ff] bg-[#00f0ff]/10 text-white font-bold"
                              : "border-[#2b2d32] bg-[#141518] text-[#9ca3af] hover:text-white"
                          }`}
                        >
                          <span className="text-xs">{m.label}</span>
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded border ${
                              m.checked
                                ? "border-[#00f0ff] bg-[#00f0ff] text-black"
                                : "border-[#3f4148] bg-transparent"
                            }`}
                          >
                            {m.checked && <Check size={11} strokeWidth={3} />}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#2b2d32] bg-[#18191d] p-4">
                    <label className="text-xs font-bold uppercase tracking-wider text-white block mb-2">
                      Target Key
                    </label>
                    <select
                      value={customKey}
                      onChange={(e) => setCustomKey(Number(e.target.value))}
                      className="w-full rounded-lg border border-[#2b2d32] bg-[#141518] px-3.5 py-2.5 text-xs font-medium text-white focus:border-[#00f0ff] focus:outline-none"
                    >
                      <optgroup label="Letters">
                        {Object.entries(HID_KEY_MAP)
                          .filter(([code]) => Number(code) >= 0x04 && Number(code) <= 0x1d)
                          .map(([code, name]) => (
                            <option key={code} value={code}>
                              Key {name}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Numbers">
                        {Object.entries(HID_KEY_MAP)
                          .filter(([code]) => Number(code) >= 0x1e && Number(code) <= 0x27)
                          .map(([code, name]) => (
                            <option key={code} value={code}>
                              Key {name}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Function Keys">
                        {Object.entries(HID_KEY_MAP)
                          .filter(([code]) => Number(code) >= 0x3a && Number(code) <= 0x45)
                          .map(([code, name]) => (
                            <option key={code} value={code}>
                              {name}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Navigation & Control">
                        {Object.entries(HID_KEY_MAP)
                          .filter(
                            ([code]) =>
                              (Number(code) >= 0x28 && Number(code) <= 0x2c) ||
                              (Number(code) >= 0x49 && Number(code) <= 0x52)
                          )
                          .map(([code, name]) => (
                            <option key={code} value={code}>
                              {name}
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Shortcut Preview */}
                  <div className="flex items-center justify-between rounded-xl border border-[#00f0ff]/30 bg-[#00f0ff]/5 p-4">
                    <div>
                      <span className="text-xs text-[#71717a] block">Shortcut Preview</span>
                      <span className="font-mono text-sm font-bold text-[#00f0ff]">
                        {[
                          ctrlMod ? "Ctrl" : "",
                          shiftMod ? "Shift" : "",
                          altMod ? "Alt" : "",
                          winMod ? "Win" : "",
                          HID_KEY_MAP[customKey] ?? "Key",
                        ]
                          .filter(Boolean)
                          .join(" + ")}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleApplyKeyCombination()}
                      className="rounded-lg bg-[#00f0ff] px-4 py-2 text-xs font-bold text-black hover:bg-[#38bdf8] transition-colors"
                    >
                      Assign Shortcut
                    </button>
                  </div>
                </div>
              ) : (
                /* Predefined Actions Grid */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredActions.map((action) => {
                    const currentActionBytes = bindings[selectedButton.index];
                    const isCurrent =
                      currentActionBytes[0] === action.bytes[0] &&
                      currentActionBytes[1] === action.bytes[1] &&
                      currentActionBytes[2] === action.bytes[2];
                    const ActionIcon = getActionIcon(action);

                    return (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => void handleSelectAction(action)}
                        className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                          isCurrent
                            ? "border-[#00f0ff] bg-[#00f0ff]/10"
                            : "border-[#2b2d32] bg-[#18191d] hover:border-[#00f0ff]/40 hover:bg-[#1f2025]"
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                            isCurrent
                              ? "border-[#00f0ff] bg-[#00f0ff] text-black"
                              : "border-[#2b2d32] bg-[#141518] text-[#00f0ff]"
                          }`}
                        >
                          <ActionIcon size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-bold ${
                                isCurrent ? "text-[#00f0ff]" : "text-white"
                              }`}
                            >
                              {action.name}
                            </span>
                            {isCurrent && (
                              <Check size={14} className="text-[#00f0ff] shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-[#71717a] mt-0.5 line-clamp-2">
                            {action.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-[#2b2d32] px-6 py-3.5 bg-[#1a1b1f]">
              <button
                type="button"
                onClick={() => {
                  const defAction = AVAILABLE_ACTIONS.find(
                    (a) =>
                      a.bytes[0] === selectedButton.defaultBytes[0] &&
                      a.bytes[1] === selectedButton.defaultBytes[1] &&
                      a.bytes[2] === selectedButton.defaultBytes[2]
                  );
                  if (defAction) void handleSelectAction(defAction);
                }}
                className="text-xs font-medium text-[#71717a] hover:text-[#00f0ff] transition-colors"
              >
                Reset Button {selectedButton.number} to Default
              </button>
              <button
                type="button"
                onClick={() => setSelectedButtonIdx(null)}
                className="rounded-lg border border-[#2b2d32] bg-[#141518] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#2b2d32] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
