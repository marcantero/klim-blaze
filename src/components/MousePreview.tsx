import { useState } from "react";
import type { LightMode } from "../types";

interface MousePreviewProps {
  color?: string;
  logoColor?: string;
  mode?: LightMode;
  /** 1..10, controls the CSS animation duration. */
  speed?: number;
  className?: string;
  view?: "top" | "side" | "buttons";
  showViewToggle?: boolean;
  showUnderglow?: boolean;
}

const RAINBOW_CONIC =
  "conic-gradient(from 0deg, #ff0033 0deg, #ff7700 45deg, #ffdd00 90deg, #00ff55 135deg, #00f0ff 180deg, #0066ff 225deg, #9900ff 270deg, #ff0088 315deg, #ff0033 360deg)";

export default function MousePreview({
  color,
  logoColor,
  mode = 0,
  speed = 6,
  className = "",
  view: initialView = "top",
  showViewToggle = false,
  showUnderglow = true,
}: MousePreviewProps) {
  const [currentView, setCurrentView] = useState<"top" | "side">(
    initialView === "side" ? "side" : "top"
  );
  const off = mode === 3;
  const isBreathe = mode === 1;
  const isSpectrum = mode === 2;

  // Dynamic timing according to speed slider (1..10)
  const duration = isBreathe
    ? `${Math.max(1.0, 4.0 - speed * 0.28).toFixed(2)}s`
    : isSpectrum
    ? `${Math.max(1.8, 8.5 - speed * 0.65).toFixed(2)}s`
    : undefined;

  const imageSrc =
    currentView === "top" ? "/images/top-mouse-body.png" : "/images/side-mouse.png";

  const effectiveLogoColor = logoColor || color;
  const hasUnderglow = showUnderglow && !off;

  return (
    <div
      className={`relative mx-auto flex w-full flex-col items-center justify-center select-none ${className}`}
    >
      {/* Central Hardware Stage Canvas */}
      <div className="relative flex w-full items-center justify-center py-6">
        {/* MODE 2 (SPECTRUM): Continuous Multicolor Strip traveling around the mouse perimeter */}
        {hasUnderglow && isSpectrum && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible"
          >
            {/* Broad outer atmospheric desk reflection (multicolor) */}
            <div
              className={`absolute flex items-center justify-center transition-all duration-500 ${
                currentView === "top"
                  ? "scale-x-[0.68] scale-y-[1.06]"
                  : "scale-x-[1.06] scale-y-[0.68]"
              }`}
            >
              <div
                className="h-[520px] w-[520px] rounded-full blur-[75px] opacity-50 animate-spin"
                style={{
                  background: RAINBOW_CONIC,
                  animationDuration: duration,
                }}
              />
            </div>

            {/* Core diffused underglow strip */}
            <div
              className={`absolute flex items-center justify-center transition-all duration-500 ${
                currentView === "top"
                  ? "scale-x-[0.62] scale-y-[1.02]"
                  : "scale-x-[1.02] scale-y-[0.62]"
              }`}
            >
              <div
                className="h-[430px] w-[430px] rounded-full blur-[32px] opacity-80 animate-spin"
                style={{
                  background: RAINBOW_CONIC,
                  animationDuration: duration,
                }}
              />
            </div>

            {/* Tight vivid multicolor perimeter ribbon directly hugging mouse contour */}
            <div
              className={`absolute flex items-center justify-center transition-all duration-500 ${
                currentView === "top"
                  ? "scale-x-[0.58] scale-y-[0.98]"
                  : "scale-x-[0.98] scale-y-[0.58]"
              }`}
            >
              <div
                className="h-[380px] w-[380px] rounded-full blur-[10px] opacity-95 animate-spin"
                style={{
                  background: RAINBOW_CONIC,
                  animationDuration: duration,
                }}
              />
            </div>
          </div>
        )}

        {/* MODES 0 & 1 (STATIC & BREATHE): Soft diffused single-color desk reflection */}
        {hasUnderglow && !isSpectrum && color && (
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-all duration-700 ${
              isBreathe ? "animate-pulse-soft" : ""
            }`}
            style={{ animationDuration: duration }}
          >
            {/* Outer diffused atmospheric aura */}
            <div
              className={`rounded-full blur-[80px] transition-all duration-500 ${
                currentView === "top" ? "h-[460px] w-[320px]" : "h-[320px] w-[480px]"
              }`}
              style={{
                background: color,
                opacity: 0.35,
              }}
            />
            {/* Core diffused underglow following mouse perimeter */}
            <div
              className={`absolute rounded-full blur-[42px] transition-all duration-500 ${
                currentView === "top" ? "h-[360px] w-[240px]" : "h-[240px] w-[380px]"
              }`}
              style={{
                background: color,
                opacity: 0.55,
              }}
            />
          </div>
        )}

        {/* Mouse Photo Render with exact contour drop-shadow */}
        <div className="relative z-10 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            <img
              src={imageSrc}
              alt="KLIM Blaze Wireless Mouse"
              draggable={false}
              className={`block max-h-[380px] xl:max-h-[460px] 2xl:max-h-[540px] w-auto object-contain transition-all duration-300 ${
                currentView === "side" ? "scale-95" : ""
              } ${isBreathe ? "animate-pulse-soft" : ""}`}
              style={{
                animationDuration: duration,
                filter:
                  hasUnderglow && !isSpectrum && color
                    ? `drop-shadow(0 0 12px ${color}) drop-shadow(0 0 26px ${color}88) drop-shadow(0 25px 40px rgba(0,0,0,0.95))`
                    : "drop-shadow(0 25px 35px rgba(0,0,0,0.95))",
              }}
            />

            {/* Glowing Logo LED Overlay (Exact alignment with mouse body) */}
            {currentView === "top" && effectiveLogoColor && !off && (
              <div
                aria-hidden
                className={`pointer-events-none absolute inset-0 z-20 transition-all duration-300 ${
                  isBreathe
                    ? "animate-pulse-soft"
                    : isSpectrum && !logoColor
                    ? "animate-hue-cycle"
                    : ""
                }`}
                style={{
                  animationDuration: duration,
                  backgroundColor: isSpectrum && !logoColor ? "#00f0ff" : effectiveLogoColor,
                  WebkitMaskImage: "url(/images/top-mouse-logo-mask.png)",
                  WebkitMaskSize: "contain",
                  WebkitMaskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskImage: "url(/images/top-mouse-logo-mask.png)",
                  maskSize: "contain",
                  maskRepeat: "no-repeat",
                  maskPosition: "center",
                  filter: `drop-shadow(0 0 6px ${
                    isSpectrum && !logoColor ? "#00f0ff" : effectiveLogoColor
                  }) drop-shadow(0 0 14px ${
                    isSpectrum && !logoColor ? "#00f0ffaa" : effectiveLogoColor + "aa"
                  })`,
                }}
              />
            )}
          </div>
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
