/**
 * High-performance procedural 2D Canvas ASCII animation engines for WASM//DECK.
 * 
 * Engines:
 * 1. Matrix Rain (Cyberpunk digital cascading code)
 * 2. Synthwave Grid (3D perspective rolling wireframe terrain)
 * 3. Hyperspace Starfield (3D warp velocity particle streaks with pointer parallax)
 * 4. Game of Life (Conway's cellular automata with age trails and glider injection)
 */

export interface AsciiEnginePalette {
  bg: string;
  accent: string;
  faint: string;
  glow?: string;
}

export interface AsciiEngineController {
  resize: (width: number, height: number, dpr?: number) => void;
  stepAndRender: (nowMs: number) => void;
  destroy: () => void;
  setPalette: (palette: AsciiEnginePalette) => void;
  onPointerMove?: (x: number, y: number) => void;
  feed?: (x: number, y: number, count?: number) => void;
}

const MONO_FONT = '"Geist Mono", ui-monospace, Menlo, Consolas, monospace';

// =============================================================================
// 1. CYBER MATRIX RAIN
// =============================================================================
const MATRIX_CHARS = 'ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ1234567890ABCDEF<>{}/*$#@!%&';

export function createMatrixRain(
  canvas: HTMLCanvasElement,
  options: {
    width: number;
    height: number;
    dpr: number;
    palette: AsciiEnginePalette;
  }
): AsciiEngineController {
  const ctx = canvas.getContext('2d', { alpha: false });
  let width = options.width;
  let height = options.height;
  let dpr = options.dpr;
  let palette = options.palette;
  let destroyed = false;

  const charSize = 15;
  let cols = Math.floor(width / charSize);
  let rows = Math.floor(height / charSize);

  interface Drop {
    y: number;
    speed: number;
    length: number;
    chars: string[];
    nextFlicker: number;
  }

  let drops: Drop[] = [];

  function initDrops() {
    cols = Math.max(10, Math.floor(width / charSize));
    rows = Math.max(10, Math.floor(height / charSize));
    drops = [];
    for (let i = 0; i < cols; i++) {
      const len = Math.floor(Math.random() * 18) + 8;
      const chars: string[] = [];
      for (let j = 0; j < len; j++) {
        chars.push(MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]);
      }
      drops.push({
        y: Math.random() * -rows,
        speed: 0.25 + Math.random() * 0.55,
        length: len,
        chars,
        nextFlicker: Math.random() * 10,
      });
    }
  }

  initDrops();

  let mouseX = -1;
  let mouseY = -1;

  function resize(w: number, h: number, nextDpr = 1) {
    width = w;
    height = h;
    dpr = Math.min(nextDpr, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    initDrops();
  }

  resize(width, height, dpr);

  let lastTime = 0;

  function stepAndRender(nowMs: number) {
    if (destroyed || !ctx) return;
    const dt = lastTime === 0 ? 0.016 : Math.min(0.05, (nowMs - lastTime) / 1000);
    lastTime = nowMs;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Dim the trailing canvas softly to create persistent green/accent phosphor glow
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, width, height);

    ctx.font = `600 ${charSize - 2}px ${MONO_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let c = 0; c < drops.length; c++) {
      const drop = drops[c];
      drop.y += drop.speed * 60 * dt;

      // Reset drop when tail leaves bottom
      if (drop.y - drop.length > rows) {
        drop.y = Math.random() * -10;
        drop.speed = 0.25 + Math.random() * 0.55;
        drop.length = Math.floor(Math.random() * 18) + 8;
      }

      // Random character morph
      drop.nextFlicker -= dt;
      if (drop.nextFlicker <= 0) {
        const replaceIdx = Math.floor(Math.random() * drop.chars.length);
        drop.chars[replaceIdx] = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
        drop.nextFlicker = 0.05 + Math.random() * 0.2;
      }

      const x = c * charSize + charSize / 2;

      // Draw each character in the drop
      for (let j = 0; j < drop.length; j++) {
        const charY = Math.floor(drop.y - j);
        if (charY < 0 || charY >= rows) continue;

        const y = charY * charSize + charSize / 2;
        const char = drop.chars[j % drop.chars.length];

        if (j === 0) {
          // Leading head glyph: bright white with glow
          ctx.fillStyle = '#ffffff';
          ctx.fillText(char, x, y);
        } else {
          // Body trail: fading accent color
          const alpha = Math.max(0.08, 1 - j / drop.length);
          ctx.fillStyle = palette.accent;
          ctx.globalAlpha = alpha;
          ctx.fillText(char, x, y);
          ctx.globalAlpha = 1.0;
        }
      }
    }

    ctx.restore();
  }

  function destroy() {
    destroyed = true;
    drops = [];
  }

  return {
    resize,
    stepAndRender,
    destroy,
    setPalette: (p) => {
      palette = p;
    },
    onPointerMove: (x, y) => {
      mouseX = x;
      mouseY = y;
    },
    feed: (x, _y) => {
      const col = Math.floor(x / charSize);
      for (let offset = -2; offset <= 2; offset++) {
        const c = col + offset;
        if (c >= 0 && c < drops.length) {
          drops[c].y = -Math.random() * 3;
          drops[c].speed = 1.2 + Math.random() * 0.8;
        }
      }
    },
  };
}

// =============================================================================
// 2. SYNTHWAVE 3D PERSPECTIVE WAVE GRID
// =============================================================================
const RAMP_CHARS = ' .:-=+*#%@';

export function createSynthwaveGrid(
  canvas: HTMLCanvasElement,
  options: {
    width: number;
    height: number;
    dpr: number;
    palette: AsciiEnginePalette;
  }
): AsciiEngineController {
  const ctx = canvas.getContext('2d', { alpha: false });
  let width = options.width;
  let height = options.height;
  let dpr = options.dpr;
  let palette = options.palette;
  let destroyed = false;

  function resize(w: number, h: number, nextDpr = 1) {
    width = w;
    height = h;
    dpr = Math.min(nextDpr, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }

  resize(width, height, dpr);

  let mouseX = 0.5;
  let mouseY = 0.5;
  let time = 0;

  function stepAndRender(nowMs: number) {
    if (destroyed || !ctx) return;
    time = nowMs * 0.0015;

    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, width, height);

    const horizonY = height * 0.38 + (mouseY - 0.5) * 40;
    const vanishX = width * 0.5 + (mouseX - 0.5) * 80;

    const cellW = 14;
    const cellH = 16;
    const numCols = Math.ceil(width / cellW);
    const numRows = Math.ceil((height - horizonY) / cellH);

    ctx.font = `500 13px ${MONO_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let r = 0; r < numRows; r++) {
      const depth = (r + 1) / numRows; // 0 near horizon, 1 at bottom
      const y = horizonY + Math.pow(depth, 1.6) * (height - horizonY);

      // Perspective width expansion
      const spread = 0.15 + depth * 0.85;
      const alpha = Math.min(1.0, depth * 1.3);

      for (let c = 0; c < numCols; c++) {
        const normX = (c / numCols - 0.5) * 2;
        const x = vanishX + normX * (width * 0.55) * spread;

        if (x < -20 || x > width + 20) continue;

        // 3D mathematical wave formula
        const wave1 = Math.sin(normX * 4.0 + time * 1.8);
        const wave2 = Math.cos(depth * 10.0 - time * 3.0);
        const elevation = (wave1 * 0.5 + wave2 * 0.5) * (0.3 + depth * 0.7);

        // Map elevation to ASCII character
        const charIdx = Math.max(0, Math.min(RAMP_CHARS.length - 1, Math.floor((elevation + 1) * 0.5 * RAMP_CHARS.length)));
        const ch = RAMP_CHARS[charIdx];

        if (ch === ' ') continue;

        ctx.fillStyle = palette.accent;
        ctx.globalAlpha = Math.max(0.1, alpha * (charIdx / RAMP_CHARS.length));
        ctx.fillText(ch, x, y);
      }
    }

    // Top retro skyline: subtle star dots above horizon
    ctx.fillStyle = palette.accent;
    for (let i = 0; i < 40; i++) {
      const starX = ((i * 137.5) % width);
      const starY = ((i * 91.3) % (horizonY - 20));
      const twinkle = 0.2 + 0.3 * Math.sin(time * 2.0 + i);
      ctx.globalAlpha = twinkle;
      ctx.fillText('·', starX, starY);
    }

    ctx.restore();
  }

  function destroy() {
    destroyed = true;
  }

  return {
    resize,
    stepAndRender,
    destroy,
    setPalette: (p) => {
      palette = p;
    },
    onPointerMove: (x, y) => {
      mouseX = x / width;
      mouseY = y / height;
    },
  };
}

// =============================================================================
// 3. HYPERSPACE STARFIELD (3D WARP SPEED PARTICLE TUNNEL)
// =============================================================================
export function createHyperspaceStarfield(
  canvas: HTMLCanvasElement,
  options: {
    width: number;
    height: number;
    dpr: number;
    palette: AsciiEnginePalette;
  }
): AsciiEngineController {
  const ctx = canvas.getContext('2d', { alpha: false });
  let width = options.width;
  let height = options.height;
  let dpr = options.dpr;
  let palette = options.palette;
  let destroyed = false;

  interface Star {
    x: number;
    y: number;
    z: number;
    pz: number;
  }

  const STAR_COUNT = 320;
  let stars: Star[] = [];

  function initStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: (Math.random() - 0.5) * 2000,
        y: (Math.random() - 0.5) * 2000,
        z: Math.random() * 1000 + 1,
        pz: 1000,
      });
    }
  }

  function resize(w: number, h: number, nextDpr = 1) {
    width = w;
    height = h;
    dpr = Math.min(nextDpr, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    if (stars.length === 0) initStars();
  }

  resize(width, height, dpr);

  let mouseX = width / 2;
  let mouseY = height / 2;

  function stepAndRender(nowMs: number) {
    if (destroyed || !ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2 + (mouseX - width / 2) * 0.15;
    const cy = height / 2 + (mouseY - height / 2) * 0.15;
    const speed = 12;

    ctx.font = `600 13px ${MONO_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];
      star.pz = star.z;
      star.z -= speed;

      if (star.z <= 0) {
        star.z = 1000;
        star.pz = 1000;
        star.x = (Math.random() - 0.5) * 2000;
        star.y = (Math.random() - 0.5) * 2000;
      }

      const k = 380 / star.z;
      const px = star.x * k + cx;
      const py = star.y * k + cy;

      if (px < 0 || px >= width || py < 0 || py >= height) {
        star.z = 1000;
        continue;
      }

      // Calculate streak length and size
      const prevK = 380 / star.pz;
      const prevPx = star.x * prevK + cx;
      const prevPy = star.y * prevK + cy;

      const dist = Math.hypot(px - prevPx, py - prevPy);
      const intensity = Math.min(1.0, (1000 - star.z) / 800);

      let glyph = '·';
      if (dist > 18) glyph = '—';
      else if (dist > 10) glyph = '+';
      else if (dist > 5) glyph = '*';

      ctx.fillStyle = intensity > 0.75 ? '#ffffff' : palette.accent;
      ctx.globalAlpha = Math.max(0.15, intensity);
      ctx.fillText(glyph, px, py);
    }

    ctx.restore();
  }

  function destroy() {
    destroyed = true;
    stars = [];
  }

  return {
    resize,
    stepAndRender,
    destroy,
    setPalette: (p) => {
      palette = p;
    },
    onPointerMove: (x, y) => {
      mouseX = x;
      mouseY = y;
    },
    feed: (x, y) => {
      mouseX = x;
      mouseY = y;
      for (const s of stars) {
        s.z = Math.max(10, s.z - 280);
      }
    },
  };
}

// =============================================================================
// 4. CONWAY'S GAME OF LIFE (CELLULAR AUTOMATA GRID)
// =============================================================================
export function createGameOfLife(
  canvas: HTMLCanvasElement,
  options: {
    width: number;
    height: number;
    dpr: number;
    palette: AsciiEnginePalette;
  }
): AsciiEngineController {
  const ctx = canvas.getContext('2d', { alpha: false });
  let width = options.width;
  let height = options.height;
  let dpr = options.dpr;
  let palette = options.palette;
  let destroyed = false;

  const cellSize = 16;
  let cols = Math.floor(width / cellSize);
  let rows = Math.floor(height / cellSize);

  let grid: Uint8Array = new Uint8Array(0);
  let nextGrid: Uint8Array = new Uint8Array(0);
  let ageGrid: Uint8Array = new Uint8Array(0);

  function spawnGlider(x: number, y: number) {
    const coords = [
      [0, 1], [1, 2], [2, 0], [2, 1], [2, 2]
    ];
    for (const [dx, dy] of coords) {
      const gx = (x + dx) % cols;
      const gy = (y + dy) % rows;
      grid[gy * cols + gx] = 1;
      ageGrid[gy * cols + gx] = 1;
    }
  }

  function initGrid() {
    cols = Math.max(10, Math.floor(width / cellSize));
    rows = Math.max(10, Math.floor(height / cellSize));
    const size = cols * rows;
    grid = new Uint8Array(size);
    nextGrid = new Uint8Array(size);
    ageGrid = new Uint8Array(size);

    // Seed randomly with ~18% live cells
    for (let i = 0; i < size; i++) {
      if (Math.random() < 0.18) {
        grid[i] = 1;
        ageGrid[i] = 1;
      }
    }

    // Spawn gliders
    spawnGlider(10, 10);
    spawnGlider(Math.floor(cols / 2), Math.floor(rows / 2));
    spawnGlider(cols - 15, rows - 15);
  }

  function resize(w: number, h: number, nextDpr = 1) {
    width = w;
    height = h;
    dpr = Math.min(nextDpr, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    initGrid();
  }

  resize(width, height, dpr);

  let lastStepTime = 0;
  let autoReseedTimer = 0;

  function stepAndRender(nowMs: number) {
    if (destroyed || !ctx) return;

    // Step simulation at 12Hz for retro arcade cadence
    if (nowMs - lastStepTime >= 85) {
      lastStepTime = nowMs;

      autoReseedTimer++;
      if (autoReseedTimer > 60) {
        autoReseedTimer = 0;
        // Inject fresh gliders to keep background eternally lively
        const rx = Math.floor(Math.random() * (cols - 4));
        const ry = Math.floor(Math.random() * (rows - 4));
        spawnGlider(rx, ry);
      }

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const idx = y * cols + x;
          let neighbors = 0;

          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = (x + dx + cols) % cols;
              const ny = (y + dy + rows) % rows;
              neighbors += grid[ny * cols + nx];
            }
          }

          const alive = grid[idx] === 1;
          if (alive && (neighbors === 2 || neighbors === 3)) {
            nextGrid[idx] = 1;
            ageGrid[idx] = Math.min(255, ageGrid[idx] + 1);
          } else if (!alive && neighbors === 3) {
            nextGrid[idx] = 1;
            ageGrid[idx] = 1;
          } else {
            nextGrid[idx] = 0;
            ageGrid[idx] = 0;
          }
        }
      }

      // Swap buffers
      const temp = grid;
      grid = nextGrid;
      nextGrid = temp;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, width, height);

    ctx.font = `600 12px ${MONO_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        const px = x * cellSize + cellSize / 2;
        const py = y * cellSize + cellSize / 2;

        if (grid[idx] === 1) {
          const age = ageGrid[idx];
          let char = '*';
          let alpha = 0.9;
          if (age > 6) {
            char = '@';
            alpha = 1.0;
          } else if (age > 2) {
            char = '#';
            alpha = 0.85;
          } else {
            char = '+';
            alpha = 0.7;
          }

          ctx.fillStyle = palette.accent;
          ctx.globalAlpha = alpha;
          ctx.fillText(char, px, py);
        } else {
          // Faint background matrix dot
          ctx.fillStyle = palette.faint;
          ctx.globalAlpha = 0.08;
          ctx.fillText('·', px, py);
        }
      }
    }

    ctx.restore();
  }

  function destroy() {
    destroyed = true;
    grid = new Uint8Array(0);
    nextGrid = new Uint8Array(0);
  }

  return {
    resize,
    stepAndRender,
    destroy,
    setPalette: (p) => {
      palette = p;
    },
    onPointerMove: (x, y) => {
      const cx = Math.floor(x / cellSize);
      const cy = Math.floor(y / cellSize);
      if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
        grid[cy * cols + cx] = 1;
        ageGrid[cy * cols + cx] = 1;
      }
    },
    feed: (x, y) => {
      const cx = Math.floor(x / cellSize);
      const cy = Math.floor(y / cellSize);
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && Math.random() > 0.3) {
            grid[ny * cols + nx] = 1;
            ageGrid[ny * cols + nx] = 1;
          }
        }
      }
    },
  };
}
