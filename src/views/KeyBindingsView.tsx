import {
  ChevronDown,
  ChevronUp,
  Crosshair,
  Info,
  MousePointer2,
  RotateCw,
  Shield,
  type LucideIcon,
} from "lucide-react";

interface Binding {
  id: number;
  label: string;
  action: string;
  icon: LucideIcon;
  badge: string;
}

const BINDINGS: Binding[] = [
  { id: 1, label: "Left Click", action: "Primary Click", badge: "Default", icon: MousePointer2 },
  { id: 2, label: "Right Click", action: "Secondary Click", badge: "Default", icon: MousePointer2 },
  { id: 3, label: "Middle Click", action: "Wheel Click", badge: "Default", icon: MousePointer2 },
  { id: 4, label: "Scroll Up", action: "Wheel Up", badge: "Default", icon: ChevronUp },
  { id: 5, label: "Scroll Down", action: "Wheel Down", badge: "Default", icon: ChevronDown },
  { id: 6, label: "Top Button", action: "DPI Stage Up", badge: "Default", icon: Crosshair },
  { id: 7, label: "Bottom Button", action: "DPI Cycle", badge: "Default", icon: RotateCw },
  { id: 8, label: "Forward Side", action: "Browser Forward", badge: "Default", icon: Shield },
  { id: 9, label: "Backward Side", action: "Browser Back", badge: "Default", icon: Shield },
];

export default function KeyBindingsView() {
  return (
    <div className="grid h-full flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_460px]">
      {/* Visual Button Map Stage Card */}
      <section className="card-hardware relative flex flex-1 flex-col items-center justify-between p-8 overflow-hidden">
        <div className="flex w-full items-center justify-between border-b border-[#2b2d32]/50 pb-4">
          <div>
            <h1 className="text-sm font-black tracking-wider text-white">
              BUTTON MAPPING
            </h1>
            <p className="text-[11px] font-medium text-[#71717a] mt-0.5">
              ON-BOARD EEPROM • 8 PROGRAMMED SWITCHES
            </p>
          </div>
          <span className="rounded-full bg-[#1f2024] border border-[#2b2d32] px-3 py-1 text-xs font-bold text-[#00f0ff]">
            8 BUTTONS
          </span>
        </div>

        {/* Real Mouse Graphic with high resolution button render */}
        <div className="my-auto flex w-full flex-1 items-center justify-center py-6">
          <img
            src="/images/buttons-mouse.png"
            alt="KLIM Blaze Buttons Layout"
            className="max-h-[440px] xl:max-h-[520px] w-auto object-contain drop-shadow-[0_25px_40px_rgba(0,0,0,0.95)]"
          />
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-[#2b2d32] bg-[#1f2024] px-5 py-3 text-xs text-[#9ca3af]">
          <span className="h-2 w-2 rounded-full bg-[#00f0ff]" />
          <span>Omron 20-million click rated switches embedded in firmware</span>
        </div>
      </section>

      {/* Buttons List & Information Column */}
      <div className="flex flex-col h-full space-y-4">
        <section className="card-hardware flex flex-1 flex-col overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-[#2b2d32] px-6 py-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              ASSIGNED COMMANDS
            </h2>
            <span className="rounded-full bg-[#1f2024] border border-[#2b2d32] px-2.5 py-0.5 text-[10px] font-bold text-[#9ca3af]">
              HARDWARE NATIVE
            </span>
          </div>

          <div className="divide-y divide-[#24262c] flex-1 overflow-y-auto">
            {BINDINGS.map(({ id, label, action, badge, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-[#1f2024]"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#2b2d32] bg-[#141518] text-[#00f0ff]">
                  <Icon size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#00f0ff]">
                      B{id}
                    </span>
                    <span className="text-xs font-bold text-white">
                      {label}
                    </span>
                  </div>
                  <p className="truncate text-xs text-[#71717a] mt-0.5">{action}</p>
                </div>
                <span className="rounded-full border border-[#2b2d32] bg-[#141518] px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#9ca3af] uppercase">
                  {badge}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Informational Callout Card */}
        <div className="card-hardware p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20">
              <Info size={15} />
            </span>
            <div className="text-xs leading-relaxed text-[#9ca3af]">
              <span className="font-bold text-white block mb-0.5">
                On-Board Hardware Execution
              </span>
              All button mappings are handled natively by the mouse controller without proprietary drivers or CPU background processes, ensuring zero latency and 100% compatibility across all games.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
