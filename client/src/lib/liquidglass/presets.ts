/**
 * Standard Presets and Background Scenes for the WebGL Liquid Glass Engine.
 * 
 * Presets replicate the exact optical parameters from the reference implementation
 * (liquidglass_webgl_demo.html lines 368-373).
 */

import type { BackgroundScene, LiquidGlassOpticalSettings, LiquidGlassPresetParams, PresetKey, PresetMetadata } from './types';

export const LIQUID_GLASS_PRESETS: Record<PresetKey, LiquidGlassPresetParams> = {
  apple: {
    refraction: 0.080,
    chroma: 0.045,
    wave: 0.012,
    speed: 1.0,
    specular: 1.5,
    bevel: 0.085,
  },
  water: {
    refraction: 0.120,
    chroma: 0.030,
    wave: 0.045,
    speed: 2.2,
    specular: 2.0,
    bevel: 0.090,
  },
  prism: {
    refraction: 0.140,
    chroma: 0.095,
    wave: 0.008,
    speed: 0.8,
    specular: 2.5,
    bevel: 0.110,
  },
  mercury: {
    refraction: 0.190,
    chroma: 0.020,
    wave: 0.025,
    speed: 1.4,
    specular: 3.2,
    bevel: 0.130,
  },
};

export const DEFAULT_OPTICAL_SETTINGS: LiquidGlassOpticalSettings = {
  refraction: LIQUID_GLASS_PRESETS.apple.refraction,
  chroma: LIQUID_GLASS_PRESETS.apple.chroma,
  specular: LIQUID_GLASS_PRESETS.apple.specular,
  bevel: LIQUID_GLASS_PRESETS.apple.bevel,
};

export const PRESET_METADATA: Record<PresetKey, PresetMetadata> = {
  apple: {
    key: 'apple',
    name: 'Apple Vision',
    tagline: 'Pristine Dielectric Clarity',
    description: 'Clean spatial glass with subtle balanced refraction, soft chromatic fringes, and delicate harmonic breathing waves.',
    params: LIQUID_GLASS_PRESETS.apple,
  },
  water: {
    key: 'water',
    name: 'Water Ripple',
    tagline: 'Dynamic Fluid Surface',
    description: 'Active fluid wave oscillations with higher refractive bending power simulating light traversing dynamic aqueous ripples.',
    params: LIQUID_GLASS_PRESETS.water,
  },
  prism: {
    key: 'prism',
    name: 'Prism Rainbow',
    tagline: 'Flint Glass Dispersion',
    description: 'High chromatic dispersion separating spectral wavelengths into brilliant rainbow diffraction fringes along curved bevels.',
    params: LIQUID_GLASS_PRESETS.prism,
  },
  mercury: {
    key: 'mercury',
    name: 'Heavy Liquid',
    tagline: 'Viscous Metallic Meniscus',
    description: 'Dense refractive power, deep curvature bevel, and brilliant Blinn-Phong specular gloss resembling liquid mercury.',
    params: LIQUID_GLASS_PRESETS.mercury,
  },
};

export const BACKGROUND_SCENES: BackgroundScene[] = [
  {
    id: 'ascii-koi',
    name: 'ASCII Koi Pond',
    category: 'ascii',
    description: 'Animated character-cell koi pond with swimming kohaku, sanke, and tancho koi beneath drifting water caustics.',
    isAnimated: true,
  },
  {
    id: 'bamboo',
    name: 'Bamboo Grove',
    category: 'natural',
    description: 'Lush emerald bamboo forest with radiant sunbeams and organic green caustics.',
    url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1920&q=85',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    category: 'neon',
    description: 'Vibrant Tokyo rain-slicked alley with intense magenta, cyan, and amber reflections.',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=85',
  },
  {
    id: 'ocean',
    name: 'Deep Ocean',
    category: 'ocean',
    description: 'Subterranean azure abyss with shimmering optical caustic light ribbons.',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=85',
  },
  {
    id: 'nebula',
    name: 'Cosmic Nebula',
    category: 'space',
    description: 'Deep violet stellar dust cloud with scattered diamond star clusters.',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=85',
  },
  {
    id: 'procedural',
    name: 'Offline Procedural',
    category: 'procedural',
    description: 'High-contrast synthetic multi-gradient caustic field generated 100% offline via canvas math.',
    isProcedural: true,
  },
];

/**
 * Resolves a preset key or custom parameter object into a concrete LiquidGlassPresetParams record.
 */
export function resolvePreset(preset?: PresetKey | LiquidGlassPresetParams): LiquidGlassPresetParams {
  if (!preset) {
    return LIQUID_GLASS_PRESETS.apple;
  }
  if (typeof preset === 'string') {
    return LIQUID_GLASS_PRESETS[preset] || LIQUID_GLASS_PRESETS.apple;
  }
  return {
    refraction: Number.isFinite(preset.refraction) ? preset.refraction : LIQUID_GLASS_PRESETS.apple.refraction,
    chroma: Number.isFinite(preset.chroma) ? preset.chroma : LIQUID_GLASS_PRESETS.apple.chroma,
    wave: Number.isFinite(preset.wave) ? preset.wave : LIQUID_GLASS_PRESETS.apple.wave,
    speed: Number.isFinite(preset.speed) ? preset.speed : LIQUID_GLASS_PRESETS.apple.speed,
    specular: Number.isFinite(preset.specular) ? preset.specular : LIQUID_GLASS_PRESETS.apple.specular,
    bevel: Number.isFinite(preset.bevel) ? preset.bevel : LIQUID_GLASS_PRESETS.apple.bevel,
  };
}
