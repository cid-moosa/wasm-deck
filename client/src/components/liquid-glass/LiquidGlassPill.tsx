import React, { useEffect, useId, useRef } from 'react';
import type { LiquidGlassPresetParams, PresetKey } from '@/lib/liquidglass/types';
import { useLiquidGlass } from './LiquidGlassContext';

export interface LiquidGlassPillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  preset?: PresetKey | LiquidGlassPresetParams;
  cornerRadius?: number;
  disableTilt?: boolean;
  disableRipple?: boolean;
  active?: boolean;
  children?: React.ReactNode;
}

export const LiquidGlassPill = React.forwardRef<HTMLButtonElement, LiquidGlassPillProps>(function LiquidGlassPill(
  {
    preset = 'apple',
    cornerRadius,
    disableTilt = true,
    disableRipple = true,
    active = false,
    className = '',
    children,
    onPointerMove,
    onPointerLeave,
    onPointerDown,
    ...props
  },
  forwardedRef
) {
  const generatedId = useId();
  const innerRef = useRef<HTMLButtonElement | null>(null);
  const pillRef = (forwardedRef as React.RefObject<HTMLButtonElement>) || innerRef;
  const { register, updateElement, triggerRipple, setTilt } = useLiquidGlass();

  useEffect(() => {
    const el = pillRef.current;
    if (!el) return;

    const unregister = register({
      id: generatedId,
      element: el,
      preset,
      radius: cornerRadius,
      tiltX: 0,
      tiltY: 0,
      ripplePos: [0.5, 0.5],
      rippleStartTime: -999.0,
      zIndex: 20,
    });

    return unregister;
  }, [pillRef, generatedId, preset, cornerRadius, register]);

  useEffect(() => {
    updateElement(generatedId, { preset, radius: cornerRadius });
  }, [generatedId, preset, cornerRadius, updateElement]);

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    onPointerMove?.(e);
    if (disableTilt) return;

    const el = pillRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const tiltX = ((e.clientX - centerX) / (window.innerWidth * 0.5)) * 0.15;
    const tiltY = ((e.clientY - centerY) / (window.innerHeight * 0.5)) * 0.15;

    setTilt(generatedId, tiltX, tiltY);
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLButtonElement>) => {
    onPointerLeave?.(e);
    if (!disableTilt) {
      setTilt(generatedId, 0, 0);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    onPointerDown?.(e);
    if (disableRipple) return;

    const uvX = e.clientX / window.innerWidth;
    const uvY = e.clientY / window.innerHeight;
    triggerRipple(generatedId, uvX, uvY);
  };

  return (
    <button
      ref={pillRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      className={`relative z-20 inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 outline-none select-none cursor-pointer ${
        active
          ? 'border border-cyan-300/80 bg-white/15 text-white shadow-[0_0_20px_rgba(0,255,255,0.35)]'
          : 'border border-white/25 bg-white/[0.04] text-white/90 hover:border-white/50 hover:bg-white/10 hover:text-white shadow-[0_4px_16px_rgba(0,0,0,0.25)]'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});
