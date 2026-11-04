import { Crosshair, Keyboard, Sparkles, Settings, Terminal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TabId } from "../types";

interface TabItem {
  id: TabId;
  index: string;
  label: string;
  icon: LucideIcon;
}

const TABS: TabItem[] = [
  { id: "lighting", index: "01", label: "LIGHTSYNC", icon: Sparkles },
  { id: "dpi", index: "02", label: "SENSITIVITY", icon: Crosshair },
  { id: "keys", index: "03", label: "ASSIGNMENTS", icon: Keyboard },
  { id: "settings", index: "04", label: "DEVICE", icon: Settings },
];

interface SidebarProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export default function Sidebar({ active, onChange }: SidebarProps) {
  return (
    <nav className="flex w-[82px] shrink-0 flex-col items-center border-r border-[#1b212e] bg-[#07080c] py-4 select-none font-mono">
      {/* Precision Instrument Badge */}
      <div
        className="mb-6 flex h-10 w-10 flex-col items-center justify-center rounded-none border border-[#1f2636] bg-[#0c0f16] transition-colors hover:border-[#00b8fc]"
        title="KLIM Blaze Hardware Interface"
      >
        <span className="text-[12px] font-black tracking-tight text-[#00b8fc]">
          KB
        </span>
        <span className="text-[7px] text-[#4d576e]">RACK</span>
      </div>

      {/* Navigation Modules */}
      <div className="flex w-full flex-col gap-1 px-1.5">
        {TABS.map(({ id, index, label, icon: Icon }) => {
          const isActive = id === active;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={isActive ? "page" : undefined}
              className={`group relative flex w-full flex-col items-center gap-1.5 rounded-none py-3 px-1 transition-all ${
                isActive
                  ? "bg-[#11151f] text-white"
                  : "text-[#586278] hover:bg-[#0c0e14] hover:text-[#b5bfd4]"
              }`}
            >
              {/* Active Cyan Hairline Accent */}
              {isActive && (
                <span
                  className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#00b8fc] shadow-[0_0_8px_#00b8fc]"
                />
              )}

              <div className="flex items-center gap-1">
                <span className={`text-[8px] tracking-tighter ${isActive ? "text-[#00b8fc]" : "text-[#3f4758]"}`}>
                  {index}
                </span>
                <Icon
                  size={17}
                  strokeWidth={isActive ? 2.2 : 1.7}
                  className={`transition-colors ${
                    isActive ? "text-[#00b8fc] drop-shadow-[0_0_6px_rgba(0,184,252,0.5)]" : "text-[#586278] group-hover:text-zinc-300"
                  }`}
                />
              </div>

              <span
                className={`text-[8px] font-bold tracking-widest text-center leading-none uppercase ${
                  isActive ? "text-white" : "text-[#657187] group-hover:text-zinc-300"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer System Status */}
      <div className="mt-auto flex flex-col items-center gap-1 text-center">
        <Terminal size={11} className="text-[#3b4456]" />
        <span className="text-[8px] tracking-wider text-[#353e50]">HID 2.0</span>
      </div>
    </nav>
  );
}
