import type { LightMode } from "../types";

interface MousePreviewProps {
  color?: string;
  logoColor?: string;
  mode?: LightMode;
  /** 1..10, controls the CSS animation duration. */
  speed?: number;
  /** 1..10, controls brightness (10% to 100%). */
  brightness?: number;
  className?: string;
  showUnderglow?: boolean;
  variant?: "top" | "side";
}

const RAINBOW_CONIC =
  "conic-gradient(from 0deg, #ff0033 0deg, #ff7700 45deg, #ffdd00 90deg, #00ff55 135deg, #00f0ff 180deg, #0066ff 225deg, #9900ff 270deg, #ff0088 315deg, #ff0033 360deg)";

export default function MousePreview({
  color,
  logoColor: _logoColor,
  mode = 0,
  speed = 6,
  brightness = 10,
  className = "",
  showUnderglow = true,
  variant = "top",
}: MousePreviewProps) {
  const off = mode === 3;
  const isBreathe = mode === 1;
  const isSpectrum = mode === 2;
  const brightnessFactor = Math.max(0.1, Math.min(1.0, brightness / 10));

  // Dynamic timing according to speed slider (1..10) calibrated for realistic mouse hardware rate
  const duration = isBreathe
    ? `${Math.max(0.4, 2.5 - speed * 0.21).toFixed(2)}s`
    : isSpectrum
      ? `${Math.max(0.35, 4.0 - speed * 0.365).toFixed(2)}s`
      : undefined;

  const isSide = variant === "side";
  const imageSrc = isSide ? "/images/side-mouse.png" : "/images/top-mouse.png";
  const contourMaskSrc = isSide
    ? "/images/side-mouse-contour-glow.png"
    : "/images/mouse-contour-glow.png";
  const hasUnderglow = showUnderglow && !off;

  return (
    <div
      className={`relative mx-auto flex w-full flex-col items-center justify-center select-none ${className}`}
    >
      {/* Central Hardware Stage Canvas */}
      <div className="relative flex w-full items-center justify-center py-1 xl:py-2">
        {/* MODE 2 (SPECTRUM): Soft diffused desk reflection */}
        {hasUnderglow && isSpectrum && (
          <div
            aria-hidden
            className={`pointer-events-none absolute flex items-center justify-center ${
              isSide ? "inset-0 overflow-hidden" : "-inset-28 overflow-visible"
            }`}
            style={{
              WebkitMaskImage:
                "radial-gradient(ellipse at center, rgba(0,0,0,1) 25%, rgba(0,0,0,0.6) 50%, transparent 70%)",
              maskImage:
                "radial-gradient(ellipse at center, rgba(0,0,0,1) 25%, rgba(0,0,0,0.6) 50%, transparent 70%)",
            }}
          >
            {/* Broad outer atmospheric desk reflection (rainbow) */}
            <div
              className={`absolute flex items-center justify-center transition-all duration-500 ${
                isSide ? "scale-x-[1.3] scale-y-[0.6]" : "scale-x-[0.72] scale-y-[1.10]"
              }`}
            >
              <div
                className={`rounded-full animate-spin ${
                  isSide ? "h-[320px] w-[320px] blur-[60px]" : "h-[560px] w-[560px] blur-[90px]"
                }`}
                style={{
                  background: RAINBOW_CONIC,
                  animationDuration: duration,
                  opacity: 0.30 * brightnessFactor,
                }}
              />
            </div>

            {/* Core diffused underglow pool (rainbow) */}
            <div
              className={`absolute flex items-center justify-center transition-all duration-500 ${
                isSide ? "scale-x-[1.2] scale-y-[0.55]" : "scale-x-[0.66] scale-y-[1.04]"
              }`}
            >
              <div
                className={`rounded-full animate-spin ${
                  isSide ? "h-[240px] w-[240px] blur-[40px]" : "h-[460px] w-[460px] blur-[65px]"
                }`}
                style={{
                  background: RAINBOW_CONIC,
                  animationDuration: duration,
                  opacity: 0.40 * brightnessFactor,
                }}
              />
            </div>
          </div>
        )}

        {/* MODES 0 & 1 (STATIC & BREATHE): Soft diffused single-color desk reflection */}
        {hasUnderglow && !isSpectrum && color && (
          <div
            aria-hidden
            className={`pointer-events-none absolute flex items-center justify-center transition-all duration-700 ${
              isSide ? "inset-0 overflow-hidden" : "-inset-28 overflow-visible"
            } ${isBreathe ? "animate-pulse-soft" : ""}`}
            style={{
              animationDuration: duration,
              WebkitMaskImage: isSide
                ? "radial-gradient(ellipse at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0.5) 60%, transparent 85%)"
                : "radial-gradient(ellipse at center, rgba(0,0,0,1) 25%, rgba(0,0,0,0.6) 50%, transparent 70%)",
              maskImage: isSide
                ? "radial-gradient(ellipse at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0.5) 60%, transparent 85%)"
                : "radial-gradient(ellipse at center, rgba(0,0,0,1) 25%, rgba(0,0,0,0.6) 50%, transparent 70%)",
            }}
          >
            {isSide ? (
              <>
                {/* Horizontal aura tailored to side mouse profile */}
                <div
                  className="rounded-full blur-[45px] transition-all duration-500 h-[130px] w-[380px]"
                  style={{
                    background: color,
                    opacity: 0.32 * brightnessFactor,
                  }}
                />
                {/* Concentrated base glow below mouse underglow bar */}
                <div
                  className="absolute rounded-full blur-[24px] transition-all duration-500 h-[50px] w-[300px] translate-y-6"
                  style={{
                    background: color,
                    opacity: 0.48 * brightnessFactor,
                  }}
                />
              </>
            ) : (
              <>
                {/* Outer diffused atmospheric aura (top-down) */}
                <div
                  className="rounded-full blur-[80px] transition-all duration-500 h-[420px] w-[300px]"
                  style={{
                    background: color,
                    opacity: 0.22 * brightnessFactor,
                  }}
                />
                {/* Core diffused underglow following mouse perimeter */}
                <div
                  className="absolute rounded-full blur-[50px] transition-all duration-500 h-[320px] w-[220px]"
                  style={{
                    background: color,
                    opacity: 0.38 * brightnessFactor,
                  }}
                />
              </>
            )}
          </div>
        )}

        {/* Mouse Photo Render with exact contour drop-shadow */}
        <div className="relative z-10 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            {/* SPECTRUM CONTOUR GLOW: Subtle rotating rainbow silhouette rim hugging the exact mouse shape */}
            {hasUnderglow && isSpectrum && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
                style={{
                  WebkitMaskImage: `url(${contourMaskSrc})`,
                  WebkitMaskSize: "contain",
                  WebkitMaskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskImage: `url(${contourMaskSrc})`,
                  maskSize: "contain",
                  maskRepeat: "no-repeat",
                  maskPosition: "center",
                  opacity: 0.60 * brightnessFactor,
                  filter:
                    "drop-shadow(0 0 6px rgba(255,255,255,0.35)) drop-shadow(0 0 14px rgba(255,255,255,0.2))",
                }}
              >
                <div
                  className="absolute -inset-[60%] animate-spin"
                  style={{
                    background: RAINBOW_CONIC,
                    animationDuration: duration,
                  }}
                />
              </div>
            )}

            <img
              src={imageSrc}
              alt="KLIM Blaze Wireless Mouse"
              draggable={false}
              className={`relative z-10 block w-auto object-contain transition-all duration-300 ${
                isSide
                  ? "max-h-[175px] md:max-h-[195px] xl:max-h-[220px] 2xl:max-h-[240px] max-w-full"
                  : "max-h-[280px] md:max-h-[320px] lg:max-h-[350px] xl:max-h-[390px] 2xl:max-h-[430px]"
              }`}
              style={{
                filter:
                  hasUnderglow && !isSpectrum && color
                    ? `drop-shadow(0 0 12px ${color}99) drop-shadow(0 0 24px ${color}44) drop-shadow(0 20px 30px rgba(0,0,0,0.9))`
                    : "drop-shadow(0 20px 30px rgba(0,0,0,0.9))",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
