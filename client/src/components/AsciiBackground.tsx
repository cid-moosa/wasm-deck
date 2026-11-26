import React, { useEffect, useRef, useState } from "react";
import { createAsciiKoiPond, type AsciiKoiPondController } from "@/lib/liquidglass/asciiKoiPond";
import {
  createGameOfLife,
  createHyperspaceStarfield,
  createMatrixRain,
  createSynthwaveGrid,
  type AsciiEngineController,
  type AsciiEnginePalette,
} from "@/lib/ascii/asciiEngines";
import { useTheme } from "@/contexts/ThemeContext";

export interface AsciiBackgroundProps {
  className?: string;
}

type GenericAsciiController = {
  resize: (width: number, height: number, dpr?: number) => void;
  stepAndRender: (nowMs: number) => void | boolean;
  destroy: () => void;
  setPalette?: (palette: any) => void;
  onPointerMove?: (x: number, y: number) => void;
  feed?: (x: number, y: number, count?: number) => void;
};

export default function AsciiBackground({ className = "" }: AsciiBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controllerRef = useRef<GenericAsciiController | null>(null);
  const pointerPos = useRef({
    x: typeof window !== "undefined" ? window.innerWidth / 2 : 500,
    y: typeof window !== "undefined" ? window.innerHeight / 2 : 400,
  });
  const [toasts, setToasts] = useState<Array<{ id: number; text: string; x: number; y: number }>>([]);
  const { asciiAnimation, asciiPalette, accent, bgMood, animationMode, fishDensity } = useTheme();

  const paletteRef = useRef({
    koi: asciiPalette,
    engine: {
      bg: bgMood.bgHex,
      accent: accent.hex,
      faint: "#888888",
      glow: accent.glow,
    } as AsciiEnginePalette,
  });

  paletteRef.current = {
    koi: asciiPalette,
    engine: {
      bg: bgMood.bgHex,
      accent: accent.hex,
      faint: "#888888",
      glow: accent.glow,
    },
  };

  // Initialize and run selected ASCII animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    let controller: GenericAsciiController;

    if (asciiAnimation === "matrix") {
      controller = createMatrixRain(canvas, {
        width: w,
        height: h,
        dpr,
        palette: paletteRef.current.engine,
      });
    } else if (asciiAnimation === "waves") {
      controller = createSynthwaveGrid(canvas, {
        width: w,
        height: h,
        dpr,
        palette: paletteRef.current.engine,
      });
    } else if (asciiAnimation === "starfield") {
      controller = createHyperspaceStarfield(canvas, {
        width: w,
        height: h,
        dpr,
        palette: paletteRef.current.engine,
      });
    } else if (asciiAnimation === "life") {
      controller = createGameOfLife(canvas, {
        width: w,
        height: h,
        dpr,
        palette: paletteRef.current.engine,
      });
    } else {
      // Default: "koi"
      const mostFish = fishDensity === "dense" ? 14 : fishDensity === "zen" ? 3 : 7;
      controller = createAsciiKoiPond({
        canvas,
        width: w,
        height: h,
        dpr,
        most: mostFish,
        palette: () => paletteRef.current.koi,
      });
    }

    controllerRef.current = controller;

    const handleResize = () => {
      if (controllerRef.current && typeof window !== "undefined") {
        controllerRef.current.resize(
          window.innerWidth,
          window.innerHeight,
          Math.min(window.devicePixelRatio || 1, 1.5)
        );
      }
    };

    const triggerFeed = (x: number, y: number, count = 4) => {
      controllerRef.current?.feed?.(x, y, count);
      const toastId = Date.now();
      const isKoi = asciiAnimation === "koi";
      const text = isKoi ? `🐟 Fed the Koi (+${count} pellets)` : `⚡ ASCII Pulse Triggered`;
      setToasts((prev) => [
        ...prev.slice(-2),
        { id: toastId, text, x, y: Math.max(80, y - 25) },
      ]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== toastId));
      }, 2200);
    };

    const handlePointerMove = (e: PointerEvent) => {
      pointerPos.current = { x: e.clientX, y: e.clientY };
      if (controllerRef.current?.onPointerMove) {
        controllerRef.current.onPointerMove(e.clientX, e.clientY);
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      const isInteractive = target?.closest(
        'button, a, input, select, textarea, [role="button"], .game-card, .dialog-card, .player-shell, .settings-panel'
      );
      if (!isInteractive) {
        triggerFeed(e.clientX, e.clientY, 4);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "f" || e.key === "F") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const active = document.activeElement;
        const isInput =
          active instanceof HTMLInputElement ||
          active instanceof HTMLTextAreaElement ||
          active?.getAttribute("contenteditable") === "true";
        if (!isInput) {
          triggerFeed(pointerPos.current.x, pointerPos.current.y, 5);
        }
      }
    };

    const handleCustomFeed = (e: Event) => {
      const customEvent = e as CustomEvent<{ x?: number; y?: number; count?: number }>;
      const { x, y, count } = customEvent.detail || {};
      triggerFeed(
        x !== undefined ? x : pointerPos.current.x,
        y !== undefined ? y : pointerPos.current.y,
        count !== undefined ? count : 5
      );
    };

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wasmdeck:feed-koi", handleCustomFeed);

    let animId = 0;
    let isVisible = true;
    let lastFrameTime = 0;
    const minFrameInterval = animationMode === "eco" ? 33 : 8; // 30fps vs 120fps

    const handleVisibility = () => {
      isVisible = document.visibilityState === "visible";
      if (isVisible) {
        lastFrameTime = performance.now();
        animId = requestAnimationFrame(loop);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    const loop = (timeMs: number) => {
      if (!isVisible) return;

      if (timeMs - lastFrameTime >= minFrameInterval) {
        lastFrameTime = timeMs;
        controller.stepAndRender(timeMs);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wasmdeck:feed-koi", handleCustomFeed);
      document.removeEventListener("visibilitychange", handleVisibility);
      controller.destroy();
      controllerRef.current = null;
    };
  }, [asciiAnimation, animationMode, fishDensity]);

  // Dynamically update palette on theme/accent changes
  useEffect(() => {
    if (!controllerRef.current?.setPalette) return;

    if (asciiAnimation === "koi") {
      controllerRef.current.setPalette(() => asciiPalette);
    } else {
      controllerRef.current.setPalette({
        bg: bgMood.bgHex,
        accent: accent.hex,
        faint: "#888888",
        glow: accent.glow,
      });
    }
  }, [asciiAnimation, asciiPalette, accent.hex, accent.glow, bgMood.bgHex]);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`fixed inset-0 pointer-events-none z-0 w-full h-full block ${className}`}
        style={{ imageRendering: "auto" }}
      />
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="koi-feed-toast"
          style={{ left: `${toast.x}px`, top: `${toast.y}px` }}
        >
          <span className="status-dot animate-pulse" />
          <span>{toast.text}</span>
        </div>
      ))}
    </>
  );
}
