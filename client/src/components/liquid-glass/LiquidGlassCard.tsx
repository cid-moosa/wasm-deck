import React, { useEffect, useId, useRef } from 'react';
import type { LiquidGlassPresetParams, PresetKey } from '@/lib/liquidglass/types';
import { useLiquidGlass } from './LiquidGlassContext';

export interface LiquidGlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  preset?: PresetKey | LiquidGlassPresetParams;
  cornerRadius?: number;
  disableTilt?: boolean;
  disableRipple?: boolean;
  tiltIntensity?: number;
  children?: React.ReactNode;
}

export const LiquidGlassCard = React.forwardRef<HTMLDivElement, LiquidGlassCardProps>(function LiquidGlassCard(
  {
    preset = 'apple',
    cornerRadius,
    disableTilt = true,
    disableRipple = true,
    tiltIntensity = 0.0,
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
  const innerRef = useRef<HTMLDivElement | null>(null);
  const cardRef = (forwardedRef as React.RefObject<HTMLDivElement>) || innerRef;
  const { register, updateElement, triggerRipple, setTilt } = useLiquidGlass();

  // Register DOM element with the WebGL engine
  useEffect(() => {
    const el = cardRef.current;
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
      zIndex: 10,
    });

    return unregister;
  }, [cardRef, generatedId, preset, cornerRadius, register]);

  // Update preset or corner radius if props change
  useEffect(() => {
    updateElement(generatedId, {
      preset,
      radius: cornerRadius,
    });
  }, [generatedId, preset, cornerRadius, updateElement]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(e);
    if (disableTilt) return;

    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const halfScreenW = window.innerWidth * 0.5;
    const halfScreenH = window.innerHeight * 0.5;

    const tiltX = ((e.clientX - centerX) / halfScreenW) * tiltIntensity;
    const tiltY = ((e.clientY - centerY) / halfScreenH) * tiltIntensity;

    setTilt(generatedId, tiltX, tiltY);
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(e);
    if (!disableTilt) {
      setTilt(generatedId, 0, 0);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    onPointerDown?.(e);
    if (disableRipple) return;

    const uvX = e.clientX / window.innerWidth;
    const uvY = e.clientY / window.innerHeight;
    triggerRipple(generatedId, uvX, uvY);
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      className={`relative z-10 rounded-[28px] border border-white/20 bg-white/[0.03] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] transition-shadow duration-300 hover:shadow-[0_16px_48px_0_rgba(0,0,0,0.5)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});
