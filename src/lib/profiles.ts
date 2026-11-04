import {
  DEFAULT_DPI,
  type DpiStage,
  type DpiState,
  type LightingState,
  type PollingRate,
  type Profile,
} from "../types";

const STORAGE_KEY = "klim-blaze.profiles.v1";
const POLLING_RATES: readonly number[] = [125, 250, 500, 1000];

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function cloneLighting(lighting: LightingState): LightingState {
  return { ...lighting, color: { ...lighting.color } };
}

function cloneDpi(dpi: DpiState): DpiState {
  return { ...dpi, stages: dpi.stages.map((stage) => ({ ...stage })) };
}

/** Validates imported/exported JSON and fills in every missing field. */
export function normalizeProfiles(input: unknown): Profile[] {
  const list = Array.isArray(input)
    ? input
    : isRecord(input) && Array.isArray(input.profiles)
      ? input.profiles
      : isRecord(input)
        ? [input]
        : [];

  const profiles: Profile[] = [];
  const now = Date.now();

  for (const item of list) {
    if (!isRecord(item)) continue;

    const lightingRaw = isRecord(item.lighting) ? item.lighting : {};
    const colorRaw = isRecord(lightingRaw.color) ? lightingRaw.color : {};
    const mode = clamp(Math.round(num(lightingRaw.mode, 0)), 0, 3) as LightingState["mode"];

    const lighting: LightingState = {
      mode,
      color: {
        r: clamp(Math.round(num(colorRaw.r, 56)), 0, 255),
        g: clamp(Math.round(num(colorRaw.g, 189)), 0, 255),
        b: clamp(Math.round(num(colorRaw.b, 248)), 0, 255),
      },
      speed: clamp(Math.round(num(lightingRaw.speed, 6)), 1, 10),
    };

    const dpiRaw = isRecord(item.dpi) ? item.dpi : {};
    const stagesRaw = Array.isArray(dpiRaw.stages) ? dpiRaw.stages : DEFAULT_DPI.stages;
    const stages: DpiStage[] = [];

    for (const stage of stagesRaw.slice(0, 8)) {
      if (!isRecord(stage)) continue;
      const color =
        typeof stage.color === "string" && /^#[0-9a-fA-F]{6}$/.test(stage.color)
          ? stage.color.toLowerCase()
          : "#38bdf8";
      const dpi = clamp(Math.round(num(stage.dpi, 1200) / 100) * 100, 200, 10000);
      stages.push({ dpi, color });
    }

    if (stages.length === 0) {
      stages.push(...DEFAULT_DPI.stages.map((stage) => ({ ...stage })));
    }

    const polled = num(dpiRaw.pollingRate, 1000);
    const pollingRate = (
      POLLING_RATES.includes(polled) ? polled : 1000
    ) as PollingRate;

    const profile: Profile = {
      id: typeof item.id === "string" && item.id.length > 0 ? item.id : makeId(),
      name:
        typeof item.name === "string" && item.name.trim().length > 0
          ? item.name.trim().slice(0, 60)
          : `Profile ${profiles.length + 1}`,
      lighting,
      dpi: {
        stages,
        activeIndex: clamp(Math.round(num(dpiRaw.activeIndex, 0)), 0, stages.length - 1),
        pollingRate,
      },
      createdAt: num(item.createdAt, now),
      updatedAt: num(item.updatedAt, now),
    };

    profiles.push(profile);
  }

  return profiles;
}

export function loadProfiles(): Profile[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return [];
    return normalizeProfiles(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function persistProfiles(profiles: Profile[]): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch {
    // Quota errors are non-fatal: the session still works in memory.
  }
}

export function makeProfile(name: string, lighting: LightingState, dpi: DpiState): Profile {
  const now = Date.now();
  return {
    id: makeId(),
    name: name.trim().slice(0, 60) || "Untitled profile",
    lighting: cloneLighting(lighting),
    dpi: cloneDpi(dpi),
    createdAt: now,
    updatedAt: now,
  };
}

export function parseProfiles(raw: string): Profile[] {
  try {
    return normalizeProfiles(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function downloadProfiles(profiles: Profile[]): void {
  const payload = {
    app: "klim-blaze",
    version: 1,
    exportedAt: new Date().toISOString(),
    profiles,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `klim-blaze-profiles-${date}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
