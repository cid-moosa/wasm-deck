export type GameMirror = {
  label: string;
  url: string;
};

export type GameRecord = {
  id: string;
  title: string;
  category: string;
  engine: string | null;
  delivery: string | null;
  memoryEst: string | null;
  multiplayer: boolean;
  iframeCompatible: boolean;
  thumbnailUrl: string | null;
  primaryUrl: string | null;
  mirrors: GameMirror[];
  notes: string | null;
  popular: boolean;
  sourceStatus: "listed";
};

export const CATEGORIES = [
  { id: "aaa-console", label: "AAA & console", short: "AAA / console" },
  { id: "nintendo-decomp", label: "Nintendo decomps", short: "Nintendo" },
  { id: "classic-pc", label: "Classic PC", short: "Classic PC" },
  { id: "retro-arcade", label: "Retro arcade", short: "Arcade" },
  { id: "flash-classics", label: "Flash classics", short: "Flash" },
  { id: "modern-indie", label: "Modern indie", short: "Indie" },
  { id: "hubs", label: "Port hubs", short: "Hubs" },
] as const;

export function categoryLabel(category: string): string {
  return CATEGORIES.find((item) => item.id === category)?.label ?? category.replaceAll("-", " ");
}

export function safeGameUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}
