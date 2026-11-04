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
      <div className="relative flex w-full items-center justify-center py-2 xl:py-4">
        {/* MODE 2 (SPECTRUM): Soft diffused desk reflection */}
        {hasUnderglow && isSpectrum && (
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-44 flex items-center justify-center overflow-visible"
            style={{
              WebkitMaskImage:
                "radial-gradient(ellipse at center, rgba(0,0,0,1) 25%, rgba(0,0,0,0.6) 50%, transparent 70%)",
              maskImage:
                "radial-gradient(ellipse at center, rgba(0,0,0,1) 25%, rgba(0,0,0,0.6) 50%, transparent 70%)",
            }}
          >
            {/* Broad outer atmospheric desk reflection (rainbow) */}
            <div className="absolute flex items-center justify-center transition-all duration-500 scale-x-[0.72] scale-y-[1.10]">
              <div
                className="h-[560px] w-[560px] rounded-full blur-[90px] animate-spin"
                style={{
                  background: RAINBOW_CONIC,
                  animationDuration: duration,
                  opacity: 0.30 * brightnessFactor,
                }}
              />
            </div>

            {/* Core diffused underglow pool (rainbow) */}
            <div className="absolute flex items-center justify-center transition-all duration-500 scale-x-[0.66] scale-y-[1.04]">
              <div
                className="h-[460px] w-[460px] rounded-full blur-[65px] animate-spin"
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
            className={`pointer-events-none absolute -inset-44 flex items-center justify-center transition-all duration-700 ${
              isBreathe ? "animate-pulse-soft" : ""
            }`}
            style={{
              animationDuration: duration,
              WebkitMaskImage:
                "radial-gradient(ellipse at center, rgba(0,0,0,1) 25%, rgba(0,0,0,0.6) 50%, transparent 70%)",
              maskImage:
                "radial-gradient(ellipse at center, rgba(0,0,0,1) 25%, rgba(0,0,0,0.6) 50%, transparent 70%)",
            }}
          >
            {/* Outer diffused atmospheric aura */}
            <div
              className="rounded-full blur-[90px] transition-all duration-500 h-[460px] w-[320px]"
              style={{
                background: color,
                opacity: 0.22 * brightnessFactor,
              }}
            />
            {/* Core diffused underglow following mouse perimeter */}
            <div
              className="absolute rounded-full blur-[55px] transition-all duration-500 h-[360px] w-[240px]"
              style={{
                background: color,
                opacity: 0.38 * brightnessFactor,
              }}
            />
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
                  ? "max-h-[220px] md:max-h-[250px] lg:max-h-[280px] xl:max-h-[310px] 2xl:max-h-[340px] max-w-full"
                  : "max-h-[280px] md:max-h-[320px] lg:max-h-[350px] xl:max-h-[390px] 2xl:max-h-[430px]"
              }`}
              style={{
                filter:
                  hasUnderglow && !isSpectrum && color
                    ? `drop-shadow(0 0 10px ${color}88) drop-shadow(0 0 20px ${color}44) drop-shadow(0 25px 40px rgba(0,0,0,0.95))`
                    : "drop-shadow(0 25px 35px rgba(0,0,0,0.95))",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
