/**
 * TypeScript type definitions for the Physical WebGL Liquid Glass Engine.
 * 
 * Supports SDF rounded-box analytical bevel normals, Snell's law refraction,
 * wavelength-dependent chromatic dispersion, harmonic liquid breathing waves,
 * pointer-driven 3D tilt, and interactive click ripple shockwaves.
 */

export interface LiquidGlassPresetParams {
  /** Optical refractive bending power [0.000, 0.220] */
  refraction: number;
  /** Wavelength-dependent chromatic dispersion RGB channel separation [0.000, 0.100] */
  chroma: number;
  /** Harmonic liquid wave perturbation amplitude [0.000, 0.060] */
  wave: number;
  /** Fluid breathing animation speed multiplier [0.0, 4.0] */
  speed: number;
  /** Blinn-Phong specular gloss intensity [0.2, 3.5] */
  specular: number;
  /** Analytical corner curvature bevel radius factor [0.020, 0.180] */
  bevel: number;
}

export interface LiquidGlassOpticalSettings {
  /** Optical refractive bending power [0.000, 0.220] */
  refraction: number;
  /** Wavelength-dependent chromatic dispersion RGB channel separation [0.000, 0.100] */
  chroma: number;
  /** Blinn-Phong specular gloss intensity [0.2, 3.5] */
  specular: number;
  /** Analytical corner curvature bevel radius factor [0.020, 0.180] */
  bevel: number;
}

export type PresetKey = 'apple' | 'water' | 'prism' | 'mercury';
export type GlassPresetId = PresetKey;
export type BackgroundSceneId = string;

export interface PresetMetadata {
  key: PresetKey;
  name: string;
  tagline: string;
  description: string;
  params: LiquidGlassPresetParams;
}

export interface RegisteredGlassElement {
  id: string;
  element: HTMLElement;
  preset: PresetKey | LiquidGlassPresetParams;
  radius?: number;
  tiltX: number;
  tiltY: number;
  ripplePos: [number, number];
  rippleStartTime: number;
  zIndex?: number;
}

export interface EngineOptions {
  dprMax?: number;
  antialias?: boolean;
  alpha?: boolean;
  defaultBackground?: string;
}

export interface BackgroundScene {
  id: string;
  name: string;
  category: 'natural' | 'neon' | 'ocean' | 'space' | 'procedural' | 'ascii';
  description: string;
  url?: string;
  isProcedural?: boolean;
  isAnimated?: boolean;
}

export interface OpticalTelemetry {
  fps: number;
  activeCardsCount: number;
  activeScene: string;
  dpr: number;
  viewportWidth: number;
  viewportHeight: number;
}

export interface LiquidGlassContextValue {
  register: (element: RegisteredGlassElement) => () => void;
  updateElement: (id: string, updates: Partial<RegisteredGlassElement>) => void;
  triggerRipple: (id: string, uvX: number, uvY: number) => void;
  setTilt: (id: string, tiltX: number, tiltY: number) => void;
  activeSceneId: BackgroundSceneId;
  setActiveSceneId: (sceneId: BackgroundSceneId) => void;
  scenes: BackgroundScene[];
  telemetry: OpticalTelemetry;
  glassSettings: LiquidGlassOpticalSettings;
  activePresetId: GlassPresetId | 'custom';
  updateGlassSetting: <K extends keyof LiquidGlassOpticalSettings>(
    key: K,
    value: LiquidGlassOpticalSettings[K]
  ) => void;
  applyGlassPreset: (presetId: GlassPresetId) => void;
  resetGlassSettings: () => void;
}
