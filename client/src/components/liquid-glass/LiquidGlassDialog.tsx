import React, { useEffect, useId, useRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { LiquidGlassPresetParams, PresetKey } from '@/lib/liquidglass/types';
import { useLiquidGlass } from './LiquidGlassContext';

export interface LiquidGlassDialogProps extends React.ComponentProps<typeof DialogPrimitive.Root> {}

export function LiquidGlassDialog(props: LiquidGlassDialogProps) {
  return <DialogPrimitive.Root {...props} />;
}

export const LiquidGlassDialogTrigger = DialogPrimitive.Trigger;
export const LiquidGlassDialogClose = DialogPrimitive.Close;
export const LiquidGlassDialogPortal = DialogPrimitive.Portal;

export interface LiquidGlassDialogContentProps extends React.ComponentProps<typeof DialogPrimitive.Content> {
  preset?: PresetKey | LiquidGlassPresetParams;
  cornerRadius?: number;
  disableTilt?: boolean;
  disableRipple?: boolean;
  showCloseButton?: boolean;
}

export const LiquidGlassDialogContent = React.forwardRef<HTMLDivElement, LiquidGlassDialogContentProps>(
  function LiquidGlassDialogContent(
    {
      preset = 'apple',
      cornerRadius,
      disableTilt = true,
      disableRipple = true,
      showCloseButton = true,
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
    const contentRef = (forwardedRef as React.RefObject<HTMLDivElement>) || innerRef;
    const { register, updateElement, triggerRipple, setTilt } = useLiquidGlass();

    // Register modal content element with WebGL engine at top z-index (60)
    useEffect(() => {
      const el = contentRef.current;
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
        zIndex: 60,
      });

      return unregister;
    }, [contentRef, generatedId, preset, cornerRadius, register]);

    useEffect(() => {
      updateElement(generatedId, { preset, radius: cornerRadius });
    }, [generatedId, preset, cornerRadius, updateElement]);

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      onPointerMove?.(e);
      if (disableTilt) return;

      const el = contentRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const tiltX = ((e.clientX - centerX) / (window.innerWidth * 0.5)) * 0.18;
      const tiltY = ((e.clientY - centerY) / (window.innerHeight * 0.5)) * 0.18;

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
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/35 transition-opacity duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          ref={contentRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onPointerDown={handlePointerDown}
          className={`fixed left-1/2 top-1/2 z-60 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg rounded-[28px] border border-white/25 bg-white/[0.04] p-8 text-white shadow-[0_24px_64px_rgba(0,0,0,0.65)] duration-200 outline-none select-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ${className}`}
          {...props}
        >
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close className="absolute right-5 top-5 rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer outline-none">
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    );
  }
);

export function LiquidGlassDialogHeader({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex flex-col gap-2 text-left mb-5 ${className}`} {...props} />;
}

export function LiquidGlassDialogTitle({ className = '', ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={`text-2xl font-bold tracking-tight text-white ${className}`} {...props} />;
}

export function LiquidGlassDialogDescription({ className = '', ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={`text-sm text-white/70 leading-relaxed ${className}`} {...props} />;
}

export function LiquidGlassDialogFooter({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex items-center justify-end gap-3 mt-6 ${className}`} {...props} />;
}
