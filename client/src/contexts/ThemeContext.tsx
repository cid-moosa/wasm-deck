import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import type { AsciiKoiPalette } from "@/lib/liquidglass/asciiKoiPond";

export type BaseTheme = "light" | "dark";

export interface AccentColorPreset {
  id: string;
  name: string;
  hex: string;
  inkHex: string;
  glow: string;
  description: string;
}

export interface BgMoodPreset {
  id: string;
  name: string;
  bgHex: string;
  panelHex: string;
  panelRaisedHex: string;
  waterHex: string;
}

export const ACCENT_PRESETS: AccentColorPreset[] = [
  {
    id: "lime",
    name: "Electric Lime",
    hex: "#c8f36a",
    inkHex: "#191c12",
    glow: "rgba(200, 243, 106, 0.22)",
    description: "Classic WASM//DECK terminal matrix lime",
  },
  {
    id: "cyan",
    name: "Cyber Cyan",
    hex: "#00f0ff",
    inkHex: "#041922",
    glow: "rgba(0, 240, 255, 0.22)",
    description: "High-contrast electric arcade cyan",
  },
  {
    id: "violet",
    name: "Neon Violet",
    hex: "#c084fc",
    inkHex: "#1d0b36",
    glow: "rgba(192, 132, 252, 0.22)",
    description: "Synthwave vaporwave neon purple",
  },
  {
    id: "amber",
    name: "Solar Amber",
    hex: "#fbbf24",
    inkHex: "#2b1702",
    glow: "rgba(251, 191, 36, 0.22)",
    description: "Warm retro amber CRT phosphor glow",
  },
  {
    id: "emerald",
    name: "Emerald Mint",
    hex: "#34d399",
    inkHex: "#062618",
    glow: "rgba(52, 211, 153, 0.22)",
    description: "Crisp digital emerald jade",
  },
  {
    id: "rose",
    name: "Sakura Rose",
    hex: "#f472b6",
    inkHex: "#2b0a1a",
    glow: "rgba(244, 114, 182, 0.22)",
    description: "Vibrant neon cyberpunk pink",
  },
  {
    id: "crimson",
    name: "Laser Crimson",
    hex: "#f87171",
    inkHex: "#2b0a0a",
    glow: "rgba(248, 113, 113, 0.22)",
    description: "Aggressive arcade warning red",
  },
  {
    id: "monochrome",
    name: "Pure Monochrome",
    hex: "#ffffff",
    inkHex: "#0b0d09",
    glow: "rgba(255, 255, 255, 0.18)",
    description: "Minimalist ultra-clean grayscale",
  },
];

export const BG_MOOD_PRESETS: BgMoodPreset[] = [
  {
    id: "void",
    name: "Deep Void",
    bgHex: "#10110f",
    panelHex: "#171915",
    panelRaisedHex: "#1e201a",
    waterHex: "#0e2a32",
  },
  {
    id: "navy",
    name: "Midnight Navy",
    bgHex: "#090d16",
    panelHex: "#0f1624",
    panelRaisedHex: "#151f33",
    waterHex: "#071c2c",
  },
  {
    id: "obsidian",
    name: "Obsidian Black",
    bgHex: "#050607",
    panelHex: "#111215",
    panelRaisedHex: "#18191e",
    waterHex: "#091216",
  },
  {
    id: "carbon",
    name: "Cyber Synth",
    bgHex: "#110b17",
    panelHex: "#1a1224",
    panelRaisedHex: "#241933",
    waterHex: "#170f2b",
  },
];

export type AnimationMode = "smooth" | "eco";
export type FishDensity = "zen" | "normal" | "dense";
export type AsciiAnimationId = "koi" | "matrix" | "waves" | "starfield" | "life";

export interface AsciiAnimationPreset {
  id: AsciiAnimationId;
  name: string;
  tagline: string;
  description: string;
  iconName: "Fish" | "Terminal" | "Waves" | "Sparkles" | "Activity";
}

export const ASCII_ANIMATION_PRESETS: AsciiAnimationPreset[] = [
  {
    id: "koi",
    name: "ASCII Koi Pond",
    tagline: "Organic Water Simulation",
    description: "Tranquil swimming Japanese koi with dynamic caustics, ripples, and feeding wakes.",
    iconName: "Fish",
  },
  {
    id: "matrix",
    name: "Cyber Matrix Rain",
    tagline: "Cascading Code Streams",
    description: "Falling katakana & hexadecimal code streams with glowing head glyphs and phosphor trails.",
    iconName: "Terminal",
  },
  {
    id: "waves",
    name: "Synthwave Grid",
    tagline: "3D Perspective Waves",
    description: "Retro 80s mathematical wireframe ASCII wave landscape rolling toward the horizon.",
    iconName: "Waves",
  },
  {
    id: "starfield",
    name: "Hyperspace Warp",
    tagline: "Deep Space Velocity",
    description: "3D ASCII starfield warp-drive particle tunnel with interactive mouse parallax.",
    iconName: "Sparkles",
  },
  {
    id: "life",
    name: "Game of Life",
    tagline: "Living Cellular Automata",
    description: "Conway's classic cellular automata grid self-evolving with gliders and cosmic sparks.",
    iconName: "Activity",
  },
];

interface ThemeContextType {
  theme: BaseTheme;
  setTheme: (t: BaseTheme) => void;
  toggleTheme: () => void;
  accent: AccentColorPreset;
  setAccentId: (id: string) => void;
  bgMood: BgMoodPreset;
  setBgMoodId: (id: string) => void;
  animationMode: AnimationMode;
  setAnimationMode: (mode: AnimationMode) => void;
  fishDensity: FishDensity;
  setFishDensity: (density: FishDensity) => void;
  asciiAnimation: AsciiAnimationId;
  setAsciiAnimation: (anim: AsciiAnimationId) => void;
  asciiPalette: AsciiKoiPalette;
  resetThemeSettings: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<BaseTheme>(() => readStorage<BaseTheme>("wasmdeck:theme", "dark"));
  const [accentId, setAccentId] = useState<string>(() => readStorage<string>("wasmdeck:accent-id", "lime"));
  const [bgMoodId, setBgMoodId] = useState<string>(() => readStorage<string>("wasmdeck:bg-mood-id", "void"));
  const [animationMode, setAnimationMode] = useState<AnimationMode>(() => readStorage<AnimationMode>("wasmdeck:anim-mode", "smooth"));
  const [fishDensity, setFishDensity] = useState<FishDensity>(() => readStorage<FishDensity>("wasmdeck:fish-density", "normal"));
  const [asciiAnimation, setAsciiAnimation] = useState<AsciiAnimationId>(() => readStorage<AsciiAnimationId>("wasmdeck:ascii-anim", "koi"));

  const accent = useMemo(
    () => ACCENT_PRESETS.find((a) => a.id === accentId) ?? ACCENT_PRESETS[0],
    [accentId]
  );

  const bgMood = useMemo(
    () => BG_MOOD_PRESETS.find((b) => b.id === bgMoodId) ?? BG_MOOD_PRESETS[0],
    [bgMoodId]
  );

  // Apply CSS custom properties across documentElement and .site-shell
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    localStorage.setItem("wasmdeck:theme", JSON.stringify(theme));

    if (theme === "dark") {
      root.style.setProperty("--bg", bgMood.bgHex);
      root.style.setProperty("--panel", bgMood.panelHex);
      root.style.setProperty("--panel-raised", bgMood.panelRaisedHex);
      root.style.setProperty("--lime", accent.hex);
      root.style.setProperty("--lime-ink", accent.inkHex);
      root.style.setProperty("--accent-ink", accent.hex);
      root.style.setProperty("--accent-glow", accent.glow);
    } else {
      root.style.setProperty("--lime", accent.hex === "#ffffff" ? "#222222" : accent.hex);
      root.style.setProperty("--lime-ink", accent.hex === "#ffffff" ? "#ffffff" : accent.inkHex);
      root.style.setProperty("--accent-ink", accent.hex === "#ffffff" ? "#111111" : accent.hex);
      root.style.setProperty("--accent-glow", accent.glow);
    }
  }, [theme, accent, bgMood]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem("wasmdeck:accent-id", JSON.stringify(accentId));
  }, [accentId]);

  useEffect(() => {
    localStorage.setItem("wasmdeck:bg-mood-id", JSON.stringify(bgMoodId));
  }, [bgMoodId]);

  useEffect(() => {
    localStorage.setItem("wasmdeck:anim-mode", JSON.stringify(animationMode));
  }, [animationMode]);

  useEffect(() => {
    localStorage.setItem("wasmdeck:fish-density", JSON.stringify(fishDensity));
  }, [fishDensity]);

  useEffect(() => {
    localStorage.setItem("wasmdeck:ascii-anim", JSON.stringify(asciiAnimation));
  }, [asciiAnimation]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const resetThemeSettings = () => {
    setTheme("dark");
    setAccentId("lime");
    setBgMoodId("void");
    setAnimationMode("smooth");
    setFishDensity("normal");
    setAsciiAnimation("koi");
  };

  const asciiPalette = useMemo<AsciiKoiPalette>(() => {
    const isDark = theme === "dark";
    return {
      water: isDark ? bgMood.waterHex : "#e5e9ea",
      ink: isDark ? "#ebe6dc" : "#2a2825",
      accent: accent.hex,
      koiLight: isDark ? "#ece6da" : "#f5f3ec",
      koiDark: isDark ? "#3a3632" : "#201d1a",
      dark: isDark,
    };
  }, [theme, accent.hex, bgMood.waterHex]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        accent,
        setAccentId,
        bgMood,
        setBgMoodId,
        animationMode,
        setAnimationMode,
        fishDensity,
        setFishDensity,
        asciiAnimation,
        setAsciiAnimation,
        asciiPalette,
        resetThemeSettings,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
