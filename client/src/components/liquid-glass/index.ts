/**
 * Physical WebGL Liquid Glass Component Library
 */

export * from '@/lib/liquidglass/types';
export * from '@/lib/liquidglass/presets';
export * from '@/lib/liquidglass/procedural-texture';
export * from '@/lib/liquidglass/asciiKoiPond';
export * from '@/lib/liquidglass/LiquidGlassEngine';

export {
  LiquidGlassProvider,
  useLiquidGlass,
  useLiquidGlassInternal,
  GLASS_SETTINGS_STORAGE_KEY,
  GLASS_SETTINGS_RANGES,
  DEFAULT_GLASS_SETTINGS,
  sanitizeGlassSettings,
  loadPersistedGlassSettings,
  persistGlassSettings,
  detectActivePreset,
  type LiquidGlassProviderProps,
} from './LiquidGlassContext';

export {
  LiquidGlassCanvas,
  type LiquidGlassCanvasProps,
} from './LiquidGlassCanvas';

export {
  LiquidGlassCard,
  type LiquidGlassCardProps,
} from './LiquidGlassCard';

export {
  LiquidGlassPill,
  type LiquidGlassPillProps,
} from './LiquidGlassPill';

export {
  LiquidGlassDialog,
  LiquidGlassDialogTrigger,
  LiquidGlassDialogContent,
  LiquidGlassDialogHeader,
  LiquidGlassDialogTitle,
  LiquidGlassDialogDescription,
  LiquidGlassDialogFooter,
  LiquidGlassDialogClose,
  type LiquidGlassDialogProps,
  type LiquidGlassDialogContentProps,
} from './LiquidGlassDialog';
