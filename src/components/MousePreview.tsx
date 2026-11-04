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
      className={`relative mx-auto flex w-full flex-col items-center justify-center select-none font-mono ${className}`}
    >
      {/* Precision CAD / Stage Viewport */}
      <div className="relative flex w-full items-center justify-center py-6">
        {/* Subtle engineering calibration grid behind mouse */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30"
        >
          <div className="h-64 w-64 rounded-none border border-dashed border-[#222a3b]" />
          <div className="absolute h-px w-full max-w-lg bg-[#1b2230]" />
          <div className="absolute h-full max-h-[460px] w-px bg-[#1b2230]" />
        </div>

        {/* Ambient hardware illumination aura */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-all duration-700 ${animation}`}
          style={{ animationDuration: duration }}
        >
          {/* Main underglow halo */}
          <div
            className="h-[300px] w-[340px] rounded-none blur-[80px] transition-all duration-500"
            style={{
              background: off ? "transparent" : color,
              opacity: off ? 0 : mode === 2 ? 0.55 : 0.45,
            }}
          />
          {/* Tail emission hotspot */}
          <div
            className="absolute bottom-10 h-[140px] w-[240px] rounded-none blur-[48px] transition-all duration-500"
            style={{
              background: off ? "transparent" : color,
              opacity: off ? 0 : 0.65,
            }}
          />
        </div>

        {/* Mouse Photo Render */}
        <div className="relative z-10 flex items-center justify-center">
          <img
            src={imageSrc}
            alt="KLIM Blaze Wireless Mouse"
            draggable={false}
            className={`max-h-[380px] xl:max-h-[460px] 2xl:max-h-[540px] w-auto object-contain drop-shadow-[0_25px_40px_rgba(0,0,0,0.95)] transition-all duration-300 ${
              currentView === "side" ? "scale-95" : ""
            }`}
            style={{
              filter: off
                ? "drop-shadow(0 25px 35px rgba(0,0,0,0.95))"
                : `drop-shadow(0 25px 40px rgba(0,0,0,0.95)) drop-shadow(0 0 30px ${color}40)`,
            }}
          />

          {/* Underglow base light bar reflection */}
          {!off && (
            <div
              aria-hidden
              className={`pointer-events-none absolute bottom-4 h-6 w-36 rounded-none blur-md transition-opacity duration-300 ${animation}`}
              style={{
                background: color,
                opacity: mode === 1 ? 0.75 : 0.85,
                animationDuration: duration,
              }}
            />
          )}
        </div>
      </div>

      {/* Perspective Toggle Pill */}
      {showViewToggle && (
        <div className="mt-1 flex items-center gap-1 border border-[#1d2331] bg-[#0c0e14] p-1 text-[10px]">
          <button
            type="button"
            onClick={() => setCurrentView("top")}
            className={`px-3 py-1 font-mono uppercase tracking-wider transition-all ${
              currentView === "top"
                ? "bg-[#00b8fc] text-[#050608] font-bold"
                : "text-[#6b768c] hover:text-[#eef1f6]"
            }`}
          >
            [ TOP VIEW ]
          </button>
          <button
            type="button"
            onClick={() => setCurrentView("side")}
            className={`px-3 py-1 font-mono uppercase tracking-wider transition-all ${
              currentView === "side"
                ? "bg-[#00b8fc] text-[#050608] font-bold"
                : "text-[#6b768c] hover:text-[#eef1f6]"
            }`}
          >
            [ SIDE VIEW ]
          </button>
        </div>
      )}
    </div>
  );
}
