import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BACKGROUND_SCENES, LIQUID_GLASS_PRESETS } from '@/lib/liquidglass/presets';
import type {
  BackgroundScene,
  BackgroundSceneId,
  GlassPresetId,
  LiquidGlassContextValue,
  LiquidGlassOpticalSettings,
  OpticalTelemetry,
  RegisteredGlassElement,
} from '@/lib/liquidglass/types';
import type { LiquidGlassEngine } from '@/lib/liquidglass/LiquidGlassEngine';

export const GLASS_SETTINGS_STORAGE_KEY = 'wasmdeck:glass-settings';

export const GLASS_SETTINGS_RANGES: Record<
  keyof LiquidGlassOpticalSettings,
  { min: number; max: number; step: number }
> = {
  refraction: { min: 0.0, max: 0.22, step: 0.005 },
  chroma: { min: 0.0, max: 0.1, step: 0.002 },
  specular: { min: 0.2, max: 3.5, step: 0.1 },
  bevel: { min: 0.02, max: 0.18, step: 0.005 },
};

export const DEFAULT_GLASS_SETTINGS: LiquidGlassOpticalSettings = {
  refraction: LIQUID_GLASS_PRESETS.apple.refraction,
  chroma: LIQUID_GLASS_PRESETS.apple.chroma,
  specular: LIQUID_GLASS_PRESETS.apple.specular,
  bevel: LIQUID_GLASS_PRESETS.apple.bevel,
};

function clampOpticalValue(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

export function sanitizeGlassSettings(raw: unknown): LiquidGlassOpticalSettings {
  if (typeof raw !== 'object' || raw === null) {
    return { ...DEFAULT_GLASS_SETTINGS };
  }
  const record = raw as Record<string, unknown>;
  return {
    refraction: clampOpticalValue(
      record.refraction,
      GLASS_SETTINGS_RANGES.refraction.min,
      GLASS_SETTINGS_RANGES.refraction.max,
      DEFAULT_GLASS_SETTINGS.refraction
    ),
    chroma: clampOpticalValue(
      record.chroma,
      GLASS_SETTINGS_RANGES.chroma.min,
      GLASS_SETTINGS_RANGES.chroma.max,
      DEFAULT_GLASS_SETTINGS.chroma
    ),
    specular: clampOpticalValue(
      record.specular,
      GLASS_SETTINGS_RANGES.specular.min,
      GLASS_SETTINGS_RANGES.specular.max,
      DEFAULT_GLASS_SETTINGS.specular
    ),
    bevel: clampOpticalValue(
      record.bevel,
      GLASS_SETTINGS_RANGES.bevel.min,
      GLASS_SETTINGS_RANGES.bevel.max,
      DEFAULT_GLASS_SETTINGS.bevel
    ),
  };
}

export function loadPersistedGlassSettings(): LiquidGlassOpticalSettings {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_GLASS_SETTINGS };
  }
  try {
    const raw = window.localStorage.getItem(GLASS_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_GLASS_SETTINGS };
    return sanitizeGlassSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_GLASS_SETTINGS };
  }
}

export function persistGlassSettings(settings: LiquidGlassOpticalSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GLASS_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota or restricted context errors
  }
}

export function detectActivePreset(settings: LiquidGlassOpticalSettings): GlassPresetId | 'custom' {
  const EPS = 1e-6;
  const keys: GlassPresetId[] = ['apple', 'water', 'prism', 'mercury'];
  for (const key of keys) {
    const p = LIQUID_GLASS_PRESETS[key];
    if (
      Math.abs(settings.refraction - p.refraction) < EPS &&
      Math.abs(settings.chroma - p.chroma) < EPS &&
      Math.abs(settings.specular - p.specular) < EPS &&
      Math.abs(settings.bevel - p.bevel) < EPS
    ) {
      return key;
    }
  }
  return 'custom';
}

interface LiquidGlassInternalContextValue extends LiquidGlassContextValue {
  elementsMap: Map<string, RegisteredGlassElement>;
  engineRef: React.RefObject<LiquidGlassEngine | null>;
  setTelemetry: React.Dispatch<React.SetStateAction<OpticalTelemetry>>;
}

const LiquidGlassContext = createContext<LiquidGlassInternalContextValue | null>(null);

export interface LiquidGlassProviderProps {
  children: React.ReactNode;
  initialSceneId?: BackgroundSceneId;
  scenes?: BackgroundScene[];
}

export function LiquidGlassProvider({
  children,
  initialSceneId = 'ascii-koi',
  scenes = BACKGROUND_SCENES,
}: LiquidGlassProviderProps) {
  const [elementsMap] = useState<Map<string, RegisteredGlassElement>>(() => new Map());
  const [activeSceneId, setActiveSceneId] = useState<BackgroundSceneId>(initialSceneId);
  const [glassSettings, setGlassSettings] = useState<LiquidGlassOpticalSettings>(() =>
    loadPersistedGlassSettings()
  );
  const [telemetry, setTelemetry] = useState<OpticalTelemetry>({
    fps: 120,
    activeCardsCount: 0,
    activeScene: scenes.find(s => s.id === initialSceneId)?.name ?? initialSceneId,
    dpr: 1,
    viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1920,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });

  const engineRef = useRef<LiquidGlassEngine | null>(null);

  const activePresetId = useMemo(() => detectActivePreset(glassSettings), [glassSettings]);

  const updateGlassSetting = useCallback(
    <K extends keyof LiquidGlassOpticalSettings>(key: K, value: LiquidGlassOpticalSettings[K]) => {
      setGlassSettings(prev => {
        const next = sanitizeGlassSettings({ ...prev, [key]: value });
        persistGlassSettings(next);
        return next;
      });
    },
    []
  );

  const applyGlassPreset = useCallback((presetId: GlassPresetId) => {
    const preset = LIQUID_GLASS_PRESETS[presetId] ?? LIQUID_GLASS_PRESETS.apple;
    const next: LiquidGlassOpticalSettings = {
      refraction: preset.refraction,
      chroma: preset.chroma,
      specular: preset.specular,
      bevel: preset.bevel,
    };
    setGlassSettings(next);
    persistGlassSettings(next);
  }, []);

  const resetGlassSettings = useCallback(() => {
    const next: LiquidGlassOpticalSettings = { ...DEFAULT_GLASS_SETTINGS };
    setGlassSettings(next);
    persistGlassSettings(next);
  }, []);

  useEffect(() => {
    engineRef.current?.setGlobalOverrides(glassSettings);
  }, [glassSettings]);

  const register = useCallback((item: RegisteredGlassElement) => {
    elementsMap.set(item.id, item);
    return () => {
      elementsMap.delete(item.id);
    };
  }, [elementsMap]);

  const updateElement = useCallback((id: string, updates: Partial<RegisteredGlassElement>) => {
    const existing = elementsMap.get(id);
    if (existing) {
      Object.assign(existing, updates);
    }
  }, [elementsMap]);

  const triggerRipple = useCallback((id: string, uvX: number, uvY: number) => {
    const now = typeof performance !== 'undefined' ? performance.now() * 0.001 : Date.now() * 0.001;
    const existing = elementsMap.get(id);
    if (existing) {
      existing.ripplePos = [uvX, uvY];
      existing.rippleStartTime = now;
    }
    if (engineRef.current) {
      engineRef.current.triggerRipple(id, uvX, uvY, now);
    }
  }, [elementsMap]);

  const setTilt = useCallback((id: string, tiltX: number, tiltY: number) => {
    const existing = elementsMap.get(id);
    if (existing) {
      existing.tiltX = tiltX;
      existing.tiltY = tiltY;
    }
    if (engineRef.current) {
      engineRef.current.setTilt(id, tiltX, tiltY);
    }
  }, [elementsMap]);

  const value = useMemo<LiquidGlassInternalContextValue>(() => ({
    register,
    updateElement,
    triggerRipple,
    setTilt,
    activeSceneId,
    setActiveSceneId,
    scenes,
    telemetry,
    glassSettings,
    activePresetId,
    updateGlassSetting,
    applyGlassPreset,
    resetGlassSettings,
    elementsMap,
    engineRef,
    setTelemetry,
  }), [
    register,
    updateElement,
    triggerRipple,
    setTilt,
    activeSceneId,
    scenes,
    telemetry,
    glassSettings,
    activePresetId,
    updateGlassSetting,
    applyGlassPreset,
    resetGlassSettings,
    elementsMap,
  ]);

  return (
    <LiquidGlassContext.Provider value={value}>
      {children}
    </LiquidGlassContext.Provider>
  );
}

export function useLiquidGlass(): LiquidGlassContextValue {
  const ctx = useContext(LiquidGlassContext);
  if (!ctx) {
    throw new Error('useLiquidGlass must be used within a LiquidGlassProvider');
  }
  return ctx;
}

export function useLiquidGlassInternal(): LiquidGlassInternalContextValue {
  const ctx = useContext(LiquidGlassContext);
  if (!ctx) {
    throw new Error('useLiquidGlassInternal must be used within a LiquidGlassProvider');
  }
  return ctx;
}
