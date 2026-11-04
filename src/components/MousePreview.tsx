import { useState } from "react";
import type { LightMode } from "../types";

interface MousePreviewProps {
  color: string;
  mode: LightMode;
  /** 1..10, controls the CSS animation duration. */
  speed: number;
  className?: string;
  view?: "top" | "side" | "buttons";
  showViewToggle?: boolean;
}

export default function MousePreview({
  color,
  mode,
  speed,
  className = "",
  view: initialView = "top",
  showViewToggle = false,
}: MousePreviewProps) {
  const [currentView, setCurrentView] = useState<"top" | "side">(
    initialView === "side" ? "side" : "top"
  );
  const off = mode === 3;
  const animation =
    mode === 1 ? "animate-pulse-soft" : mode === 2 ? "animate-hue-cycle" : "";

  // Dynamic timing according to speed slider (1..10)
  const duration =
    mode === 1
      ? `${Math.max(1.0, 4.0 - speed * 0.28).toFixed(2)}s`
      : mode === 2
      ? `${Math.max(2.5, 8.5 - speed * 0.55).toFixed(2)}s`
      : undefined;

  const imageSrc =
    currentView === "top" ? "/images/top-mouse.png" : "/images/side-mouse.png";

  return (
    <div
      className={`relative mx-auto flex w-full flex-col items-center justify-center select-none ${className}`}
    >
      {/* Central Hardware Stage Canvas */}
      <div className="relative flex w-full items-center justify-center py-6">
        {/* Soft diffused desk reflection / underglow */}
        {!off && (
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-all duration-700 ${animation}`}
            style={{ animationDuration: duration }}
          >
            {/* Outer diffused atmospheric aura */}
            <div
              className={`rounded-full blur-[80px] transition-all duration-500 ${
                currentView === "top" ? "h-[460px] w-[320px]" : "h-[320px] w-[480px]"
              }`}
              style={{
                background: color,
                opacity: mode === 2 ? 0.45 : 0.35,
              }}
            />
            {/* Core diffused underglow following mouse perimeter */}
            <div
              className={`absolute rounded-full blur-[42px] transition-all duration-500 ${
                currentView === "top" ? "h-[360px] w-[240px]" : "h-[240px] w-[380px]"
              }`}
              style={{
                background: color,
                opacity: mode === 2 ? 0.65 : 0.55,
              }}
            />
          </div>
        )}

        {/* Mouse Photo Render with exact contour drop-shadow */}
        <div className="relative z-10 flex items-center justify-center">
          <img
            src={imageSrc}
            alt="KLIM Blaze Wireless Mouse"
            draggable={false}
            className={`max-h-[380px] xl:max-h-[460px] 2xl:max-h-[540px] w-auto object-contain transition-all duration-300 ${
              currentView === "side" ? "scale-95" : ""
            } ${animation}`}
            style={{
              animationDuration: duration,
              filter: off
                ? "drop-shadow(0 25px 35px rgba(0,0,0,0.95))"
                : `drop-shadow(0 0 12px ${color}) drop-shadow(0 0 26px ${color}88) drop-shadow(0 25px 40px rgba(0,0,0,0.95))`,
            }}
          />
        </div>
      </div>

      {/* Perspective Toggle Pill */}
      {showViewToggle && (
        <div className="mt-2 flex items-center gap-1.5 rounded-full border border-[#2b2d32] bg-[#18191c] p-1 text-xs">
          <button
            type="button"
            onClick={() => setCurrentView("top")}
            className={`rounded-full px-4 py-1.5 font-bold tracking-wider transition-all duration-150 ${
              currentView === "top"
                ? "bg-[#00f0ff] text-black shadow-none"
                : "text-[#9ca3af] hover:text-white"
            }`}
          >
            TOP VIEW
          </button>
          <button
            type="button"
            onClick={() => setCurrentView("side")}
            className={`rounded-full px-4 py-1.5 font-bold tracking-wider transition-all duration-150 ${
              currentView === "side"
                ? "bg-[#00f0ff] text-black shadow-none"
                : "text-[#9ca3af] hover:text-white"
            }`}
          >
            SIDE VIEW
          </button>
        </div>
      )}
    </div>
  );
}
