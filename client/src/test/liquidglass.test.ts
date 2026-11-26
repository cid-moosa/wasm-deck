import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { domMax, LazyMotion } from 'framer-motion';
import SettingsDialog from '@/components/SettingsDialog';
import Home from '@/pages/Home';
import {
  LIQUID_GLASS_PRESETS,
  PRESET_METADATA,
  BACKGROUND_SCENES,
  resolvePreset,
  type PresetKey,
} from '@/lib/liquidglass/presets';
import { vsSource, bgFsSource, glassFsSource } from '@/lib/liquidglass/shaders';
import { createProceduralCausticsCanvas } from '@/lib/liquidglass/procedural-texture';
import * as LiquidGlassComponents from '@/components/liquid-glass';

describe('Liquid Glass Presets & Mathematical Optics', () => {
  it('defines the 4 required physical presets with exact reference parameters', () => {
    // Apple Vision preset
    expect(LIQUID_GLASS_PRESETS.apple).toEqual({
      refraction: 0.080,
      chroma: 0.045,
      wave: 0.012,
      speed: 1.0,
      specular: 1.5,
      bevel: 0.085,
    });

    // Water Ripple preset
    expect(LIQUID_GLASS_PRESETS.water).toEqual({
      refraction: 0.120,
      chroma: 0.030,
      wave: 0.045,
      speed: 2.2,
      specular: 2.0,
      bevel: 0.090,
    });

    // Prism Rainbow preset
    expect(LIQUID_GLASS_PRESETS.prism).toEqual({
      refraction: 0.140,
      chroma: 0.095,
      wave: 0.008,
      speed: 0.8,
      specular: 2.5,
      bevel: 0.110,
    });

    // Heavy Liquid (Mercury) preset
    expect(LIQUID_GLASS_PRESETS.mercury).toEqual({
      refraction: 0.190,
      chroma: 0.020,
      wave: 0.025,
      speed: 1.4,
      specular: 3.2,
      bevel: 0.130,
    });
  });

  it('provides rich descriptive metadata for all 4 presets', () => {
    const keys: PresetKey[] = ['apple', 'water', 'prism', 'mercury'];
    keys.forEach(k => {
      const meta = PRESET_METADATA[k];
      expect(meta).toBeDefined();
      expect(meta.key).toBe(k);
      expect(meta.name.length).toBeGreaterThan(0);
      expect(meta.tagline.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(0);
      expect(meta.params).toEqual(LIQUID_GLASS_PRESETS[k]);
    });
  });

  it('correctly resolves presets with fallback logic', () => {
    expect(resolvePreset('apple')).toEqual(LIQUID_GLASS_PRESETS.apple);
    expect(resolvePreset('water')).toEqual(LIQUID_GLASS_PRESETS.water);
    expect(resolvePreset('prism')).toEqual(LIQUID_GLASS_PRESETS.prism);
    expect(resolvePreset('mercury')).toEqual(LIQUID_GLASS_PRESETS.mercury);

    // Fallback when undefined
    expect(resolvePreset(undefined)).toEqual(LIQUID_GLASS_PRESETS.apple);

    // Custom params pass-through
    const custom = {
      refraction: 0.15,
      chroma: 0.05,
      wave: 0.02,
      speed: 1.5,
      specular: 2.2,
      bevel: 0.09,
    };
    expect(resolvePreset(custom)).toEqual(custom);
  });

  it('defines all 6 background scenes including ascii-koi and offline procedural caustics', () => {
    expect(BACKGROUND_SCENES).toHaveLength(6);
    const ids = BACKGROUND_SCENES.map(s => s.id);
    expect(ids).toContain('ascii-koi');
    expect(ids).toContain('bamboo');
    expect(ids).toContain('cyberpunk');
    expect(ids).toContain('ocean');
    expect(ids).toContain('nebula');
    expect(ids).toContain('procedural');

    const asciiKoi = BACKGROUND_SCENES.find(s => s.id === 'ascii-koi');
    expect(asciiKoi?.isAnimated).toBe(true);

    const procedural = BACKGROUND_SCENES.find(s => s.id === 'procedural');
    expect(procedural?.isProcedural).toBe(true);
  });
});

describe('WebGL Shader Formulas Verification', () => {
  it('vertex shader maps full-screen NDC to inverted DOM-aligned UV space', () => {
    expect(vsSource).toContain('attribute vec2 a_pos;');
    expect(vsSource).toContain('varying vec2 v_uv;');
    expect(vsSource).toContain('v_uv = (a_pos + 1.0) * 0.5;');
    expect(vsSource).toContain('v_uv.y = 1.0 - v_uv.y;');
    expect(vsSource).toContain('gl_Position = vec4(a_pos, 0.0, 1.0);');
  });

  it('glass fragment shader implements analytical sdRoundedBox SDF and gradient normals', () => {
    expect(glassFsSource).toContain('float sdRoundedBox(vec2 p, vec2 b, float r)');
    expect(glassFsSource).toContain('vec2 q = abs(p) - b + r;');
    expect(glassFsSource).toContain('return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;');
    expect(glassFsSource).toContain('float eps = 0.002;');
    expect(glassFsSource).toContain('float gradLen = length(vec2(dx, dy));');
    expect(glassFsSource).toContain('vec2 grad = (gradLen > 1e-5) ? (vec2(dx, dy) / gradLen) : vec2(0.0);');
  });

  it('glass fragment shader guards against numerical division-by-zero defects', () => {
    // Zero-length gradient guard preventing NaN pixel propagation
    expect(glassFsSource).toContain('float gradLen = length(vec2(dx, dy));');
    expect(glassFsSource).toContain('vec2 grad = (gradLen > 1e-5) ? (vec2(dx, dy) / gradLen) : vec2(0.0);');

    // Corner radius non-negative clamping
    expect(glassFsSource).toContain('float radius = max(0.0, min(u_radius * aspect.y, maxCornerRadius));');

    // Positive rimWidth lower bound preventing smoothstep division by zero
    expect(glassFsSource).toContain('float rimWidth = max(radius * 1.15, 0.001);');
    expect(glassFsSource).toContain('float edgeFactor = 1.0 - smoothstep(0.0, rimWidth, edgeDist);');
  });

  it('glass fragment shader implements harmonic fluid waves and click ripple shockwaves', () => {
    // Harmonic liquid breathing
    expect(glassFsSource).toContain('vec2 waveFreq = vec2(18.0, 22.0);');
    expect(glassFsSource).toContain('u_wave_amp');

    // Click ripple shockwave
    expect(glassFsSource).toContain('u_ripple_pos');
    expect(glassFsSource).toContain('u_ripple_time');
    expect(glassFsSource).toContain('rDelta * 35.0');
    expect(glassFsSource).toContain('exp(-rDist * 3.0)');
    expect(glassFsSource).toContain('exp(-u_ripple_time * 3.5)');
  });

  it('glass fragment shader implements Snell refraction and wavelength chromatic dispersion', () => {
    // Snell refraction
    expect(glassFsSource).toContain('vec2 refractOffset = N.xy * u_refraction * (0.35 + edgeFactor * 0.95);');

    // Chromatic dispersion RGB separation
    expect(glassFsSource).toContain('float chroma = u_chroma * (0.3 + edgeFactor * 0.9);');
    expect(glassFsSource).toContain('refractOffset * (1.0 + chroma)');
    expect(glassFsSource).toContain('refractOffset * (1.0 - chroma)');
  });

  it('glass fragment shader implements Blinn-Phong specular and Fresnel reflections', () => {
    expect(glassFsSource).toContain('vec3 halfVec = normalize(lightDir + viewDir);');
    expect(glassFsSource).toContain('pow(max(dot(N, halfVec), 0.0), 28.0) * u_specular');
    expect(glassFsSource).toContain('float fresnel = pow(1.0 - max(dot(viewDir, N), 0.0), 3.0);');
    expect(glassFsSource).toContain('innerAO');
  });
});

describe('Offline Procedural Texture Generator', () => {
  it('instantiates canvas with requested width and height', () => {
    const canvas = createProceduralCausticsCanvas(640, 360);
    expect(canvas).toBeDefined();
    expect(canvas.width).toBe(640);
    expect(canvas.height).toBe(360);
  });
});

describe('Public Component Library Exports', () => {
  it('exports all expected React components, hooks, and classes', () => {
    expect(LiquidGlassComponents.LiquidGlassCanvas).toBeDefined();
    expect(LiquidGlassComponents.LiquidGlassCard).toBeDefined();
    expect(LiquidGlassComponents.LiquidGlassPill).toBeDefined();
    expect(LiquidGlassComponents.LiquidGlassDialog).toBeDefined();
    expect(LiquidGlassComponents.LiquidGlassDialogTrigger).toBeDefined();
    expect(LiquidGlassComponents.LiquidGlassDialogContent).toBeDefined();
    expect(LiquidGlassComponents.LiquidGlassProvider).toBeDefined();
    expect(LiquidGlassComponents.useLiquidGlass).toBeDefined();
    expect(LiquidGlassComponents.LiquidGlassEngine).toBeDefined();
  });
});

describe('Showcase UI R3 Compliance & Scissor Pass Logic', () => {
  it('omits inline wave/speed/range HUD sliders from Home.tsx and delegates optics settings to SettingsDialog', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const homeContent = fs.readFileSync(path.resolve(__dirname, '../pages/Home.tsx'), 'utf-8');

    // Confirm no inline tuning range/wave/speed sliders exist directly in Home.tsx
    expect(homeContent).not.toContain('slider-wave');
    expect(homeContent).not.toContain('slider-speed');
    expect(homeContent).not.toContain('type="range"');
    expect(homeContent).toContain('SettingsDialog');
    expect(homeContent).toContain('data-testid="open-settings-button"');
  });

  it('verifies UV bounds clamping in fragment shader to prevent black border artifacts', () => {
    expect(glassFsSource).toContain('clamp(v_uv - refractOffset');
    expect(glassFsSource).toContain('0.001, 0.999');
  });

  it('verifies aspect ratio correction prevents pill warping', () => {
    expect(glassFsSource).toContain('vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);');
    expect(glassFsSource).toContain('vec2 p = v_uv * aspect;');
  });
});

describe('M1 — R3 Static Glass & Seamless Background Math', () => {
  it('zeros out harmonic fluid wave gradient in glassFsSource while keeping u_wave_amp uniform', () => {
    expect(glassFsSource).toContain('vec2 waveGrad = vec2(0.0) * u_wave_amp;');
    expect(glassFsSource).toContain('vec2 totalOffset = grad * edgeFactor * 2.4 + waveGrad * 0.8 + rGrad;');
    expect(glassFsSource).not.toContain('totalOffset += u_tilt');
  });

  it('uses identical u_bg_drift-gated bgOffset and bgScale across bgFsSource and glassFsSource', () => {
    const bgOffsetLine = 'vec2 bgOffset = vec2(sin(u_time * 0.25) * 0.02, cos(u_time * 0.2) * 0.015) * u_bg_drift;';
    const bgScaleLine = 'float bgScale = mix(1.0, 0.94, u_bg_drift);';
    const bgUvLine = 'vec2 bgUv = center + (v_uv - center) * bgScale + bgOffset;';
    expect(bgFsSource).toContain('uniform float u_bg_drift;');
    expect(glassFsSource).toContain('uniform float u_bg_drift;');
    expect(bgFsSource).toContain(bgOffsetLine);
    expect(glassFsSource).toContain(bgOffsetLine);
    expect(bgFsSource).toContain(bgScaleLine);
    expect(glassFsSource).toContain(bgScaleLine);
    expect(bgFsSource).toContain(bgUvLine);
    expect(glassFsSource).toContain(bgUvLine);
  });
});

describe('M1 — LiquidGlassEngine Global Overrides & Uniform Uploads', () => {
  interface UniformLocSentinel {
    programId: number;
    name: string;
  }

  function createMockWebGLHarness() {
    let nextProgramId = 1;
    let currentProgramId = 0;
    const uniform1fCalls: Array<{ programId: number; name: string; value: number }> = [];
    const scissorCalls: Array<[number, number, number, number]> = [];
    const texImage2DCalls: Array<{ width: number; height: number }> = [];
    const texSubImage2DCalls: Array<{ width: number; height: number }> = [];

    const gl = {
      VERTEX_SHADER: 0x8b31,
      FRAGMENT_SHADER: 0x8b30,
      COMPILE_STATUS: 0x8b81,
      LINK_STATUS: 0x8b82,
      ARRAY_BUFFER: 0x8892,
      STATIC_DRAW: 0x88e4,
      TEXTURE_2D: 0x0de1,
      TEXTURE_WRAP_S: 0x2802,
      TEXTURE_WRAP_T: 0x2803,
      CLAMP_TO_EDGE: 0x812f,
      TEXTURE_MIN_FILTER: 0x2801,
      TEXTURE_MAG_FILTER: 0x2800,
      LINEAR: 0x2601,
      RGBA: 0x1908,
      UNSIGNED_BYTE: 0x1401,
      SCISSOR_TEST: 0x0c11,
      COLOR_BUFFER_BIT: 0x4000,
      FLOAT: 0x1406,
      TRIANGLES: 0x0004,
      TEXTURE0: 0x84c0,
      createShader: () => ({}),
      shaderSource: () => {},
      compileShader: () => {},
      getShaderParameter: () => true,
      getShaderInfoLog: () => '',
      deleteShader: () => {},
      createProgram: () => ({ id: nextProgramId++ }),
      attachShader: () => {},
      linkProgram: () => {},
      getProgramParameter: () => true,
      getProgramInfoLog: () => '',
      deleteProgram: () => {},
      getAttribLocation: () => 0,
      getUniformLocation: (prog: { id: number }, name: string): UniformLocSentinel => ({
        programId: prog.id,
        name,
      }),
      createBuffer: () => ({}),
      bindBuffer: () => {},
      bufferData: () => {},
      deleteBuffer: () => {},
      createTexture: () => ({}),
      bindTexture: () => {},
      texParameteri: () => {},
      texImage2D: (
        _target: number,
        _level: number,
        _internalformat: number,
        _format: number,
        _type: number,
        source: { width?: number; height?: number }
      ) => {
        texImage2DCalls.push({ width: source?.width ?? 0, height: source?.height ?? 0 });
      },
      texSubImage2D: (
        _target: number,
        _level: number,
        _xoffset: number,
        _yoffset: number,
        _format: number,
        _type: number,
        source: { width?: number; height?: number }
      ) => {
        texSubImage2DCalls.push({ width: source?.width ?? 0, height: source?.height ?? 0 });
      },
      deleteTexture: () => {},
      viewport: () => {},
      disable: () => {},
      enable: () => {},
      clearColor: () => {},
      clear: () => {},
      useProgram: (prog: { id: number } | null) => {
        currentProgramId = prog ? prog.id : 0;
      },
      enableVertexAttribArray: () => {},
      vertexAttribPointer: () => {},
      activeTexture: () => {},
      uniform1i: () => {},
      uniform1f: (loc: UniformLocSentinel | null, value: number) => {
        if (loc) {
          uniform1fCalls.push({ programId: loc.programId || currentProgramId, name: loc.name, value });
        }
      },
      uniform2f: () => {},
      uniform4f: () => {},
      scissor: (x: number, y: number, w: number, h: number) => {
        scissorCalls.push([x, y, w, h]);
      },
      drawArrays: () => {},
    };

    const canvas = {
      width: 1280,
      height: 720,
      getContext: (type: string) => (type === 'webgl' ? gl : null),
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as HTMLCanvasElement;

    const createGlassElement = (
      id: string,
      preset: PresetKey = 'water',
      radius?: number
    ) => ({
      id,
      preset,
      radius,
      tiltX: 0,
      tiltY: 0,
      ripplePos: [0.5, 0.5] as [number, number],
      rippleStartTime: -999.0,
      zIndex: 10,
      element: {
        isConnected: true,
        getBoundingClientRect: () => ({
          left: 100,
          top: 100,
          right: 400,
          bottom: 300,
          width: 300,
          height: 200,
        }),
      } as unknown as HTMLElement,
    });

    return { canvas, uniform1fCalls, scissorCalls, texImage2DCalls, texSubImage2DCalls, createGlassElement };
  }

  it('sanitizes NaN/Infinity in setGlobalOverrides and clears on null', () => {
    const { canvas } = createMockWebGLHarness();
    const engine = new LiquidGlassComponents.LiquidGlassEngine(canvas);

    expect(engine.getGlobalOverrides()).toBeNull();

    engine.setGlobalOverrides({
      refraction: 0.16,
      chroma: Number.NaN,
      specular: Number.POSITIVE_INFINITY,
      bevel: 0.12,
    });

    expect(engine.getGlobalOverrides()).toEqual({
      refraction: 0.16,
      bevel: 0.12,
    });

    engine.setGlobalOverrides(null);
    expect(engine.getGlobalOverrides()).toBeNull();
    engine.destroy();
  });

  it('uploads preset parameters with u_wave_amp = 0.0 when globalOverrides is null', () => {
    const { canvas, uniform1fCalls, scissorCalls, createGlassElement } = createMockWebGLHarness();
    const engine = new LiquidGlassComponents.LiquidGlassEngine(canvas);

    engine.render([createGlassElement('el-1', 'water')], 4.25);

    expect(scissorCalls).toHaveLength(1);
    const byName = new Map(uniform1fCalls.filter(c => c.programId === 2).map(c => [c.name, c.value]));
    expect(byName.get('u_refraction')).toBeCloseTo(LIQUID_GLASS_PRESETS.water.refraction, 6);
    expect(byName.get('u_chroma')).toBeCloseTo(LIQUID_GLASS_PRESETS.water.chroma, 6);
    expect(byName.get('u_specular')).toBeCloseTo(LIQUID_GLASS_PRESETS.water.specular, 6);
    expect(byName.get('u_radius')).toBeCloseTo(LIQUID_GLASS_PRESETS.water.bevel, 6);
    expect(byName.get('u_wave_amp')).toBe(0.0);

    // bgProgram (programId 1) and glassProgram (programId 2) receive identical u_time
    const bgTime = uniform1fCalls.find(c => c.programId === 1 && c.name === 'u_time')?.value;
    const glassTime = uniform1fCalls.find(c => c.programId === 2 && c.name === 'u_time')?.value;
    expect(bgTime).toBe(4.25);
    expect(glassTime).toBe(4.25);

    engine.destroy();
  });

  it('merges full and partial globalOverrides over presets and respects item.radius precedence', () => {
    const { canvas, uniform1fCalls, createGlassElement } = createMockWebGLHarness();
    const engine = new LiquidGlassComponents.LiquidGlassEngine(canvas);

    // Full overrides with undefined item.radius -> global bevel drives u_radius
    engine.setGlobalOverrides({
      refraction: 0.18,
      chroma: 0.09,
      specular: 2.8,
      bevel: 0.14,
    });
    engine.render([createGlassElement('el-1', 'water')], 1.0);

    let glassUniforms = new Map(uniform1fCalls.filter(c => c.programId === 2).map(c => [c.name, c.value]));
    expect(glassUniforms.get('u_refraction')).toBeCloseTo(0.18, 6);
    expect(glassUniforms.get('u_chroma')).toBeCloseTo(0.09, 6);
    expect(glassUniforms.get('u_specular')).toBeCloseTo(2.8, 6);
    expect(glassUniforms.get('u_radius')).toBeCloseTo(0.14, 6);
    expect(glassUniforms.get('u_wave_amp')).toBe(0.0);

    // Partial override (bevel only) preserves water preset values for other fields
    uniform1fCalls.length = 0;
    engine.setGlobalOverrides({ bevel: 0.15 });
    engine.render([createGlassElement('el-1', 'water')], 2.0);

    glassUniforms = new Map(uniform1fCalls.filter(c => c.programId === 2).map(c => [c.name, c.value]));
    expect(glassUniforms.get('u_refraction')).toBeCloseTo(LIQUID_GLASS_PRESETS.water.refraction, 6);
    expect(glassUniforms.get('u_chroma')).toBeCloseTo(LIQUID_GLASS_PRESETS.water.chroma, 6);
    expect(glassUniforms.get('u_specular')).toBeCloseTo(LIQUID_GLASS_PRESETS.water.specular, 6);
    expect(glassUniforms.get('u_radius')).toBeCloseTo(0.15, 6);

    // Explicit item.radius takes precedence over global bevel override
    uniform1fCalls.length = 0;
    engine.render([createGlassElement('el-2', 'water', 0.04)], 3.0);

    glassUniforms = new Map(uniform1fCalls.filter(c => c.programId === 2).map(c => [c.name, c.value]));
    expect(glassUniforms.get('u_radius')).toBeCloseTo(0.04, 6);

    engine.destroy();
  });

  it('uses texImage2D on new canvas dimensions and texSubImage2D on matching subsequent frames', () => {
    const { canvas, texImage2DCalls, texSubImage2DCalls } = createMockWebGLHarness();
    const engine = new LiquidGlassComponents.LiquidGlassEngine(canvas);

    // Initial fallback upload in initWebGL uses texImage2D (1920x1080)
    expect(texImage2DCalls).toHaveLength(1);
    expect(texSubImage2DCalls).toHaveLength(0);

    const pondCanvas = { width: 1280, height: 720 } as unknown as HTMLCanvasElement;
    engine.updateBackgroundCanvas(pondCanvas);
    expect(texImage2DCalls).toHaveLength(2);
    expect(texImage2DCalls[1]).toEqual({ width: 1280, height: 720 });
    expect(texSubImage2DCalls).toHaveLength(0);

    // Same dimensions -> fast texSubImage2D upload
    engine.updateBackgroundCanvas(pondCanvas);
    engine.updateBackgroundCanvas(pondCanvas);
    expect(texImage2DCalls).toHaveLength(2);
    expect(texSubImage2DCalls).toHaveLength(2);
    expect(texSubImage2DCalls[0]).toEqual({ width: 1280, height: 720 });

    // Resized canvas -> texImage2D reallocates, then texSubImage2D resumes
    const resizedCanvas = { width: 1440, height: 900 } as unknown as HTMLCanvasElement;
    engine.updateBackgroundCanvas(resizedCanvas);
    expect(texImage2DCalls).toHaveLength(3);
    expect(texImage2DCalls[2]).toEqual({ width: 1440, height: 900 });

    engine.updateBackgroundCanvas(resizedCanvas);
    expect(texSubImage2DCalls).toHaveLength(3);
    expect(texSubImage2DCalls[2]).toEqual({ width: 1440, height: 900 });

    engine.destroy();
  });

  it('uploads u_bg_drift uniform to both bgProgram and glassProgram via setBackgroundDrift', () => {
    const { canvas, uniform1fCalls, createGlassElement } = createMockWebGLHarness();
    const engine = new LiquidGlassComponents.LiquidGlassEngine(canvas);

    engine.setBackgroundDrift(false);
    engine.render([createGlassElement('el-1', 'apple')], 1.5);
    expect(uniform1fCalls.find(c => c.programId === 1 && c.name === 'u_bg_drift')?.value).toBe(0.0);
    expect(uniform1fCalls.find(c => c.programId === 2 && c.name === 'u_bg_drift')?.value).toBe(0.0);

    uniform1fCalls.length = 0;
    engine.setBackgroundDrift(true);
    engine.render([createGlassElement('el-1', 'apple')], 2.5);
    expect(uniform1fCalls.find(c => c.programId === 1 && c.name === 'u_bg_drift')?.value).toBe(1.0);
    expect(uniform1fCalls.find(c => c.programId === 2 && c.name === 'u_bg_drift')?.value).toBe(1.0);

    engine.destroy();
  });
});

describe('M1 — LiquidGlassContext Optical Settings Helpers & Persistence', () => {
  it('defines DEFAULT_GLASS_SETTINGS matching apple preset and demo bounds', () => {
    expect(LiquidGlassComponents.GLASS_SETTINGS_STORAGE_KEY).toBe('wasmdeck:glass-settings');
    expect(LiquidGlassComponents.DEFAULT_GLASS_SETTINGS).toEqual({
      refraction: 0.08,
      chroma: 0.045,
      specular: 1.5,
      bevel: 0.085,
    });
    expect(LiquidGlassComponents.GLASS_SETTINGS_RANGES).toEqual({
      refraction: { min: 0.0, max: 0.22, step: 0.005 },
      chroma: { min: 0.0, max: 0.1, step: 0.002 },
      specular: { min: 0.2, max: 3.5, step: 0.1 },
      bevel: { min: 0.02, max: 0.18, step: 0.005 },
    });
  });

  it('sanitizes and clamps out-of-range, NaN, Infinity, and malformed inputs', () => {
    expect(LiquidGlassComponents.sanitizeGlassSettings(null)).toEqual(
      LiquidGlassComponents.DEFAULT_GLASS_SETTINGS
    );
    expect(LiquidGlassComponents.sanitizeGlassSettings('invalid')).toEqual(
      LiquidGlassComponents.DEFAULT_GLASS_SETTINGS
    );
    expect(
      LiquidGlassComponents.sanitizeGlassSettings({
        refraction: 0.99,
        chroma: -0.5,
        specular: Number.NaN,
        bevel: Number.POSITIVE_INFINITY,
      })
    ).toEqual({
      refraction: 0.22,
      chroma: 0.0,
      specular: LiquidGlassComponents.DEFAULT_GLASS_SETTINGS.specular,
      bevel: LiquidGlassComponents.DEFAULT_GLASS_SETTINGS.bevel,
    });
  });

  it('detects all 4 presets within epsilon and returns custom otherwise', () => {
    const keys: PresetKey[] = ['apple', 'water', 'prism', 'mercury'];
    for (const key of keys) {
      const p = LIQUID_GLASS_PRESETS[key];
      expect(
        LiquidGlassComponents.detectActivePreset({
          refraction: p.refraction,
          chroma: p.chroma,
          specular: p.specular,
          bevel: p.bevel,
        })
      ).toBe(key);
    }

    expect(
      LiquidGlassComponents.detectActivePreset({
        refraction: LIQUID_GLASS_PRESETS.apple.refraction + 1e-8,
        chroma: LIQUID_GLASS_PRESETS.apple.chroma,
        specular: LIQUID_GLASS_PRESETS.apple.specular,
        bevel: LIQUID_GLASS_PRESETS.apple.bevel,
      })
    ).toBe('apple');

    expect(
      LiquidGlassComponents.detectActivePreset({
        refraction: 0.11,
        chroma: 0.045,
        specular: 1.5,
        bevel: 0.085,
      })
    ).toBe('custom');
  });

  it('handles Node SSR environment and localStorage persistence/error paths safely', () => {
    // Node default (typeof window === 'undefined')
    expect(LiquidGlassComponents.loadPersistedGlassSettings()).toEqual(
      LiquidGlassComponents.DEFAULT_GLASS_SETTINGS
    );
    expect(() =>
      LiquidGlassComponents.persistGlassSettings(LiquidGlassComponents.DEFAULT_GLASS_SETTINGS)
    ).not.toThrow();

    const store = new Map<string, string>();
    const originalWindow = (globalThis as Record<string, unknown>).window;
    try {
      (globalThis as Record<string, unknown>).window = {
        localStorage: {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => {
            store.set(k, v);
          },
        },
      };

      const custom = { refraction: 0.14, chroma: 0.06, specular: 2.2, bevel: 0.11 };
      LiquidGlassComponents.persistGlassSettings(custom);
      expect(LiquidGlassComponents.loadPersistedGlassSettings()).toEqual(custom);

      // Out-of-bounds persisted data gets clamped
      store.set(
        LiquidGlassComponents.GLASS_SETTINGS_STORAGE_KEY,
        JSON.stringify({ refraction: 5, chroma: -1, specular: 0.01, bevel: 9 })
      );
      expect(LiquidGlassComponents.loadPersistedGlassSettings()).toEqual({
        refraction: 0.22,
        chroma: 0.0,
        specular: 0.2,
        bevel: 0.18,
      });

      // Corrupt JSON falls back safely
      store.set(LiquidGlassComponents.GLASS_SETTINGS_STORAGE_KEY, '{broken-json');
      expect(LiquidGlassComponents.loadPersistedGlassSettings()).toEqual(
        LiquidGlassComponents.DEFAULT_GLASS_SETTINGS
      );

      // Throwing localStorage falls back safely
      (globalThis as Record<string, unknown>).window = {
        localStorage: {
          getItem: () => {
            throw new Error('SecurityError');
          },
          setItem: () => {
            throw new Error('QuotaExceededError');
          },
        },
      };
      expect(LiquidGlassComponents.loadPersistedGlassSettings()).toEqual(
        LiquidGlassComponents.DEFAULT_GLASS_SETTINGS
      );
      expect(() => LiquidGlassComponents.persistGlassSettings(custom)).not.toThrow();
    } finally {
      if (originalWindow === undefined) {
        delete (globalThis as Record<string, unknown>).window;
      } else {
        (globalThis as Record<string, unknown>).window = originalWindow;
      }
    }
  });
});

describe('M1 — F2/F3 React Primitives Static Defaults & Overlay Contract', () => {
  it('defaults disableTilt = true across Card, Pill, and Dialog, leaves cornerRadius optional, and removes overlay backdrop-blur-xs', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const cardSrc = fs.readFileSync(
      path.resolve(__dirname, '../components/liquid-glass/LiquidGlassCard.tsx'),
      'utf-8'
    );
    const pillSrc = fs.readFileSync(
      path.resolve(__dirname, '../components/liquid-glass/LiquidGlassPill.tsx'),
      'utf-8'
    );
    const dialogSrc = fs.readFileSync(
      path.resolve(__dirname, '../components/liquid-glass/LiquidGlassDialog.tsx'),
      'utf-8'
    );

    expect(cardSrc).toContain('disableTilt = true');
    expect(pillSrc).toContain('disableTilt = true');
    expect(dialogSrc).toContain('disableTilt = true');

    expect(cardSrc).toContain('disableRipple = true');
    expect(pillSrc).toContain('disableRipple = true');
    expect(dialogSrc).toContain('disableRipple = true');

    expect(pillSrc).not.toContain('cornerRadius = 0.04');
    expect(dialogSrc).not.toContain('cornerRadius = 0.085');

    expect(dialogSrc).not.toContain('backdrop-blur-xs');
    expect(dialogSrc).not.toContain('bg-black/60');
    expect(dialogSrc).toContain('bg-black/35');
  });

  it('defaults active scene to ascii-koi in LiquidGlassContext and Home.tsx without click ripple triggers', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const contextSrc = fs.readFileSync(
      path.resolve(__dirname, '../components/liquid-glass/LiquidGlassContext.tsx'),
      'utf-8'
    );
    const homeSrc = fs.readFileSync(
      path.resolve(__dirname, '../pages/Home.tsx'),
      'utf-8'
    );
    const settingsSrc = fs.readFileSync(
      path.resolve(__dirname, '../components/SettingsDialog.tsx'),
      'utf-8'
    );

    expect(contextSrc).toContain("initialSceneId = 'ascii-koi'");
    expect(homeSrc).toContain('AsciiBackground');
    expect(homeSrc).not.toContain('triggerRipple(');
  });
});

describe('ASCII Koi Pond Simulation (createAsciiKoiPond)', () => {
  function createMock2DCanvas(width = 1280, height = 720) {
    const fillRectCalls: Array<{ x: number; y: number; w: number; h: number; fillStyle: string }> = [];
    const fillTextCalls: Array<{ text: string; x: number; y: number; fillStyle: string }> = [];

    const ctx = {
      font: '',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      globalAlpha: 1,
      fillStyle: '#000000',
      lineCap: 'butt',
      lineWidth: 1,
      strokeStyle: '#000000',
      setTransform: () => {},
      fillRect(x: number, y: number, w: number, h: number) {
        fillRectCalls.push({ x, y, w, h, fillStyle: String(this.fillStyle) });
      },
      fillText(text: string, x: number, y: number) {
        fillTextCalls.push({ text, x, y, fillStyle: String(this.fillStyle) });
      },
      beginPath: () => {},
      rect: () => {},
      fill: () => {},
      arc: () => {},
      stroke: () => {},
    };

    const canvas = {
      width,
      height,
      getContext: (type: string) => (type === '2d' ? ctx : null),
    } as unknown as HTMLCanvasElement;

    return { canvas, fillRectCalls, fillTextCalls };
  }

  it('caps DPR to 1.5, warms up 90 steps, and renders pond water + ASCII glyphs', () => {
    const { canvas, fillRectCalls, fillTextCalls } = createMock2DCanvas(1280, 720);
    const pond = LiquidGlassComponents.createAsciiKoiPond({
      canvas,
      width: 1280,
      height: 720,
      dpr: 3.0,
    });

    expect(pond.dpr).toBe(1.5);
    expect(pond.canvas.width).toBe(1920);
    expect(pond.canvas.height).toBe(1080);
    expect(pond.time).toBeCloseTo(3.0, 5); // 90 * (1/30)
    expect(pond.fishCount).toBeGreaterThanOrEqual(3);
    expect(pond.cols).toBeGreaterThan(100);
    expect(pond.rows).toBeGreaterThan(40);

    const drew = pond.stepAndRender(100);
    expect(drew).toBe(true);
    // First fillRect paints the pond water background (#0e2a32 -> rgb(14,42,50))
    expect(fillRectCalls[0]?.fillStyle).toBe('rgb(14,42,50)');
    expect(fillTextCalls.length).toBeGreaterThan(100);

    pond.destroy();
  });

  it('enforces >= 12 ms draw throttle, clamps dt <= 0.05 s, and redraws on resize', () => {
    const { canvas, fillTextCalls } = createMock2DCanvas(1200, 700);
    const pond = LiquidGlassComponents.createAsciiKoiPond({
      canvas,
      width: 1200,
      height: 700,
      dpr: 1,
    });

    expect(pond.stepAndRender(1000)).toBe(true);
    const countAfterFirst = fillTextCalls.length;
    expect(countAfterFirst).toBeGreaterThan(0);

    // Under 12 ms -> throttled (no redraw)
    expect(pond.stepAndRender(1006)).toBe(false);
    expect(fillTextCalls.length).toBe(countAfterFirst);

    // At >= 12 ms -> redraws
    expect(pond.stepAndRender(1016)).toBe(true);
    expect(fillTextCalls.length).toBeGreaterThan(countAfterFirst);

    // Large frame gap -> dt clamped to 0.05 s
    const beforeJump = pond.time;
    expect(pond.stepAndRender(5000)).toBe(true);
    expect(pond.time - beforeJump).toBeCloseTo(0.05, 6);

    // Resize updates capped DPR and forces redraw on next stepAndRender
    pond.resize(800, 600, 2.0);
    expect(pond.dpr).toBe(1.5);
    expect(pond.canvas.width).toBe(1200);
    expect(pond.canvas.height).toBe(900);
    expect(pond.stepAndRender(5002)).toBe(true);

    // Destroy stops further rendering
    pond.destroy();
    expect(pond.stepAndRender(6000)).toBe(false);
  });

  it('supports easter egg feeding (pond.feed) by dropping food pellets and awakening nearest fish', () => {
    const { canvas } = createMock2DCanvas(1200, 700);
    const pond = LiquidGlassComponents.createAsciiKoiPond({
      canvas,
      width: 1200,
      height: 700,
      dpr: 1,
    });

    expect(typeof pond.feed).toBe('function');
    pond.feed(600, 350, 4);
    // Feeding sets dirty = true and allows rendering food physics
    expect(pond.stepAndRender(1050)).toBe(true);
    pond.destroy();
  });
});

describe('M3 — Theme Settings & SSR Smoke Check', () => {
  it('exposes theme accent color swatches, background moods, and ASCII animation controls in SettingsDialog.tsx', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const settingsSrc = fs.readFileSync(
      path.resolve(__dirname, '../components/SettingsDialog.tsx'),
      'utf-8'
    );

    expect(settingsSrc).toContain('ACCENT_PRESETS');
    expect(settingsSrc).toContain('BG_MOOD_PRESETS');
    expect(settingsSrc).toContain('setAccentId');
    expect(settingsSrc).toContain('setBgMoodId');
    expect(settingsSrc).toContain('setAnimationMode');
    expect(settingsSrc).toContain('setFishDensity');
    expect(settingsSrc).toContain('resetThemeSettings');
    expect(settingsSrc).toContain('data-testid="settings-dialog-content"');
    expect(settingsSrc).toContain('accent-btn-');
    expect(settingsSrc).toContain('mood-btn-');
  });

  it('renders SettingsDialog and full Home portal cleanly via SSR renderToStaticMarkup', async () => {
    const { ThemeProvider } = await import('@/contexts/ThemeContext');
    const settingsHtml = renderToStaticMarkup(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(SettingsDialog, { open: false, onOpenChange: () => {} })
      )
    );
    expect(typeof settingsHtml).toBe('string');

    const homeHtml = renderToStaticMarkup(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(
          LazyMotion,
          { features: domMax },
          React.createElement(Home)
        )
      )
    );
    expect(homeHtml).toContain('WASM');
    expect(homeHtml).toContain('data-testid="open-settings-button"');
    expect(homeHtml).toContain('A world of ports.');
  }, 15000);
});

describe('M2 — F4-F8 Catalog (563 Games), Index & Home Portal Invariants', () => {
  it('validates all 563 games in catalog.json across 7 categories with safe URLs', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { CATEGORIES, safeGameUrl } = await import('@/data/catalog');

    const raw = fs.readFileSync(
      path.resolve(__dirname, '../../public/catalog.json'),
      'utf-8'
    );
    const catalog = JSON.parse(raw) as Array<{
      id: string;
      title: string;
      category: string;
      popular: boolean;
      multiplayer: boolean;
      iframeCompatible: boolean;
      primaryUrl: string | null;
      mirrors: Array<{ label: string; url: string }>;
    }>;

    expect(catalog).toHaveLength(563);
    const uniqueIds = new Set(catalog.map((g) => g.id));
    expect(uniqueIds.size).toBe(563);

    const categoryCounts = new Map<string, number>();
    for (const g of catalog) {
      categoryCounts.set(g.category, (categoryCounts.get(g.category) ?? 0) + 1);
      expect(safeGameUrl(g.primaryUrl)).not.toBeNull();
      for (const m of g.mirrors) {
        expect(safeGameUrl(m.url)).not.toBeNull();
      }
    }

    expect(CATEGORIES).toHaveLength(7);
    expect(categoryCounts.get('aaa-console')).toBe(14);
    expect(categoryCounts.get('nintendo-decomp')).toBe(6);
    expect(categoryCounts.get('classic-pc')).toBe(15);
    expect(categoryCounts.get('retro-arcade')).toBe(227);
    expect(categoryCounts.get('flash-classics')).toBe(286);
    expect(categoryCounts.get('modern-indie')).toBe(6);
    expect(categoryCounts.get('hubs')).toBe(9);

    expect(catalog.filter((g) => g.popular)).toHaveLength(31);
    expect(catalog.filter((g) => g.multiplayer)).toHaveLength(224);
    expect(catalog.filter((g) => g.iframeCompatible).length).toBeGreaterThanOrEqual(1);
    expect(safeGameUrl('javascript:alert(1)')).toBeNull();
  });

  it('verifies client/index.html metadata and Home.tsx WASM//DECK integration hooks', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const indexHtml = fs.readFileSync(
      path.resolve(__dirname, '../../index.html'),
      'utf-8'
    );
    const homeSrc = fs.readFileSync(
      path.resolve(__dirname, '../pages/Home.tsx'),
      'utf-8'
    );

    expect(indexHtml).toContain('WASM//DECK — Browser Game Index');
    expect(indexHtml).toContain('#10110f');
    expect(indexHtml).not.toContain('bg-[#060714]');

    expect(homeSrc).toContain('AsciiBackground');
    expect(homeSrc).toContain('const PAGE_SIZE = 24');
    expect(homeSrc).toContain('wasmdeck:favorites');
    expect(homeSrc).toContain('wasmdeck:recent');
    expect(homeSrc).toContain('data-testid="launcher-dialog"');
    expect(homeSrc).not.toContain('layoutId=');
  });
});

describe('M3 — Lightweight CSS Surfaces & Theme Color Invariants', () => {
  it('enforces clean, high-performance Framer Motion and native Dialog in HeroDeck, GameCard, and Dialog', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const heroSrc = fs.readFileSync(
      path.resolve(__dirname, '../components/HeroDeck.tsx'),
      'utf-8'
    );
    const cardSrc = fs.readFileSync(
      path.resolve(__dirname, '../components/GameCard.tsx'),
      'utf-8'
    );
    const dialogSrc = fs.readFileSync(
      path.resolve(__dirname, '../components/Dialog.tsx'),
      'utf-8'
    );

    expect(heroSrc).toContain('hero-stage');
    expect(heroSrc).toContain('hero-console');
    expect(heroSrc).not.toContain('LiquidGlassCard');

    expect(cardSrc).toContain('game-card');
    expect(cardSrc).not.toContain('LiquidGlassCard');

    expect(dialogSrc).toContain('<dialog');
    expect(dialogSrc).not.toContain('LiquidGlassDialog');
  });

  it('hoists theme tokens to :root, uses translucent scrims, and supports accent color variables in index.css', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const cssSrc = fs.readFileSync(
      path.resolve(__dirname, '../index.css'),
      'utf-8'
    );

    expect(cssSrc).toContain(':root[data-theme="light"]');
    expect(cssSrc).toContain('--shell-scrim');
    expect(cssSrc).toContain('--accent-ink');
    expect(cssSrc).toContain('--lime');
    expect(cssSrc).toContain('.settings-trigger');
  });

  it('exposes all 5 procedural ASCII animation presets and verifies contrast styling', async () => {
    const { ASCII_ANIMATION_PRESETS } = await import('@/contexts/ThemeContext');
    expect(ASCII_ANIMATION_PRESETS).toHaveLength(5);
    const ids = ASCII_ANIMATION_PRESETS.map((p) => p.id);
    expect(ids).toEqual(['koi', 'matrix', 'waves', 'starfield', 'life']);

    // Check SettingsDialog contains contrast safe style bindings
    const fs = await import('fs');
    const settingsDialogSrc = fs.readFileSync(
      'C:/Users/CIDMOOSA/Desktop/programing/games/client/src/components/SettingsDialog.tsx',
      'utf-8'
    );
    expect(settingsDialogSrc).toContain('color: "#0b0d09"');
    expect(settingsDialogSrc).toContain('asciiAnimation');
    expect(settingsDialogSrc).toContain('setAsciiAnimation');
  });

  it('initializes and steps all 4 new procedural ASCII canvas engines cleanly', async () => {
    const {
      createMatrixRain,
      createSynthwaveGrid,
      createHyperspaceStarfield,
      createGameOfLife,
    } = await import('@/lib/ascii/asciiEngines');

    function createMockCanvas(w = 1280, h = 720) {
      const calls: string[] = [];
      const ctx = {
        save() {},
        restore() {},
        scale() {},
        fillRect() {
          calls.push('fillRect');
        },
        fillText() {
          calls.push('fillText');
        },
        font: '',
        fillStyle: '',
        globalAlpha: 1,
        textAlign: '',
        textBaseline: '',
      };
      return {
        canvas: {
          width: w,
          height: h,
          getContext: () => ctx,
        } as unknown as HTMLCanvasElement,
        calls,
      };
    }

    const palette = {
      bg: '#10110f',
      accent: '#c8f36a',
      faint: '#888888',
    };

    // 1. Matrix Rain
    const m = createMockCanvas();
    const matrix = createMatrixRain(m.canvas, { width: 1280, height: 720, dpr: 1, palette });
    matrix.stepAndRender(100);
    expect(m.calls.length).toBeGreaterThan(0);
    matrix.destroy();

    // 2. Synthwave Grid
    const w = createMockCanvas();
    const waves = createSynthwaveGrid(w.canvas, { width: 1280, height: 720, dpr: 1, palette });
    waves.stepAndRender(100);
    expect(w.calls.length).toBeGreaterThan(0);
    waves.destroy();

    // 3. Hyperspace Starfield
    const s = createMockCanvas();
    const starfield = createHyperspaceStarfield(s.canvas, { width: 1280, height: 720, dpr: 1, palette });
    starfield.stepAndRender(100);
    expect(s.calls.length).toBeGreaterThan(0);
    starfield.destroy();

    // 4. Game of Life
    const l = createMockCanvas();
    const life = createGameOfLife(l.canvas, { width: 1280, height: 720, dpr: 1, palette });
    life.stepAndRender(100);
    expect(l.calls.length).toBeGreaterThan(0);
    life.destroy();
  });
});
