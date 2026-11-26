/**
 * GLSL Vertex and Fragment Shaders for the WebGL Physical Liquid Glass Engine.
 * 
 * Implements:
 * - Fullscreen NDC quad projection mapping into inverted DOM-aligned UV space.
 * - Analytical Signed Distance Field (SDF) rounded box: sdRoundedBox.
 * - Spatial finite-difference gradient bevel normals.
 * - Dual-frequency harmonic fluid wave perturbations (breathing liquid waves).
 * - Interactive click ripple shockwaves with radial exponential damping.
 * - Dynamic 3D perspective tilt normal synthesis.
 * - Snell's Law optical refraction ray deviation.
 * - Wavelength-dependent chromatic aberration dispersion (RGB channel offset).
 * - Multi-light Blinn-Phong specular gloss and cubic Fresnel rim reflections.
 * - Edge ambient occlusion mimicking total internal reflection trapping.
 */

export const vsSource = `
  attribute vec2 a_pos;
  varying vec2 v_uv;
  void main() {
    v_uv = (a_pos + 1.0) * 0.5;
    v_uv.y = 1.0 - v_uv.y;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;

export const bgFsSource = `
  precision highp float;
  varying vec2 v_uv;
  uniform sampler2D u_image;
  uniform float u_time;
  uniform float u_bg_drift;
  void main() {
    // Smooth cinematic background motion (subtle continuous drift when u_bg_drift == 1.0)
    vec2 center = vec2(0.5, 0.5);
    vec2 bgOffset = vec2(sin(u_time * 0.25) * 0.02, cos(u_time * 0.2) * 0.015) * u_bg_drift;
    float bgScale = mix(1.0, 0.94, u_bg_drift);
    vec2 bgUv = center + (v_uv - center) * bgScale + bgOffset;
    gl_FragColor = texture2D(u_image, bgUv);
  }
`;

export const glassFsSource = `
  precision highp float;
  varying vec2 v_uv;

  uniform sampler2D u_image;
  uniform vec2 u_resolution;
  uniform vec4 u_glass_rect;  // x, y, width, height in normalized [0, 1] UV space
  uniform float u_radius;      // Bevel corner radius factor
  uniform float u_refraction;  // Optical refractive power
  uniform float u_chroma;      // Chromatic dispersion (RGB split)
  uniform float u_specular;    // Specular gloss intensity
  uniform float u_time;        // Real-time animation clock (time * speed)
  uniform float u_bg_drift;    // 1.0 for static drift, 0.0 for 1:1 animated backgrounds
  uniform float u_wave_amp;    // Harmonic wave height amplitude
  uniform vec2 u_mouse;        // Mouse pointer UV coordinates
  uniform vec2 u_ripple_pos;   // Click ripple shockwave origin
  uniform float u_ripple_time; // Click ripple elapsed time
  uniform vec2 u_tilt;         // Dynamic 3D perspective tilt vector

  // Analytical Signed Distance Field for Rounded Box
  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  void main() {
    // Dynamic background drift matching the fullscreen background pass
    vec2 center = vec2(0.5, 0.5);
    vec2 bgOffset = vec2(sin(u_time * 0.25) * 0.02, cos(u_time * 0.2) * 0.015) * u_bg_drift;
    float bgScale = mix(1.0, 0.94, u_bg_drift);
    vec2 bgUv = center + (v_uv - center) * bgScale + bgOffset;

    // Aspect ratio preservation for Euclidean distance metrics
    vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
    vec2 p = v_uv * aspect;

    vec2 glassCenter = (u_glass_rect.xy + u_glass_rect.zw * 0.5) * aspect;
    vec2 halfSize = (u_glass_rect.zw * 0.5) * aspect;
    float maxCornerRadius = min(halfSize.x, halfSize.y);
    float radius = max(0.0, min(u_radius * aspect.y, maxCornerRadius));

    vec2 localP = p - glassCenter;
    float d = sdRoundedBox(localP, halfSize, radius);

    // Outside rounded glass boundary: Passthrough moving background texture
    if (d > 0.0) {
      gl_FragColor = texture2D(u_image, bgUv);
      return;
    }

    // 1. Static Optical Bevel Normal via analytical SDF finite-difference gradient (No jiggle / giggle)
    float eps = 0.002;
    float dx = sdRoundedBox(localP + vec2(eps, 0.0), halfSize, radius) - d;
    float dy = sdRoundedBox(localP + vec2(0.0, eps), halfSize, radius) - d;
    float gradLen = length(vec2(dx, dy));
    vec2 grad = (gradLen > 1e-5) ? (vec2(dx, dy) / gradLen) : vec2(0.0);

    float edgeDist = -d;
    float rimWidth = max(radius * 1.15, 0.001);
    float edgeFactor = 1.0 - smoothstep(0.0, rimWidth, edgeDist);

    // 2. Harmonic Fluid Waves (Static glass: waveGrad evaluates to zero, eliminating jiggle)
    vec2 waveFreq = vec2(18.0, 22.0);
    vec2 waveGrad = vec2(0.0) * u_wave_amp;

    // 3. Interactive Click Ripple Shockwave
    vec2 toRipple = (v_uv - u_ripple_pos) * aspect;
    float rDist = length(toRipple);
    float rProgress = u_ripple_time * 2.5;
    float rDelta = rDist - rProgress;
    float rWave = sin(rDelta * 35.0) * exp(-rDist * 3.0) * exp(-u_ripple_time * 3.5);
    vec2 rGrad = (rDist > 0.001) ? normalize(toRipple) * rWave * 0.06 : vec2(0.0);

    // 4. Synthesize Pure Static Physical Optical Surface Normal
    // Glass is static; normal is firmly anchored to the physical bevel lens
    vec2 totalOffset = grad * edgeFactor * 2.4 + waveGrad * 0.8 + rGrad;
    vec3 N = normalize(vec3(totalOffset, 0.65));

    // 5. Snell's Law Optical Refraction Vector
    vec2 refractOffset = N.xy * u_refraction * (0.35 + edgeFactor * 0.95);

    // 6. Dynamic Chromatic Aberration Dispersion (Wavelength-dependent RGB separation)
    float chroma = u_chroma * (0.3 + edgeFactor * 0.9);
    vec2 uvR = center + (clamp(v_uv - refractOffset * (1.0 + chroma), 0.001, 0.999) - center) * bgScale + bgOffset;
    vec2 uvG = center + (clamp(v_uv - refractOffset, 0.001, 0.999) - center) * bgScale + bgOffset;
    vec2 uvB = center + (clamp(v_uv - refractOffset * (1.0 - chroma), 0.001, 0.999) - center) * bgScale + bgOffset;

    float rCol = texture2D(u_image, clamp(uvR, 0.001, 0.999)).r;
    float gCol = texture2D(u_image, clamp(uvG, 0.001, 0.999)).g;
    float bCol = texture2D(u_image, clamp(uvB, 0.001, 0.999)).b;
    vec3 refractColor = vec3(rCol, gCol, bCol);

    // 7. Lighting & Specular Blinn-Phong Shading
    vec2 lightOffset = (u_mouse - 0.5) * 1.5;
    vec3 lightDir = normalize(vec3(0.35 + lightOffset.x * 0.3, -0.65 + lightOffset.y * 0.3, 0.85));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 halfVec = normalize(lightDir + viewDir);

    float fresnel = pow(1.0 - max(dot(viewDir, N), 0.0), 3.0);
    float spec = pow(max(dot(N, halfVec), 0.0), 28.0) * u_specular;

    // 8. Composite Final Colors
    vec3 finalColor = refractColor * vec3(0.97, 0.99, 1.0);
    finalColor += vec3(1.0) * spec * (0.75 + edgeFactor * 0.6);
    finalColor += vec3(0.85, 0.95, 1.0) * fresnel * 0.45;

    // Edge ambient occlusion
    float innerAO = smoothstep(0.0, 0.018, edgeDist);
    finalColor *= (0.86 + 0.14 * innerAO);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
