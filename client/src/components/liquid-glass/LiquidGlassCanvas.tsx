import React, { useEffect, useRef } from 'react';
import { createAsciiKoiPond, type AsciiKoiPondController } from '@/lib/liquidglass/asciiKoiPond';
import { LiquidGlassEngine } from '@/lib/liquidglass/LiquidGlassEngine';
import { createProceduralCausticsCanvas } from '@/lib/liquidglass/procedural-texture';
import { useLiquidGlassInternal } from './LiquidGlassContext';

export interface LiquidGlassCanvasProps {
  className?: string;
  dprMax?: number;
}

export function LiquidGlassCanvas({ className = '', dprMax = 2.0 }: LiquidGlassCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const koiPondRef = useRef<AsciiKoiPondController | null>(null);
  const { elementsMap, engineRef, activeSceneId, scenes, glassSettings, setTelemetry } = useLiquidGlassInternal();
  const glassSettingsRef = useRef(glassSettings);
  glassSettingsRef.current = glassSettings;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new LiquidGlassEngine(canvas, { dprMax });
    engineRef.current = engine;
    engine.setGlobalOverrides(glassSettingsRef.current);

    const handleResize = () => {
      if (typeof window !== 'undefined') {
        engine.resize(window.innerWidth, window.innerHeight);
        if (koiPondRef.current) {
          koiPondRef.current.resize(window.innerWidth, window.innerHeight, engine.getDpr());
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });

    // Global mouse UV tracking for light direction and specular sheen
    let mouseU = 0.5;
    let mouseV = 0.5;
    const handlePointerMove = (e: PointerEvent) => {
      mouseU = e.clientX / window.innerWidth;
      mouseV = e.clientY / window.innerHeight;
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    // FPS Telemetry Tracking
    let frameCount = 0;
    let lastFpsUpdate = performance.now();
    let currentFps = 120;

    let animId = 0;
    const renderLoop = (timeMs: number) => {
      const now = timeMs * 0.001;

      frameCount++;
      if (timeMs - lastFpsUpdate >= 1000) {
        currentFps = Math.round((frameCount * 1000) / (timeMs - lastFpsUpdate));
        frameCount = 0;
        lastFpsUpdate = timeMs;

        setTelemetry(prev => ({
          ...prev,
          fps: currentFps,
          activeCardsCount: elementsMap.size,
          dpr: engine.getDpr(),
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        }));
      }

      const pond = koiPondRef.current;
      if (pond && pond.stepAndRender(timeMs)) {
        engine.updateBackgroundCanvas(pond.canvas);
      }

      engine.render(Array.from(elementsMap.values()), now, [mouseU, mouseV]);
      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      if (koiPondRef.current) {
        koiPondRef.current.destroy();
        koiPondRef.current = null;
      }
      engine.destroy();
      engineRef.current = null;
    };
  }, [elementsMap, engineRef, dprMax, setTelemetry]);

  // Synchronize background scene when activeSceneId changes
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const scene = scenes.find(s => s.id === activeSceneId) || scenes[0];
    if (!scene) return;

    const isAnimatedScene = Boolean(scene.isAnimated || scene.id === 'ascii-koi');

    if (isAnimatedScene) {
      engine.setBackgroundDrift(false);
      if (!koiPondRef.current) {
        const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
        const h = typeof window !== 'undefined' ? window.innerHeight : 720;
        koiPondRef.current = createAsciiKoiPond({
          width: w,
          height: h,
          dpr: engine.getDpr(),
        });
      } else if (typeof window !== 'undefined') {
        koiPondRef.current.resize(window.innerWidth, window.innerHeight, engine.getDpr());
      }
      const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
      koiPondRef.current.stepAndRender(nowMs);
      engine.updateBackgroundCanvas(koiPondRef.current.canvas);
    } else {
      if (koiPondRef.current) {
        koiPondRef.current.destroy();
        koiPondRef.current = null;
      }
      engine.setBackgroundDrift(true);

      if (scene.isProcedural || !scene.url) {
        const proceduralCanvas = createProceduralCausticsCanvas(1920, 1080);
        engine.setBackgroundImage(proceduralCanvas);
      } else {
        engine.setBackgroundImage(scene.url);
      }
    }

    setTelemetry(prev => ({ ...prev, activeScene: scene.name }));
  }, [activeSceneId, scenes, engineRef, setTelemetry]);

  // Synchronize global optical overrides when glassSettings changes
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setGlobalOverrides(glassSettings);
  }, [glassSettings, engineRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none z-0 w-full h-full block ${className}`}
      style={{
        imageRendering: 'auto',
      }}
    />
  );
}
