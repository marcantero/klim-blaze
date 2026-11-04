import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Zap } from "lucide-react";

interface AlertPayload {
  level: number;
  charging: boolean;
}

export default function SubtleAlertOverlay() {
  const [level, setLevel] = useState<number>(20);
  const [charging, setCharging] = useState(false);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);

  const dismiss = () => {
    setVisible(false);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    window.setTimeout(() => {
      void invoke("hide_subtle_battery_alert");
    }, 240);
  };

  const startDismissTimer = (duration = 4500) => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      dismiss();
    }, duration);
  };

  const onMouseEnter = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const onMouseLeave = () => {
    startDismissTimer(2000);
  };

  useEffect(() => {
    document.documentElement.classList.add("subtle-overlay-mode");
    document.body.classList.add("subtle-overlay-mode");

    const unlistenPromise = listen<AlertPayload>("battery-alert-data", (event) => {
      const data = event.payload;
      if (typeof data?.level === "number") {
        setLevel(data.level);
        setCharging(Boolean(data.charging));
        setVisible(true);
        startDismissTimer(4800);
      }
    });

    setVisible(true);
    startDismissTimer(4800);

    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
      if (timerRef.current) window.clearTimeout(timerRef.current);
      document.documentElement.classList.remove("subtle-overlay-mode");
      document.body.classList.remove("subtle-overlay-mode");
    };
  }, []);

  const isCritical = level <= 10;
  const isWarning = level <= 20;

  const accentColor = charging
    ? "#10b981" // emerald
    : isCritical
      ? "#ef4444" // red
      : isWarning
        ? "#f59e0b" // amber
        : "#00f0ff"; // cyan

  return (
    <div
      className="w-full h-full select-none flex items-end justify-center pb-2 px-2 overflow-visible bg-transparent"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        onClick={dismiss}
        title="Click to dismiss"
        className={`relative w-full h-[44px] rounded-full cursor-pointer flex items-center justify-between pl-4 pr-3 transition-all duration-300 ease-out ${
          visible
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-3 scale-95 pointer-events-none"
        }`}
        style={{
          backgroundColor: "#070709",
          backgroundImage: `radial-gradient(circle at 82% 50%, ${accentColor}45 0%, ${accentColor}12 55%, transparent 85%)`,
          border: `1.5px solid ${accentColor}`,
          boxShadow: `0 0 16px ${accentColor}55, inset 0 0 10px ${accentColor}25, 0 10px 25px rgba(0, 0, 0, 0.85)`,
        }}
      >
        {/* Left: Lightning bolt + Percentage */}
        <div className="z-10 flex items-center gap-2">
          <Zap
            className="h-4.5 w-4.5"
            style={{
              fill: accentColor,
              color: accentColor,
              filter: `drop-shadow(0 0 6px ${accentColor})`,
            }}
          />
          <span className="font-mono text-[14px] font-bold tracking-tight text-white">
            {level}%
          </span>
        </div>

        {/* Right: Floating Mouse Hardware graphic, popping out the top */}
        <div className="pointer-events-none absolute right-3 -top-[14px] z-20 flex items-center justify-center">
          <img
            src="/images/top-mouse.png"
            alt="KLIM Blaze"
            draggable={false}
            className="h-[52px] w-auto object-contain transition-transform duration-300"
            style={{
              filter: `drop-shadow(0 6px 12px rgba(0,0,0,0.95)) drop-shadow(0 0 8px ${accentColor}45)`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
