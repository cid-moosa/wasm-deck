/**
 * High-Contrast Procedural Background Canvas Generator for Offline Reliability.
 * 
 * Generates rich, multi-layered caustic patterns, vibrant luminous mesh gradients,
 * and glowing spatial structures directly via HTML5 Canvas 2D without requiring
 * external network calls.
 */

export function createProceduralCausticsCanvas(width = 1920, height = 1080): HTMLCanvasElement {
  if (typeof document === 'undefined') {
    return { width, height } as unknown as HTMLCanvasElement;
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return canvas;

  // 1. Deep Midnight Base Gradient
  const baseGrad = ctx.createLinearGradient(0, 0, width, height);
  baseGrad.addColorStop(0.0, '#060714');
  baseGrad.addColorStop(0.35, '#0b1229');
  baseGrad.addColorStop(0.7, '#130d2e');
  baseGrad.addColorStop(1.0, '#050a18');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Radiant Luminous Orbs for Rich Optical Refraction Contrast
  const orbs = [
    { x: width * 0.22, y: height * 0.28, r: width * 0.35, c1: 'rgba(0, 240, 255, 0.55)', c2: 'rgba(0, 100, 255, 0)' },
    { x: width * 0.78, y: height * 0.32, r: width * 0.4, c1: 'rgba(255, 0, 128, 0.5)', c2: 'rgba(160, 0, 255, 0)' },
    { x: width * 0.5, y: height * 0.75, r: width * 0.42, c1: 'rgba(0, 255, 170, 0.45)', c2: 'rgba(0, 150, 200, 0)' },
    { x: width * 0.85, y: height * 0.82, r: width * 0.3, c1: 'rgba(255, 170, 0, 0.45)', c2: 'rgba(255, 80, 0, 0)' },
    { x: width * 0.15, y: height * 0.85, r: width * 0.32, c1: 'rgba(170, 50, 255, 0.45)', c2: 'rgba(50, 0, 150, 0)' },
  ];

  ctx.globalCompositeOperation = 'screen';
  orbs.forEach(orb => {
    const rad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
    rad.addColorStop(0, orb.c1);
    rad.addColorStop(0.5, orb.c1.replace(/0\.\d+\)/, '0.15)'));
    rad.addColorStop(1, orb.c2);
    ctx.fillStyle = rad;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // 3. Shimmering Caustic Light Ribbons (Sinusoidal Optical Filaments)
  ctx.lineWidth = 1.8;
  const ribbonCount = 42;
  for (let i = 0; i < ribbonCount; i++) {
    const t = i / ribbonCount;
    ctx.beginPath();
    const startY = height * (0.05 + t * 0.9);
    const alpha = 0.08 + Math.sin(t * Math.PI) * 0.14;
    ctx.strokeStyle = i % 2 === 0 ? `rgba(0, 255, 230, ${alpha})` : `rgba(255, 90, 200, ${alpha})`;

    ctx.moveTo(0, startY);
    const step = 24;
    for (let x = 0; x <= width; x += step) {
      const freq1 = 0.0035 + (i % 5) * 0.0008;
      const freq2 = 0.008 + (i % 3) * 0.0015;
      const amp = 35 + (i % 7) * 8;
      const y = startY + Math.sin(x * freq1 + i * 0.4) * amp + Math.cos(x * freq2 - i * 0.2) * (amp * 0.5);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // 4. Subtle Isometric Micro-Grid for High-Frequency Spatial Dispersion Highlights
  ctx.lineWidth = 0.75;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  const gridSpacing = 48;
  for (let x = 0; x <= width; x += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // 5. High-Energy Core Highlights
  const centerGlow = ctx.createRadialGradient(width * 0.5, height * 0.4, 0, width * 0.5, height * 0.4, width * 0.25);
  centerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
  centerGlow.addColorStop(0.3, 'rgba(120, 200, 255, 0.15)');
  centerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = centerGlow;
  ctx.beginPath();
  ctx.arc(width * 0.5, height * 0.4, width * 0.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = 'source-over';
  return canvas;
}
