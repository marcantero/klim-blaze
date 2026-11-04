import { Crosshair, Keyboard, Sparkles, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TabId } from "../types";

interface TabItem {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

const TABS: TabItem[] = [
  { id: "lighting", label: "LIGHTSYNC", icon: Sparkles },
  { id: "dpi", label: "SENSITIVITY", icon: Crosshair },
  { id: "keys", label: "ASSIGNMENTS", icon: Keyboard },
  { id: "settings", label: "DEVICE", icon: Settings },
];

interface SidebarProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export default function Sidebar({ active, onChange }: SidebarProps) {
  return (
    <nav className="flex w-[80px] shrink-0 flex-col items-center border-r border-[#2b2d32]/50 bg-[#0c0d0f] py-6 select-none">
      {/* Brand Icon Header: Circular #000E41 background with white logo */}
      <div
        className="mb-8 flex h-11 w-11 items-center justify-center rounded-full border border-[#0f1d5e] bg-[#000E41] shadow-sm transition-transform duration-150 hover:scale-105"
        title="KLIM Blaze"
      >
        <img
          src="/images/logo.png"
          alt="KLIM Blaze Logo"
          className="h-6 w-6 object-contain"
        />
      </div>

      {/* Navigation tabs */}
      <div className="flex w-full flex-col gap-2 px-2">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = id === active;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={isActive ? "page" : undefined}
              className={`group relative flex w-full flex-col items-center gap-1.5 rounded-xl py-3 px-1 transition-all duration-150 ${
                isActive
                  ? "bg-[#18191c] text-white"
                  : "text-[#71717a] hover:bg-[#141518] hover:text-[#d4d4d8]"
              }`}
            >
              {/* Active electric cyan line on left edge */}
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-[#00f0ff] shadow-[0_0_8px_#00f0ff]"
                />
              )}
              <Icon
                size={20}
                strokeWidth={isActive ? 2.4 : 1.8}
                className={`transition-colors ${
                  isActive ? "text-[#00f0ff]" : "text-[#71717a] group-hover:text-zinc-200"
                }`}
              />
              <span
                className={`text-[9px] font-bold tracking-wider text-center leading-tight transition-colors ${
                  isActive ? "text-white" : "text-[#71717a] group-hover:text-zinc-200"
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
        <span className="text-[10px] font-bold tracking-widest text-[#52525b]">G-HUB</span>
        <span className="text-[9px] font-mono text-[#3f3f46]">v2.2</span>
      </div>
    </nav>
  );
}
