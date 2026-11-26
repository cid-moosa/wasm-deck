/**
 * Pure WebGL 120 FPS Liquid Glass Physical Optics Engine.
 * 
 * Features:
 * - Scissor-Pass Multi-Card WebGL rendering: single WebGL context rendering
 *   fullscreen background pass followed by hardware-scissored passes for each
 *   active DOM card, pill, and dialog.
 * - Zero WebGL context churn (avoids browser 8-16 context limit).
 * - Analytical SDF rounded box bevel normals with Snell's law refraction.
 * - Wavelength-dependent chromatic dispersion.
 * - Dynamic harmonic breathing liquid waves and pointer click ripples.
 * - Pointer-driven 3D perspective tilt normal synthesis.
 * - Blinn-Phong specular gloss and Fresnel rim sheen.
 * - Offline procedural fallback texture generator.
 * - Automatic DPR clamping and graceful WebGL context loss recovery.
 */

import { resolvePreset } from './presets';
import { createProceduralCausticsCanvas } from './procedural-texture';
import { bgFsSource, glassFsSource, vsSource } from './shaders';
import type { EngineOptions, LiquidGlassOpticalSettings, LiquidGlassPresetParams, RegisteredGlassElement } from './types';

export class LiquidGlassEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private options: Required<EngineOptions>;

  private bgProgram: WebGLProgram | null = null;
  private glassProgram: WebGLProgram | null = null;
  private quadBuffer: WebGLBuffer | null = null;
  private texture: WebGLTexture | null = null;

  // Background program uniform / attrib locations
  private bgAPosLoc = -1;
  private bgUImageLoc: WebGLUniformLocation | null = null;
  private bgUTimeLoc: WebGLUniformLocation | null = null;
  private bgUBgDriftLoc: WebGLUniformLocation | null = null;

  // Glass program uniform / attrib locations
  private aPosLoc = -1;
  private uImageLoc: WebGLUniformLocation | null = null;
  private uResLoc: WebGLUniformLocation | null = null;
  private uGlassRectLoc: WebGLUniformLocation | null = null;
  private uRadiusLoc: WebGLUniformLocation | null = null;
  private uRefractionLoc: WebGLUniformLocation | null = null;
  private uChromaLoc: WebGLUniformLocation | null = null;
  private uSpecularLoc: WebGLUniformLocation | null = null;
  private uTimeLoc: WebGLUniformLocation | null = null;
  private uBgDriftLoc: WebGLUniformLocation | null = null;
  private uWaveAmpLoc: WebGLUniformLocation | null = null;
  private uMouseLoc: WebGLUniformLocation | null = null;
  private uRipplePosLoc: WebGLUniformLocation | null = null;
  private uRippleTimeLoc: WebGLUniformLocation | null = null;
  private uTiltLoc: WebGLUniformLocation | null = null;

  private dpr = 1;
  private isDestroyed = false;
  private isContextLost = false;
  private currentSource: string | HTMLCanvasElement | null = null;
  private uploadedTexWidth = 0;
  private uploadedTexHeight = 0;
  private bgDriftEnabled = true;

  // Internal element state overrides (tilt, ripples)
  private elementStates = new Map<string, {
    tiltX: number;
    tiltY: number;
    targetTiltX: number;
    targetTiltY: number;
    ripplePos: [number, number];
    rippleStartTime: number;
  }>();

  // Global optical overrides applied across registered glass elements
  private globalOverrides: Partial<LiquidGlassOpticalSettings> | null = null;

  constructor(canvas: HTMLCanvasElement, options?: EngineOptions) {
    this.canvas = canvas;
    this.options = {
      dprMax: options?.dprMax ?? 2.0,
      antialias: options?.antialias ?? true,
      alpha: options?.alpha ?? false,
      defaultBackground: options?.defaultBackground ?? '',
    };

    this.dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, this.options.dprMax);

    this.initWebGL();
    this.bindEvents();
  }

  private initWebGL(): void {
    const gl = this.canvas.getContext('webgl', {
      antialias: this.options.antialias,
      alpha: this.options.alpha,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      console.warn('[LiquidGlassEngine] WebGL context is not supported on this platform.');
      return;
    }

    this.gl = gl;
    this.isContextLost = false;
    this.uploadedTexWidth = 0;
    this.uploadedTexHeight = 0;

    // Compile programs
    this.bgProgram = this.createProgram(vsSource, bgFsSource);
    this.glassProgram = this.createProgram(vsSource, glassFsSource);

    if (!this.bgProgram || !this.glassProgram) {
      console.error('[LiquidGlassEngine] Failed to compile WebGL shader programs.');
      return;
    }

    // Cache Background program locations
    this.bgAPosLoc = gl.getAttribLocation(this.bgProgram, 'a_pos');
    this.bgUImageLoc = gl.getUniformLocation(this.bgProgram, 'u_image');
    this.bgUTimeLoc = gl.getUniformLocation(this.bgProgram, 'u_time');
    this.bgUBgDriftLoc = gl.getUniformLocation(this.bgProgram, 'u_bg_drift');

    // Cache Glass program locations
    this.aPosLoc = gl.getAttribLocation(this.glassProgram, 'a_pos');
    this.uImageLoc = gl.getUniformLocation(this.glassProgram, 'u_image');
    this.uResLoc = gl.getUniformLocation(this.glassProgram, 'u_resolution');
    this.uGlassRectLoc = gl.getUniformLocation(this.glassProgram, 'u_glass_rect');
    this.uRadiusLoc = gl.getUniformLocation(this.glassProgram, 'u_radius');
    this.uRefractionLoc = gl.getUniformLocation(this.glassProgram, 'u_refraction');
    this.uChromaLoc = gl.getUniformLocation(this.glassProgram, 'u_chroma');
    this.uSpecularLoc = gl.getUniformLocation(this.glassProgram, 'u_specular');
    this.uTimeLoc = gl.getUniformLocation(this.glassProgram, 'u_time');
    this.uBgDriftLoc = gl.getUniformLocation(this.glassProgram, 'u_bg_drift');
    this.uWaveAmpLoc = gl.getUniformLocation(this.glassProgram, 'u_wave_amp');
    this.uMouseLoc = gl.getUniformLocation(this.glassProgram, 'u_mouse');
    this.uRipplePosLoc = gl.getUniformLocation(this.glassProgram, 'u_ripple_pos');
    this.uRippleTimeLoc = gl.getUniformLocation(this.glassProgram, 'u_ripple_time');
    this.uTiltLoc = gl.getUniformLocation(this.glassProgram, 'u_tilt');

    // Setup fullscreen NDC quad buffer: 2 triangles
    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0,
      ]),
      gl.STATIC_DRAW
    );

    // Setup texture container
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Upload initial fallback texture immediately so context is never blank
    this.uploadCanvasTexture(createProceduralCausticsCanvas(1920, 1080));

    // Reload prior source if recovering from context loss
    if (this.currentSource) {
      this.setBackgroundImage(this.currentSource);
    } else if (this.options.defaultBackground) {
      this.setBackgroundImage(this.options.defaultBackground);
    }
  }

  private createProgram(vsCode: string, fsCode: string): WebGLProgram | null {
    const gl = this.gl;
    if (!gl) return null;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    if (!vs) return null;
    gl.shaderSource(vs, vsCode);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.error('[LiquidGlassEngine] VS Compile Error:', gl.getShaderInfoLog(vs));
      gl.deleteShader(vs);
      return null;
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fs) return null;
    gl.shaderSource(fs, fsCode);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error('[LiquidGlassEngine] FS Compile Error:', gl.getShaderInfoLog(fs));
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return null;
    }

    const prog = gl.createProgram();
    if (!prog) return null;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[LiquidGlassEngine] Link Program Error:', gl.getProgramInfoLog(prog));
      gl.deleteProgram(prog);
      return null;
    }

    return prog;
  }

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.isContextLost = true;
    console.warn('[LiquidGlassEngine] WebGL context lost.');
  };

  private handleContextRestored = (): void => {
    console.info('[LiquidGlassEngine] WebGL context restored. Rebuilding GPU state.');
    this.initWebGL();
  };

  private bindEvents(): void {
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost, false);
    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored, false);
  }

  private unbindEvents(): void {
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
  }

  public setDpr(dpr: number): void {
    this.dpr = Math.min(Math.max(1, dpr), this.options.dprMax);
  }

  public getDpr(): number {
    return this.dpr;
  }

  public resize(width: number, height: number): void {
    if (!this.gl || this.isContextLost) return;
    const targetW = Math.max(1, Math.round(width * this.dpr));
    const targetH = Math.max(1, Math.round(height * this.dpr));

    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  private uploadCanvasTexture(sourceCanvas: HTMLCanvasElement): void {
    const gl = this.gl;
    if (!gl || !this.texture || this.isContextLost) return;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);
    this.uploadedTexWidth = sourceCanvas.width;
    this.uploadedTexHeight = sourceCanvas.height;
  }

  public updateBackgroundCanvas(sourceCanvas: HTMLCanvasElement): void {
    const gl = this.gl;
    if (!gl || !this.texture || this.isContextLost) return;
    if (sourceCanvas.width <= 0 || sourceCanvas.height <= 0) return;

    this.currentSource = sourceCanvas;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    if (
      this.uploadedTexWidth === sourceCanvas.width &&
      this.uploadedTexHeight === sourceCanvas.height
    ) {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);
      this.uploadedTexWidth = sourceCanvas.width;
      this.uploadedTexHeight = sourceCanvas.height;
    }
  }

  public setBackgroundDrift(enabled: boolean): void {
    this.bgDriftEnabled = enabled;
  }

  public async setBackgroundImage(source: string | HTMLCanvasElement): Promise<void> {
    this.currentSource = source;
    if (!this.gl || !this.texture || this.isContextLost) return;

    if (source instanceof HTMLCanvasElement) {
      this.uploadCanvasTexture(source);
      return;
    }

    if (typeof source === 'string' && source.length > 0) {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          const gl = this.gl;
          if (!gl || !this.texture || this.isContextLost) {
            resolve();
            return;
          }
          gl.bindTexture(gl.TEXTURE_2D, this.texture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
          this.uploadedTexWidth = img.naturalWidth || img.width || 0;
          this.uploadedTexHeight = img.naturalHeight || img.height || 0;
          resolve();
        };

        img.onerror = () => {
          console.warn(`[LiquidGlassEngine] Failed to load image from "${source}". Falling back to offline procedural texture.`);
          this.uploadCanvasTexture(createProceduralCausticsCanvas(1920, 1080));
          resolve();
        };

        img.src = source;
      });
    }
  }

  public setTilt(id: string, tiltX: number, tiltY: number): void {
    const st = this.elementStates.get(id);
    if (st) {
      st.targetTiltX = tiltX;
      st.targetTiltY = tiltY;
    } else {
      this.elementStates.set(id, {
        tiltX,
        tiltY,
        targetTiltX: tiltX,
        targetTiltY: tiltY,
        ripplePos: [0.5, 0.5],
        rippleStartTime: -999.0,
      });
    }
  }

  public triggerRipple(id: string, uvX: number, uvY: number, timeSeconds: number): void {
    const st = this.elementStates.get(id);
    if (st) {
      st.ripplePos = [uvX, uvY];
      st.rippleStartTime = timeSeconds;
    } else {
      this.elementStates.set(id, {
        tiltX: 0,
        tiltY: 0,
        targetTiltX: 0,
        targetTiltY: 0,
        ripplePos: [uvX, uvY],
        rippleStartTime: timeSeconds,
      });
    }
  }

  public setGlobalOverrides(overrides: Partial<LiquidGlassOpticalSettings> | null): void {
    if (!overrides) {
      this.globalOverrides = null;
      return;
    }
    const clean: Partial<LiquidGlassOpticalSettings> = {};
    if (typeof overrides.refraction === 'number' && Number.isFinite(overrides.refraction)) {
      clean.refraction = overrides.refraction;
    }
    if (typeof overrides.chroma === 'number' && Number.isFinite(overrides.chroma)) {
      clean.chroma = overrides.chroma;
    }
    if (typeof overrides.specular === 'number' && Number.isFinite(overrides.specular)) {
      clean.specular = overrides.specular;
    }
    if (typeof overrides.bevel === 'number' && Number.isFinite(overrides.bevel)) {
      clean.bevel = overrides.bevel;
    }
    this.globalOverrides = clean;
  }

  public getGlobalOverrides(): Partial<LiquidGlassOpticalSettings> | null {
    return this.globalOverrides ? { ...this.globalOverrides } : null;
  }

  /**
   * Main Scissor-Pass Multi-Card Render Pipeline.
   * 
   * 1. Base pass: Fullscreen background image rendering via bgProgram.
   * 2. Scissor passes: Iterates through registered DOM elements in viewport,
   *    restricting GPU rasterization to each card's pixel bounding box via
   *    hardware gl.scissor and applying element-specific physical glass uniforms.
   */
  public render(
    elements: RegisteredGlassElement[],
    timeSeconds: number,
    mousePos: [number, number] = [0.5, 0.5]
  ): void {
    const gl = this.gl;
    if (!gl || !this.bgProgram || !this.glassProgram || !this.quadBuffer || !this.texture || this.isContextLost) {
      return;
    }

    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;
    const winW = typeof window !== 'undefined' ? window.innerWidth : canvasW;
    const winH = typeof window !== 'undefined' ? window.innerHeight : canvasH;

    // ----------------------------------------------------
    // PASS 1: Base Fullscreen Background Scene Pass
    // ----------------------------------------------------
    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, canvasW, canvasH);
    gl.clearColor(0.02, 0.03, 0.06, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.bgProgram);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(this.bgAPosLoc);
    gl.vertexAttribPointer(this.bgAPosLoc, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    if (this.bgUImageLoc) {
      gl.uniform1i(this.bgUImageLoc, 0);
    }
    if (this.bgUTimeLoc) {
      gl.uniform1f(this.bgUTimeLoc, timeSeconds);
    }
    if (this.bgUBgDriftLoc) {
      gl.uniform1f(this.bgUBgDriftLoc, this.bgDriftEnabled ? 1.0 : 0.0);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (elements.length === 0) return;

    // ----------------------------------------------------
    // PASS 2: Multi-Card Scissor Passes
    // ----------------------------------------------------
    gl.enable(gl.SCISSOR_TEST);
    gl.useProgram(this.glassProgram);

    gl.enableVertexAttribArray(this.aPosLoc);
    gl.vertexAttribPointer(this.aPosLoc, 2, gl.FLOAT, false, 0, 0);

    if (this.uImageLoc) gl.uniform1i(this.uImageLoc, 0);
    if (this.uResLoc) gl.uniform2f(this.uResLoc, canvasW, canvasH);
    if (this.uMouseLoc) gl.uniform2f(this.uMouseLoc, mousePos[0], mousePos[1]);
    if (this.uBgDriftLoc) gl.uniform1f(this.uBgDriftLoc, this.bgDriftEnabled ? 1.0 : 0.0);

    // Sort by zIndex if specified to maintain correct optical depth
    const sorted = [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    for (const item of sorted) {
      const el = item.element;
      if (!el || !el.isConnected) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;

      // Viewport culling: Skip elements completely outside visible screen
      if (
        rect.right < 0 ||
        rect.left > winW ||
        rect.bottom < 0 ||
        rect.top > winH
      ) {
        continue;
      }

      // Convert DOM coordinates (top-left origin) to WebGL framebuffer scissor coordinates (bottom-left origin)
      const dpr = this.dpr;
      const scX = Math.max(0, Math.floor(rect.left * dpr));
      const scY = Math.max(0, Math.floor((winH - rect.bottom) * dpr));
      const scW = Math.max(1, Math.min(canvasW - scX, Math.ceil(rect.width * dpr)));
      const scH = Math.max(1, Math.min(canvasH - scY, Math.ceil(rect.height * dpr)));

      gl.scissor(scX, scY, scW, scH);

      // Normalized [0, 1] UV bounding box across full window
      const uvX = rect.left / winW;
      const uvY = rect.top / winH;
      const uvW = rect.width / winW;
      const uvH = rect.height / winH;

      const baseParams = resolvePreset(item.preset);
      const mergedParams: LiquidGlassPresetParams = this.globalOverrides
        ? {
            ...baseParams,
            ...(this.globalOverrides.refraction !== undefined ? { refraction: this.globalOverrides.refraction } : {}),
            ...(this.globalOverrides.chroma !== undefined ? { chroma: this.globalOverrides.chroma } : {}),
            ...(this.globalOverrides.specular !== undefined ? { specular: this.globalOverrides.specular } : {}),
            ...(this.globalOverrides.bevel !== undefined ? { bevel: this.globalOverrides.bevel } : {}),
          }
        : baseParams;

      // Smooth tilt interpolation
      let state = this.elementStates.get(item.id);
      if (!state) {
        state = {
          tiltX: item.tiltX,
          tiltY: item.tiltY,
          targetTiltX: item.tiltX,
          targetTiltY: item.tiltY,
          ripplePos: item.ripplePos,
          rippleStartTime: item.rippleStartTime,
        };
        this.elementStates.set(item.id, state);
      } else {
        // Linear damping towards target tilt
        state.tiltX += (state.targetTiltX - state.tiltX) * 0.14;
        state.tiltY += (state.targetTiltY - state.tiltY) * 0.14;
      }

      // Uniform updates
      if (this.uGlassRectLoc) gl.uniform4f(this.uGlassRectLoc, uvX, uvY, uvW, uvH);
      if (this.uRadiusLoc) gl.uniform1f(this.uRadiusLoc, item.radius ?? mergedParams.bevel);
      if (this.uRefractionLoc) gl.uniform1f(this.uRefractionLoc, mergedParams.refraction);
      if (this.uChromaLoc) gl.uniform1f(this.uChromaLoc, mergedParams.chroma);
      if (this.uSpecularLoc) gl.uniform1f(this.uSpecularLoc, mergedParams.specular);
      if (this.uWaveAmpLoc) gl.uniform1f(this.uWaveAmpLoc, 0.0); // Static glass: zero wave wobble
      if (this.uTimeLoc) gl.uniform1f(this.uTimeLoc, timeSeconds);
      if (this.uTiltLoc) gl.uniform2f(this.uTiltLoc, state.tiltX, state.tiltY);

      if (this.uRipplePosLoc) {
        gl.uniform2f(this.uRipplePosLoc, state.ripplePos[0], state.ripplePos[1]);
      }
      if (this.uRippleTimeLoc) {
        const rippleElapsed = Math.max(0.0, timeSeconds - state.rippleStartTime);
        gl.uniform1f(this.uRippleTimeLoc, rippleElapsed);
      }

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    gl.disable(gl.SCISSOR_TEST);
  }

  public destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    this.unbindEvents();

    const gl = this.gl;
    if (gl) {
      if (this.quadBuffer) gl.deleteBuffer(this.quadBuffer);
      if (this.texture) gl.deleteTexture(this.texture);
      if (this.bgProgram) gl.deleteProgram(this.bgProgram);
      if (this.glassProgram) gl.deleteProgram(this.glassProgram);
    }

    this.quadBuffer = null;
    this.texture = null;
    this.bgProgram = null;
    this.glassProgram = null;
    this.gl = null;
    this.elementStates.clear();
  }
}
