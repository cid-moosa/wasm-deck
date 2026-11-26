/**
 * ASCII Koi: a koi pond drawn in character cells.
 *
 * Faithful TypeScript port of `createPond` from https://github.com/pursurer/ascii-koi
 * (pond.js lines 1-904, MIT License, omitting the AsciiMark clock/wordmark overlay).
 *
 * Each koi is a 10-node spine chain trailing its head plus a travelling body wave.
 * Cells are sub-sampled (5 points) against the spine, classified as body, fin, eye,
 * ridge, or barbel, shaded by upper-left lighting, cast shadows on the pond floor,
 * and leave diffusing tail wakes beneath a drifting value-noise caustic net.
 */

export type RGB = [number, number, number];

export interface AsciiKoiPalette {
  water: string;
  ink: string;
  accent: string;
  koiLight: string;
  koiDark: string;
  dark: boolean;
}

export const DEFAULT_POND_PALETTE: AsciiKoiPalette = {
  water: '#0e2a32',
  ink: '#ebe6dc',
  accent: '#e8784f',
  koiLight: '#ece6da',
  koiDark: '#3a3632',
  dark: true,
};

export interface AsciiKoiPondOptions {
  canvas?: HTMLCanvasElement;
  width?: number;
  height?: number;
  dpr?: number;
  most?: number;
  reduce?: boolean;
  palette?: () => AsciiKoiPalette;
}

export interface AsciiKoiPondController {
  readonly canvas: HTMLCanvasElement;
  resize: (width: number, height: number, dpr?: number) => void;
  stepAndRender: (nowMs: number) => boolean;
  destroy: () => void;
  reset: () => void;
  render: () => void;
  setPalette: (nextPaletteFn: () => AsciiKoiPalette) => void;
  feed: (clientX: number, clientY: number, count?: number) => void;
  readonly time: number;
  readonly fishCount: number;
  readonly dpr: number;
  readonly cols: number;
  readonly rows: number;
}

const MAX_POND_DPR = 1.5;
const MONO = '"Geist Mono", ui-monospace, Menlo, monospace';
const RAMP = ' .:-=+*#%@';
const SUB = [0.25, 0.25, 0.75, 0.25, 0.25, 0.75, 0.75, 0.75] as const;
const BODY_END = 0.76;
const VARIETY = [
  'kohaku', 'sanke', 'kohaku', 'sanke', 'kohaku', 'sanke', 'kohaku',
  'sanke', 'kohaku', 'tancho', 'sanke', 'kohaku', 'sanke', 'kohaku',
] as const;
const COLOURS = ['course', 'vermilion', 'gold', 'sakura'] as const;
const BEND = 0.42;

type Variety = 'kohaku' | 'sanke' | 'tancho';
type ColourSchemeKey = typeof COLOURS[number];
type EaseKey = 'o' | 'i' | 'l';
type Keyframe = readonly [number, number] | readonly [number, number, EaseKey];

const DIP = 0.24;
const PULL = 0.42;
const FLICK = 0.72;
const SHAKE = 0.78;
const END = 1.25;
const RING_LIFE = 2.6;
const DROP_LIFE = 1.2;

const BACK: readonly Keyframe[] = [[0, 70], [0.17, -4, 'o'], [DIP, 0], [PULL, 0, 'l'], [0.52, 13], [0.57, 12], [0.68, 27], [FLICK, 29], [END, 84, 'i']];
const HIGH: readonly Keyframe[] = [[0, 0.5], [0.17, 0.15, 'o'], [DIP, 0, 'i'], [FLICK - 0.02, 0, 'l'], [0.86, 0.6, 'o'], [END, 1.05]];
const SWAY: readonly Keyframe[] = [[0, 0.06], [0.17, -0.02, 'o'], [0.3, 0], [0.52, 0.03], [0.68, -0.03], [FLICK, 0], [END, 0]];
const CURL: readonly Keyframe[] = [[0, 0], [0.27, 0.05], [0.38, 1, 'o'], [0.52, 1, 'l'], [0.56, 0.75], [0.6, 1], [FLICK, 1, 'l'], [0.95, 0.5], [END, 0.3]];
const SINK: readonly Keyframe[] = [[0.2, 0], [0.3, 1, 'o'], [0.68, 1, 'l'], [FLICK + 0.04, 0, 'o']];
const SQUASH: readonly Keyframe[] = [[0, -0.12], [0.17, -0.18, 'l'], [0.22, 0.2, 'o'], [0.3, 0], [0.44, 0.12], [0.52, -0.1], [0.58, 0.1], [0.68, -0.12], [FLICK, -0.2], [0.86, 0.05], [END, 0]];
const SEEN: readonly Keyframe[] = [[0, 0], [0.06, 1, 'o'], [1.1, 1, 'l'], [END, 0]];
const LEG = 8.4;
const HAND = 10;
const TOES = [-1.12, -0.38, 0.38, 1.12] as const;
const FLOAT = 16;
const SINKING = 2.5;

const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
const sstep = (a: number, b: number, x: number): number => {
  const k = clamp((x - a) / (b - a), 0, 1);
  return k * k * (3 - 2 * k);
};
const lerp = (a: number, b: number, e: number): number => a + (b - a) * e;
const h2 = (a: number, b: number): number => {
  let x = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1);
  x = Math.imul(x ^ (x >>> 15), 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};
const noise = (x: number, y: number, seed: number): number => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const u = sstep(0, 1, x - xi);
  const v = sstep(0, 1, y - yi);
  const a = h2(xi + seed * 131, yi);
  const b = h2(xi + 1 + seed * 131, yi);
  const c = h2(xi + seed * 131, yi + 1);
  const d = h2(xi + 1 + seed * 131, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
};
const rgb = (hex: string): RGB => {
  const m = String(hex).trim().match(/^#?([0-9a-f]{6})$/i);
  const n = m ? parseInt(m[1], 16) : 0;
  return [n >> 16, (n >> 8) & 255, n & 255];
};
const mixC = (a: RGB, b: RGB, k: number): RGB => [
  a[0] + (b[0] - a[0]) * k,
  a[1] + (b[1] - a[1]) * k,
  a[2] + (b[2] - a[2]) * k,
];
const mul = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
const pack = (c: RGB): number =>
  (clamp(c[0] | 0, 0, 255) << 16) | (clamp(c[1] | 0, 0, 255) << 8) | clamp(c[2] | 0, 0, 255);
const css = (n: number): string => `rgb(${n >> 16},${(n >> 8) & 255},${n & 255})`;

function seeded(str: string): () => number {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const halfW = (s: number): number =>
  s < 0.1
    ? 0.118 * Math.pow(Math.sin((s / 0.1) * (Math.PI / 2)), 0.6)
    : s < 0.3
      ? 0.118 + 0.02 * sstep(0.1, 0.3, s)
      : 0.03 + 0.108 * (1 - sstep(0.3, BODY_END, s));

const tailW = (s: number): number => 0.028 + 0.165 * Math.pow(sstep(0.72, 1, s), 0.85);

interface Patch {
  s: number;
  v: number;
  rs: number;
  rv: number;
}

interface Markings {
  red: Patch[];
  black: Patch[];
}

interface KoiFish {
  variety: Variety;
  colour: ColourSchemeKey;
  seen: number;
  seed: number;
  marks: Markings;
  a: number;
  nodes: Float32Array;
  seg: number;
  L0: number;
  cruise: number;
  nx: number;
  ny: number;
  depth: number;
  phase: number;
  beat: number;
  turn: number;
  flee: number;
  fleeA: number;
  seekX: number;
  seekY: number;
  seekFrom: number;
  seekUntil: number;
  appetite: number;
  fullUntil: number;
  rise: number;
  kick: number;
  meal: FoodPellet | null;
}

interface FoodPellet {
  x0: number;
  y0: number;
  x: number;
  y: number;
  born: number;
  land: number;
  seed: number;
  landed: boolean;
  eaten: number;
  claim: number;
}

interface PawEvent {
  x: number;
  y: number;
  k: number;
  ex: number;
  ey: number;
  leg: number;
  side: number;
  born: number;
  hit: boolean;
  flung: boolean;
  drips: number;
}

interface RingEvent {
  x: number;
  y: number;
  born: number;
  k: number;
  small: boolean;
  tiny?: boolean;
}

interface DropEvent {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  born: number;
  dur: number;
  k: number;
}

interface BubbleEvent {
  x: number;
  y: number;
  born: number;
}

interface KoiScheme {
  red: RGB;
  white: RGB;
  black: RGB;
  fin: RGB;
}

interface PondPaletteState {
  dark: boolean;
  water: RGB;
  ink: RGB;
  white: RGB;
  red: RGB;
  black: RGB;
  eye: RGB;
  fin: RGB;
  dot: RGB;
  food: RGB;
  koi: Record<ColourSchemeKey, KoiScheme>;
}

const EASE: Record<EaseKey, (u: number) => number> = {
  o: u => 1 - (1 - u) ** 2.2,
  i: u => u ** 2.2,
  l: u => u,
};

function track(a: number, keys: readonly Keyframe[]): number {
  if (a <= keys[0][0]) return keys[0][1];
  for (let j = 1; j < keys.length; j++) {
    const t1 = keys[j][0];
    const v1 = keys[j][1];
    const e = keys[j][2];
    if (a > t1) continue;
    const t0 = keys[j - 1][0];
    const v0 = keys[j - 1][1];
    const u = (a - t0) / (t1 - t0);
    const fn = e ? EASE[e] : (x: number) => x * x * (3 - 2 * x);
    return v0 + (v1 - v0) * fn(u);
  }
  return keys[keys.length - 1][1];
}

function markings(variety: Variety, seed: number): Markings {
  const r = (j: number) => h2(seed, j);
  if (variety === 'tancho') {
    return { red: [{ s: 0.1, v: 0, rs: 0.052, rv: 0.06 }], black: [] };
  }
  const red: Patch[] = [];
  if (r(1) < 0.85) {
    red.push({ s: 0.09, v: (r(2) - 0.5) * 0.03, rs: 0.05 + r(3) * 0.03, rv: 0.1 });
  }
  const n = r(4) < 0.25 ? 3 : 2;
  const GAP = 0.05;
  const w: number[] = [];
  for (let j = 0; j < n; j++) w.push(0.5 + r(30 + j));
  const unit = (0.45 - GAP * (n - 1)) / w.reduce((a, b) => a + b, 0);
  let at = 0.23;
  for (let j = 0; j < n; j++) {
    const rs = (unit * w[j]) / 2;
    red.push({
      s: at + rs,
      v: (j % 2 ? 1 : -1) * (0.022 + r(20 + j) * 0.018),
      rs: rs * 0.95,
      rv: 0.065 + rs * 0.3 + r(40 + j) * 0.02,
    });
    at += rs * 2 + GAP;
  }
  const black: Patch[] = [];
  if (variety === 'sanke') {
    for (let j = 0; j < 4 + Math.floor(r(50) * 3); j++) {
      black.push({ s: 0.25 + r(60 + j) * 0.42, v: (r(70 + j) - 0.5) * 0.15, rs: 0.021, rv: 0.025 });
    }
  }
  return { red, black };
}

const inPatch = (m: Patch, s: number, vn: number, wob: number): boolean =>
  ((s - m.s) / m.rs) ** 2 + ((vn - m.v) / m.rv) ** 2 < 1 + wob;

function skin(f: KoiFish, s: number, vn: number, across: number): number {
  if (across > 0.9 || s > 0.74) return 0;
  const wob = (noise(s * 13 + f.seed, vn * 28, f.seed) - 0.5) * 0.65;
  for (const m of f.marks.black) if (inPatch(m, s, vn, wob)) return 2;
  for (const m of f.marks.red) if (inPatch(m, s, vn, wob)) return 1;
  return 0;
}

const room = (w: number, h: number, most: number): number =>
  clamp(Math.max(w / 210, (w * h) / 85000), 3, most);

const varietyOf = (i: number): Variety =>
  i < VARIETY.length ? VARIETY[i] : i % 2 ? 'sanke' : 'kohaku';

const lineGlyph = (dx: number, dy: number): string => {
  const d = Math.hypot(dx, dy) || 1;
  return Math.abs(dy) < 0.38 * d ? '-' : Math.abs(dx) < 0.38 * d ? '|' : dx * dy > 0 ? '\\' : '/';
};

const capDpr = (raw?: number): number => {
  const fallback = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const val = raw !== undefined && Number.isFinite(raw) ? raw : fallback;
  return Math.min(Math.max(1, val), MAX_POND_DPR);
};

export function createAsciiKoiPond(opts: AsciiKoiPondOptions = {}): AsciiKoiPondController {
  const initW = Math.max(1, Math.round(opts.width ?? (typeof window !== 'undefined' ? window.innerWidth : 1280)));
  const initH = Math.max(1, Math.round(opts.height ?? (typeof window !== 'undefined' ? window.innerHeight : 720)));

  const canvas: HTMLCanvasElement =
    opts.canvas ??
    (typeof document !== 'undefined'
      ? document.createElement('canvas')
      : ({ width: initW, height: initH, getContext: () => null } as unknown as HTMLCanvasElement));

  const ctx = canvas.getContext ? canvas.getContext('2d') : null;
  const reduce = !!opts.reduce;
  const MOST = Math.max(3, Math.round(opts.most || VARIETY.length));
  let paletteFn = opts.palette ?? (() => DEFAULT_POND_PALETTE);
  const N = 10;

  let vw = 0;
  let vh = 0;
  let dpr = capDpr(opts.dpr);
  let cw = 10;
  let ch = 13;
  let cols = 0;
  let rows = 0;
  let K = 1.85;
  let t = 0;
  const paused = false;
  let destroyed = false;

  let P: PondPaletteState | null = null;
  let tileRGB = new Uint32Array(0);
  let tileA = new Float32Array(0);
  let glyphRGB = new Uint32Array(0);
  let glyphA = new Float32Array(0);
  let glyphCode = new Uint16Array(0);
  let shade = new Float32Array(0);
  let wake = new Float32Array(0);
  let wakeTmp = new Float32Array(0);
  let tintRGB = new Uint32Array(0);
  let tintA = new Float32Array(0);

  const touched: number[] = [];
  let fish: KoiFish[] = [];
  const paws: PawEvent[] = [];
  const rings: RingEvent[] = [];
  const drops: DropEvent[] = [];
  const food: FoodPellet[] = [];
  const bubbles: BubbleEvent[] = [];

  const hit = { kind: 0, across: 0, rs: 1, ra: 0 };

  function fin(s: number, a: number, rootS: number, angle: number, reach: number, width: number): boolean {
    const ra = halfW(rootS) * 0.85;
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const ds = s - rootS;
    const da = a - ra;
    const along = ds * ca + da * sa - reach;
    const perp = -ds * sa + da * ca;
    if ((along / reach) ** 2 + (perp / width) ** 2 > 1) return false;
    hit.kind = 2;
    hit.rs = ds;
    hit.ra = da;
    return true;
  }

  function classify(s: number, a: number, past: number, flare: number, ahead: number, lateral: number): boolean {
    hit.kind = 0;
    hit.across = 1;
    hit.rs = 1;
    hit.ra = 0;
    if (ahead > 0) {
      if (ahead < 0.05 && Math.abs(lateral - (0.042 + ahead * 0.75)) < 0.015) {
        hit.kind = 5;
        return true;
      }
      return false;
    }
    const w = halfW(s);
    if (s <= BODY_END && a <= w) {
      hit.across = a / w;
      hit.kind =
        s > 0.056 && s < 0.084 && hit.across > 0.5 && hit.across < 0.78
          ? 3
          : s > 0.3 && s < 0.6 && hit.across < 0.13
            ? 4
            : 1;
      return true;
    }
    if (s > 0.7 && past <= 0) {
      const tw = tailW(s) * flare;
      if (a <= tw && s <= 0.88 + 0.12 * (a / tw)) {
        hit.kind = 2;
        hit.rs = 1;
        hit.ra = (a / tw) * 0.8;
        return true;
      }
    }
    return (
      fin(s, a, 0.2, 0.9 + 0.45 * (flare - 1), 0.07 * flare, 0.038) ||
      fin(s, a, 0.47, 0.75, 0.038, 0.019)
    );
  }

  const caus = (x: number, y: number): number =>
    1 -
    Math.min(
      1,
      Math.abs(
        noise(x / 46 + t * 0.21, y / 46 - t * 0.13, 7) -
          noise(x / 39 - t * 0.17, y / 52 + t * 0.19, 11)
      ) * 5.5
    );

  function makeFish(): void {
    fish = Array.from({ length: MOST }, (_, i) => varietyOf(i)).map((variety, i) => {
      const r = seeded('koi' + i);
      const right = i % 2 === 0;
      const a = right ? (r() - 0.5) * 0.3 : Math.PI + (r() - 0.5) * 0.3;
      const L0 = 128 + r() * 52;
      const seg = L0 / (N - 1);
      const nodes = new Float32Array(N * 2);
      for (let j = 0; j < N; j++) {
        nodes[j * 2] = -Math.cos(a) * seg * j;
        nodes[j * 2 + 1] = -Math.sin(a) * seg * j;
      }
      const seed = i * 97 + 13;
      return {
        variety,
        colour: COLOURS[i % 4],
        seen: 1,
        seed,
        marks: markings(variety, seed),
        a,
        nodes,
        seg,
        L0,
        cruise: 24 + r() * 12,
        nx: (i * 0.38 + 0.15) % 1,
        ny: 0.22 + r() * 0.56,
        depth: 0.35 + r() * 0.65,
        phase: r() * 6.28,
        beat: 0.5,
        turn: 0,
        flee: 0,
        fleeA: 0,
        seekX: 0,
        seekY: 0,
        seekFrom: 0,
        seekUntil: 0,
        appetite: h2(seed, 5),
        fullUntil: 0,
        rise: 0,
        kick: 0,
        meal: null,
      };
    });
  }

  let dirty = true;

  function size(w: number, h: number, nextDpr?: number): void {
    const nextVw = Math.max(1, Math.round(w));
    const nextVh = Math.max(1, Math.round(h));
    const clampedDpr = capDpr(nextDpr !== undefined ? nextDpr : opts.dpr);
    const targetCW = Math.round(nextVw * clampedDpr);
    const targetCH = Math.round(nextVh * clampedDpr);

    if (
      nextVw === vw &&
      nextVh === vh &&
      clampedDpr === dpr &&
      canvas.width === targetCW &&
      canvas.height === targetCH
    ) {
      return;
    }

    dpr = clampedDpr;
    vw = nextVw;
    vh = nextVh;
    cw = clamp(Math.round(vw / 150), 7, 10);
    ch = cw + 3;
    K = 1.85 * clamp(vw / 1000, 0.62, 1);
    canvas.width = targetCW;
    canvas.height = targetCH;
    cols = Math.ceil(vw / cw);
    rows = Math.ceil(vh / ch);
    const n = cols * rows;
    tileRGB = new Uint32Array(n);
    tileA = new Float32Array(n);
    glyphRGB = new Uint32Array(n);
    glyphA = new Float32Array(n);
    glyphCode = new Uint16Array(n);
    shade = new Float32Array(n);
    wake = new Float32Array(n);
    wakeTmp = new Float32Array(n);
    tintRGB = new Uint32Array(n);
    tintA = new Float32Array(n);
    touched.length = 0;
    dirty = true;
  }

  const count = (): number => Math.round(room(vw, vh, MOST));
  const headX = (f: KoiFish): number => f.nx * vw;
  const headY = (f: KoiFish): number => f.ny * vh;

  function stamp(x: number, y: number, rad: number, amt: number): void {
    const c = Math.floor(x / cw);
    const r = Math.floor(y / ch);
    for (let dr = -rad; dr <= rad; dr++) {
      for (let dc = -rad; dc <= rad; dc++) {
        const cc = c + dc;
        const rr = r + dr;
        const d = Math.hypot(dc, (dr * ch) / cw);
        if (cc < 0 || rr < 0 || cc >= cols || rr >= rows || d > rad) continue;
        wake[rr * cols + cc] = Math.min(1, wake[rr * cols + cc] + amt * (1 - d / (rad + 1)));
      }
    }
  }

  function mealFor(f: KoiFish, list: FoodPellet[], hx: number, hy: number): FoodPellet | null {
    if (t < f.fullUntil && f.appetite < 0.4) return null;
    let best: FoodPellet | null = null;
    let bd = Math.max(vw, vh) * 2.5;
    for (const p of list) {
      const d = Math.hypot(p.x - hx, p.y - hy) + p.claim * 40 * K;
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    if (best) best.claim++;
    return best;
  }

  function eat(p: FoodPellet, f: KoiFish): void {
    p.eaten = t;
    f.fullUntil = t + 0.3 + 0.5 * h2(f.seed, Math.round(t * 10));
    f.kick = 1;
    rings.push({ x: p.x, y: p.y, born: t, k: K * 0.7, small: true });
    stamp(p.x, p.y, 1, 0.6);
    for (let j = 0; j < 3; j++) {
      bubbles.push({
        x: p.x + (h2(p.seed, j) - 0.5) * 14 * K,
        y: p.y + (h2(p.seed, j + 9) - 0.5) * 10 * K,
        born: t + j * 0.09,
      });
    }
  }

  function step(dt: number): void {
    const zw = Math.max(1, vw);
    const zh = Math.max(1, vh);
    const k = K;
    const maxTilt = 1.0;
    const yLo = 0.14;
    const yHi = 1 - yLo;
    const menu = food.filter(p => p.eaten < 0 && t > p.land - 0.25 && t - p.land < FLOAT);
    for (const p of menu) p.claim = 0;
    const n = count();
    fish.forEach((f, i) => {
      const want = i < n ? 1 : 0;
      f.seen = clamp(
        f.seen + Math.sign(want - f.seen) * dt * 2,
        Math.min(f.seen, want),
        Math.max(f.seen, want)
      );
      const right = Math.cos(f.a) > 0;
      const base = right ? 0 : Math.PI;
      f.beat = 0.5 + 0.5 * Math.sin(t * 0.45 + f.seed);
      let turn = Math.sin(t * 0.29 + f.seed) * 0.32 + Math.sin(t * 0.11 + f.seed * 1.7) * 0.22;
      if (f.ny < yLo) turn += right ? 0.7 : -0.7;
      if (f.ny > yHi) turn += right ? -0.7 : 0.7;
      const tilt = Math.atan2(Math.sin(f.a - base), Math.cos(f.a - base));
      if (Math.abs(tilt) > maxTilt) turn -= Math.sign(tilt) * 1.4;
      f.turn = lerp(f.turn, turn, Math.min(1, dt * 2));
      const hx = headX(f);
      const hy = headY(f);

      let hurry = 1;
      f.meal = null;
      if (f.flee > 0.02) {
        const d = Math.atan2(Math.sin(f.fleeA - f.a), Math.cos(f.fleeA - f.a));
        f.turn = lerp(f.turn, clamp(d * 5, -4, 4), Math.min(1, dt * 8 * f.flee));
        hurry = 1 + 2.6 * f.flee;
        f.flee *= Math.exp(-1.3 * dt);
      } else if (menu.length && (f.meal = mealFor(f, menu, hx, hy))) {
        const p = f.meal;
        const dist = Math.hypot(p.x - hx, p.y - hy);
        const d = Math.atan2(
          Math.sin(Math.atan2(p.y - hy, p.x - hx) - f.a),
          Math.cos(Math.atan2(p.y - hy, p.x - hx) - f.a)
        );
        f.turn = lerp(f.turn, clamp(d * 3.6, -3.4, 3.4), Math.min(1, dt * 7));
        hurry = 1.2 + 1.3 * clamp(dist / (150 * k), 0, 1) * (Math.abs(d) < 1.1 ? 1 : 0.45);
        f.rise = Math.min(1, f.rise + dt * 1.6);
      } else if (t > f.seekFrom && t < f.seekUntil) {
        if (Math.hypot(f.seekX - hx, f.seekY - hy) < 26 * k) {
          f.seekUntil = 0;
        } else {
          const d = Math.atan2(
            Math.sin(Math.atan2(f.seekY - hy, f.seekX - hx) - f.a),
            Math.cos(Math.atan2(f.seekY - hy, f.seekX - hx) - f.a)
          );
          f.turn = lerp(f.turn, clamp(d * 2.6, -2.4, 2.4), Math.min(1, dt * 3));
          hurry = 1.4;
        }
      }
      if (!f.meal) f.rise = Math.max(0, f.rise - dt * 0.3);
      hurry *= 1 + 0.9 * f.kick;
      f.kick *= Math.exp(-3.5 * dt);
      f.a += f.turn * dt;
      const speed = f.cruise * (0.65 + 0.7 * f.beat) * hurry;
      const dx = Math.cos(f.a) * speed * dt;
      const dy = Math.sin(f.a) * speed * dt;
      f.nx += (dx * k) / zw;
      f.ny += (dy * k) / zh;

      const nd = f.nodes;
      for (let j = 1; j < N; j++) {
        nd[j * 2] -= dx;
        nd[j * 2 + 1] -= dy;
      }
      let bx = -Math.cos(f.a);
      let by = -Math.sin(f.a);
      for (let j = 1; j < N; j++) {
        const px = nd[(j - 1) * 2];
        const py = nd[(j - 1) * 2 + 1];
        let vx = nd[j * 2] - px;
        let vy = nd[j * 2 + 1] - py;
        const d = Math.hypot(vx, vy) || 1;
        vx /= d;
        vy /= d;
        const bend = Math.atan2(bx * vy - by * vx, bx * vx + by * vy);
        if (Math.abs(bend) > BEND) {
          const r = Math.sign(bend) * BEND;
          const c = Math.cos(r);
          const s = Math.sin(r);
          vx = bx * c - by * s;
          vy = bx * s + by * c;
        }
        nd[j * 2] = px + vx * f.seg;
        nd[j * 2 + 1] = py + vy * f.seg;
        bx = vx;
        by = vy;
      }
      f.phase += dt * (2.6 + 5 * f.beat) * (1 + 0.6 * f.kick);
      const m = (f.L0 * k * 1.45) / zw;
      if (f.nx > 1 + m) f.nx = -m;
      if (f.nx < -m) f.nx = 1 + m;

      if (f.meal && Math.hypot(f.meal.x - headX(f), f.meal.y - headY(f)) < 14 * k) {
        eat(f.meal, f);
      }
      if (f.seen > 0) {
        const tc = Math.floor((headX(f) + nd[(N - 1) * 2] * k) / cw);
        const tr = Math.floor((headY(f) + nd[(N - 1) * 2 + 1] * k) / ch);
        if (tc >= 0 && tr >= 0 && tc < cols && tr < rows) {
          wake[tr * cols + tc] = Math.min(1, wake[tr * cols + tc] + 0.18 * f.beat * dt * 30);
        }
      }
    });

    const fade = Math.exp(-dt * 1.4);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const w = wake[i];
        const nb =
          (c > 0 ? wake[i - 1] : w) +
          (c < cols - 1 ? wake[i + 1] : w) +
          (r > 0 ? wake[i - cols] : w) +
          (r < rows - 1 ? wake[i + cols] : w);
        wakeTmp[i] = (w * 0.84 + nb * 0.04) * fade;
      }
    }
    const tmp = wake;
    wake = wakeTmp;
    wakeTmp = tmp;
  }

  const spine = new Float32Array(N * 2);
  const arc = new Float32Array(N);
  let arcTotal = 1;
  let S = 0;
  let V = 0;
  let D = 0;
  let TX = 1;
  let TY = 0;
  let SEG = 0;

  function sample(
    px: number,
    py: number,
    L: number,
    flareL: number,
    flareR: number,
    from = 0,
    to = N - 2
  ): boolean {
    let best = Infinity;
    let bs = 0;
    let sign = 1;
    let past = 0;
    let ahead = 0;
    let lateral = 0;
    for (let n = from; n <= to; n++) {
      const ax = spine[n * 2];
      const ay = spine[n * 2 + 1];
      const sx = spine[n * 2 + 2] - ax;
      const sy = spine[n * 2 + 3] - ay;
      const len2 = sx * sx + sy * sy || 1;
      const raw = ((px - ax) * sx + (py - ay) * sy) / len2;
      const u = clamp(raw, 0, 1);
      const d2 = (px - ax - sx * u) ** 2 + (py - ay - sy * u) ** 2;
      if (d2 < best) {
        const len = Math.sqrt(len2);
        const cross = sx * (py - ay) - sy * (px - ax);
        best = d2;
        bs = (arc[n] + u * len) / arcTotal;
        sign = cross >= 0 ? 1 : -1;
        past = n === N - 2 ? Math.max(0, raw - 1) * len : 0;
        ahead = n === 0 ? Math.max(0, -raw) * len : 0;
        lateral = Math.abs(cross) / len;
        TX = sx / len;
        TY = sy / len;
        SEG = n;
      }
    }
    D = Math.sqrt(best);
    S = bs;
    V = D * sign;
    return classify(bs, D / L, past / L, sign > 0 ? flareL : flareR, ahead / L, lateral / L);
  }

  function rasterize(f: KoiFish): void {
    if (!P) return;
    const k = K;
    const hx = headX(f);
    const hy = headY(f);
    const L = f.L0 * k;
    const swim = 0.25 + 0.9 * f.beat;
    for (let n = 0; n < N; n++) {
      const s = n / (N - 1);
      const a = Math.max(0, n - 1);
      const b = Math.min(N - 1, n + 1);
      let tx = f.nodes[a * 2] - f.nodes[b * 2];
      let ty = f.nodes[a * 2 + 1] - f.nodes[b * 2 + 1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      const off = L * 0.045 * (0.05 + 0.95 * Math.pow(s, 2.2)) * swim * Math.sin(f.phase - s * 4.6);
      spine[n * 2] = hx + f.nodes[n * 2] * k - ty * off;
      spine[n * 2 + 1] = hy + f.nodes[n * 2 + 1] * k + tx * off;
    }
    arc[0] = 0;
    for (let n = 1; n < N; n++) {
      arc[n] = arc[n - 1] + Math.hypot(spine[n * 2] - spine[n * 2 - 2], spine[n * 2 + 1] - spine[n * 2 - 1]);
    }
    arcTotal = arc[N - 1] || 1;
    const bank = clamp(f.turn * 0.5, -0.3, 0.3);
    const scull = 0.15 * (1 - f.beat) * Math.sin(f.phase * 0.5);
    const flareL = 1 + scull - bank;
    const flareR = 1 - scull + bank;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let n = 0; n < N; n++) {
      x0 = Math.min(x0, spine[n * 2]);
      x1 = Math.max(x1, spine[n * 2]);
      y0 = Math.min(y0, spine[n * 2 + 1]);
      y1 = Math.max(y1, spine[n * 2 + 1]);
    }
    const reach = L * 0.27;
    const c0 = Math.max(0, Math.floor(Math.max(x0 - reach, 0) / cw));
    const c1 = Math.min(cols - 1, Math.floor(Math.min(x1 + reach, vw) / cw));
    const r0 = Math.max(0, Math.floor(Math.max(y0 - reach, 0) / ch));
    const r1 = Math.min(rows - 1, Math.floor(Math.min(y1 + reach, vh) / ch));
    if (c0 > c1 || r0 > r1) return;

    const diag = Math.hypot(cw, ch);
    const depth = lerp(f.depth, 1, f.rise * 0.85);
    const Kc = P.koi[f.colour];
    const alphaBase = (P.dark ? 0.82 : 0.9) * (0.55 + 0.45 * depth) * f.seen;
    const sdc = 1 + Math.round(depth * 2);
    const sdr = 1 + Math.round(depth);
    const lx = -0.6;
    const ly = -0.8;

    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const x = c * cw;
        const y = r * ch;
        const got = sample(x + cw / 2, y + ch / 2, L, flareL, flareR);
        if (!got && D > L * (S > 0.4 && S < 0.62 ? 0.15 : 0.26) + diag) {
          c += Math.max(0, Math.floor((D - L * 0.26 - diag) / cw));
          continue;
        }
        let kind = hit.kind;
        let across = hit.across;
        let rs = hit.rs;
        let ra = hit.ra;
        let s = S;
        let v = V;
        let tx = TX;
        let ty = TY;
        const from = Math.max(0, SEG - 2);
        const to = Math.min(N - 2, SEG + 2);
        let hits = got ? 1 : 0;
        const deep = got && kind === 1 && s > 0.05 && s < 0.7 && halfW(s) * L - D > diag * 0.4;
        if (deep) hits = 5;
        for (let q = 0; !deep && q < SUB.length; q += 2) {
          if (!sample(x + SUB[q] * cw, y + SUB[q + 1] * ch, L, flareL, flareR, from, to)) continue;
          if (hits === 0) {
            kind = hit.kind;
            across = hit.across;
            rs = hit.rs;
            ra = hit.ra;
            s = S;
            v = V;
            tx = TX;
            ty = TY;
          }
          hits++;
        }
        if (!hits) continue;

        const cover = hits / 5;
        const i = r * cols + c;
        const side = v >= 0 ? 1 : -1;
        let tile: RGB | null = null;
        let tA = 0;
        let g = ' ';
        let gC: RGB | null = null;
        let gA = 0;

        if (kind === 5) {
          g = lineGlyph(tx, ty);
          gC = Kc.fin;
          gA = 0.7 * alphaBase;
        } else if (kind === 2) {
          const nx = -ty * side;
          const ny = tx * side;
          g = lineGlyph(rs * tx + ra * nx, rs * ty + ra * ny);
          tile = Kc.fin;
          tA = (P.dark ? 0.26 : 0.42) * cover * alphaBase;
          gC = mul(Kc.fin, P.dark ? 1.1 : 0.8);
          gA = (P.dark ? 0.55 : 0.6) * alphaBase;
        } else {
          const nz = Math.sqrt(Math.max(0, 1 - across * across));
          const nxs = -ty * side * across;
          const nys = tx * side * across;
          const gl = sstep(0.62, 0.96, caus(x + cw / 2, y + ch / 2)) * nz;
          const lit = clamp(0.76 + 0.26 * nz + 0.2 * (nxs * lx + nys * ly) + 0.3 * gl, 0.62, 1.34);
          const sk = kind === 3 ? null : skin(f, s, v / L, across);
          const base = kind === 3 ? P.eye : sk === 1 ? Kc.red : sk === 2 ? Kc.black : Kc.white;
          tile = mul(base, lit);
          tA = (cover >= 0.6 ? 1 : cover * 1.4) * alphaBase;
          if (kind !== 3) {
            tintRGB[i] = pack(tile);
            tintA[i] =
              tA *
              (sk === 1 ? 1 : sk === 2 ? (P.dark ? 0.4 : 0.6) : P.dark ? 0.7 : 0.25) *
              (1 + 0.6 * gl);
          }
          if (kind === 3) {
            g = 'o';
            gC = Kc.white;
            gA = 0.95 * alphaBase;
          } else {
            const idx = clamp(
              1 + Math.round(((1.08 - lit) / 0.46) * 6) + (kind === 4 ? 2 : 0),
              1,
              RAMP.length - 1
            );
            g = RAMP[idx];
            gC = mul(base, P.dark ? (sk === 0 ? 0.55 : 1.35) : 0.5);
            gA = 0.62 * alphaBase;
            if (gl > 0.5 && kind !== 4) {
              g = '*';
              gC = mixC(base, [255, 255, 255], 0.75);
              gA = (0.45 + 0.4 * gl) * alphaBase;
            }
          }
          if (cover >= 0.6) {
            const si = (r + sdr) * cols + (c + sdc);
            if (r + sdr < rows && c + sdc < cols) {
              shade[si] = Math.max(shade[si], (P.dark ? 0.55 : 0.22) * (0.5 + 0.5 * depth) * f.seen);
            }
          }
        }
        if (!tileA[i] && !glyphA[i]) touched.push(i);
        if (tile) {
          tileRGB[i] = pack(tile);
          tileA[i] = tA;
        }
        if (gC) {
          glyphRGB[i] = pack(gC);
          glyphA[i] = gA;
          glyphCode[i] = g.charCodeAt(0);
        }
      }
    }
  }

  function pawState(p: PawEvent) {
    const a = t - p.born;
    const u = (a - SHAKE) / 0.3;
    const shake = u > 0 && u < 1 ? 0.14 * Math.sin(u * 4 * Math.PI) * (1 - u) : 0;
    return {
      back: track(a, BACK),
      h: track(a, HIGH),
      swing: (track(a, SWAY) + shake) * p.side,
      curl: track(a, CURL),
      sink: track(a, SINK),
      squash: track(a, SQUASH),
      seen: track(a, SEEN),
    };
  }

  const tipOf = (s: { curl: number }): number => 5 - 4 * s.curl + HAND * 1.08;

  function pawPose(p: PawEvent) {
    const s = pawState(p);
    const Kp = p.k * 1.9;
    const arm = 120;
    let ux = p.x - p.ex;
    let uy = p.y - p.ey;
    const ul = Math.hypot(ux, uy) || 1;
    ux /= ul;
    uy /= ul;
    const c = Math.cos(s.swing);
    const n = Math.sin(s.swing);
    const dx = ux * c - uy * n;
    const dy = ux * n + uy * c;
    const sx = p.x - ux * arm * Kp;
    const sy = p.y - uy * arm * Kp;
    const r = (arm - s.back) * Kp;
    return {
      ...s,
      ux: dx,
      uy: dy,
      vx: -dy,
      vy: dx,
      cx: sx + dx * r,
      cy: sy + dy * r,
      k: Kp * (1 + 0.5 * s.h),
    };
  }

  function splash(p: PawEvent): void {
    p.hit = true;
    const s = pawPose(p);
    const tip = tipOf(s) - 3;
    const x = s.cx + s.ux * tip * s.k;
    const y = s.cy + s.uy * tip * s.k;
    rings.push({ x, y, born: t, k: p.k, small: false });
    stamp(x, y, 4, 0.9);
    const reach = 280 * p.k;
    const near = fish
      .slice(0, count())
      .map(f => ({ f, d: Math.hypot(headX(f) - x, headY(f) - y), hx: headX(f), hy: headY(f) }))
      .sort((a, b) => a.d - b.d);
    near.forEach(({ f, d, hx, hy }, i) => {
      if (d < reach) {
        f.flee = Math.max(f.flee, 1 - (d / reach) * 0.7);
        f.fleeA = Math.atan2(hy - y, hx - x);
      }
      if (i < 2) {
        const o = (i ? 1 : -1) * 34 * p.k;
        f.seekX = x - s.vx * o;
        f.seekY = y - s.vy * o;
        f.seekFrom = t + 1.3 + i * 0.5;
        f.seekUntil = f.seekFrom + 3.5;
      }
    });
  }

  function stir(p: PawEvent, dt: number): void {
    const s = pawPose(p);
    const tip = tipOf(s) + 2;
    stamp(s.cx + s.ux * tip * s.k, s.cy + s.uy * tip * s.k, 2, 4 * dt);
  }

  function fling(p: PawEvent): void {
    p.flung = true;
    const s = pawPose(p);
    const seed = Math.round(p.born * 1000);
    for (let j = 0; j < 5; j++) {
      const side = (j - 2) / 2;
      const d = (30 + 36 * h2(j, seed)) * p.k;
      const x0 = s.cx + (s.ux * tipOf(s) + s.vx * side * 8) * s.k;
      const y0 = s.cy + (s.uy * tipOf(s) + s.vy * side * 8) * s.k;
      drops.push({
        x0,
        y0,
        x1: x0 - s.ux * d + s.vx * side * 18 * p.k,
        y1: y0 - s.uy * d + s.vy * side * 18 * p.k,
        born: t + j * 0.035,
        dur: 0.34 + 0.14 * h2(j + 7, seed),
        k: p.k,
      });
    }
  }

  function drip(p: PawEvent, dir: number): void {
    const s = pawPose(p);
    const a0 = tipOf(s) - 4;
    const s0 = dir * 8;
    const seed = Math.round(p.born * 1000) + p.drips;
    const x = s.cx + (s.ux * a0 + s.vx * s0) * s.k;
    const y = s.cy + (s.uy * a0 + s.vy * s0) * s.k;
    const d = (26 + 20 * h2(seed, 3)) * p.k;
    drops.push({
      x0: x,
      y0: y,
      x1: x + s.vx * dir * d - s.ux * 8 * p.k,
      y1: y + s.vy * dir * d - s.uy * 8 * p.k,
      born: t,
      dur: 0.3,
      k: p.k,
    });
  }

  function drawPaw(p: PawEvent): void {
    if (!ctx || !P) return;
    const pose = pawPose(p);
    const { ux, uy, vx, vy, cx, cy, k, h, sink, curl, squash, seen } = pose;
    const ka = k * (1 - 0.16 * squash);
    const ks = k * (1 + 0.16 * squash);
    const cb = tipOf(pose) - HAND * 1.08;
    const toe = 2.5 + 0.3 * curl;
    const ring = HAND - toe - 1.1;
    const smin = (a: number, b: number, m: number): number => {
      const q = Math.max(m - Math.abs(a - b), 0) / m;
      return Math.min(a, b) - (q * q * m) / 4;
    };
    let dist = 0;
    const part = (al: number, sd: number): number => {
      const leg = (al > cb ? Math.hypot(al - cb, sd) : Math.abs(sd)) - LEG;
      const hand = Math.hypot((al - cb) / 1.08, sd) - HAND;
      dist = smin(leg, hand, 6);
      return dist > 0 ? -1 : al < -6 ? 0 : 1;
    };
    const fw = cw / 2;
    const fh = ch / 2;
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const al of [-p.leg - 1, 16]) {
      for (const sd of [-11.5, 11.5]) {
        const x = cx + ux * al * ka + vx * sd * ks;
        const y = cy + uy * al * ka + vy * sd * ks;
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
    }
    const i0 = Math.max(0, Math.floor(x0 / fw));
    const i1 = Math.min(Math.ceil(vw / fw), Math.ceil(x1 / fw));
    const j0 = Math.max(0, Math.floor(y0 / fh));
    const j1 = Math.min(Math.ceil(vh / fh), Math.ceil(y1 / fh));
    const nc = i1 - i0 + 1;
    const nr = j1 - j0 + 1;
    if (nc <= 0 || nr <= 0) return;

    const g = new Int8Array(nc * nr).fill(-1);
    const A = new Float32Array(nc * nr);
    const C = new Float32Array(nc * nr);
    const reachCell = (0.6 * Math.hypot(fw, fh)) / Math.min(ka, ks) + 0.3;
    const alOf = (x: number, y: number): number => ((x - cx) * ux + (y - cy) * uy) / ka;
    const sdOf = (x: number, y: number): number => ((x - cx) * vx + (y - cy) * vy) / ks;

    for (let j = 0; j < nr; j++) {
      for (let i = 0; i < nc; i++) {
        const x = (i0 + i) * fw;
        const y = (j0 + j) * fh;
        const ac = alOf(x + fw / 2, y + fh / 2);
        A[j * nc + i] = ac;
        if (ac < -p.leg - 1 || ac > 17 || Math.abs(sdOf(x + fw / 2, y + fh / 2)) > 13) continue;
        const vc = part(ac, sdOf(x + fw / 2, y + fh / 2));
        if (Math.abs(dist) > reachCell) {
          g[j * nc + i] = vc;
          C[j * nc + i] = vc >= 0 ? 1 : 0;
          continue;
        }
        let n = 0;
        let top = -1;
        for (let q = 1; q < 6; q += 2) {
          for (let r = 1; r < 6; r += 2) {
            const sx = x + (q / 6) * fw;
            const sy = y + (r / 6) * fh;
            const v = part(alOf(sx, sy), sdOf(sx, sy));
            if (v >= 0) {
              n++;
              if (top < 0 || v > 1) top = v;
            }
          }
        }
        g[j * nc + i] = n >= 5 ? top : n ? -2 : -1;
        C[j * nc + i] = n / 9;
      }
    }

    const at = (i: number, j: number): number =>
      i < 0 || j < 0 || i >= nc || j >= nr ? -1 : Math.max(-1, g[j * nc + i]);
    const wl = sink > 0 ? tipOf(pose) + 2 - 8 * sink : Infinity;
    const halfU = (0.5 * (Math.abs(ux) * fw + Math.abs(uy) * fh)) / ka;
    const fade = (al: number): number => (al < -8 ? Math.max(0, 1 - (-8 - al) / (p.leg - 8)) ** 1.5 : 1);
    const sx = fw * (2 + Math.round(h * 8));
    const sy = fh * (2 + Math.round(h * 6));

    ctx.globalAlpha = (P.dark ? 0.5 : 0.24) * (1 - 0.5 * h) * seen;
    ctx.fillStyle = P.dark ? '#000' : css(pack(mul(P.water, 0.55)));
    ctx.beginPath();
    for (let j = 0; j < nr; j++) {
      for (let i = 0; i < nc; i++) {
        const v = g[j * nc + i];
        const al = A[j * nc + i];
        if (v >= 0 && fade(al) > 0.4 && al < wl) {
          ctx.rect((i0 + i) * fw + sx, (j0 + j) * fh + sy, fw, fh);
        }
      }
    }
    ctx.fill();

    const fur: RGB = P.dark ? [16, 18, 21] : [16, 15, 14];
    const tex: RGB = P.dark ? [44, 49, 54] : [54, 50, 46];
    const rim: RGB = P.dark ? [150, 160, 166] : [85, 80, 74];
    const lit: RGB = P.dark ? mixC(fur, rim, 0.22) : fur;
    const waterColor = P.water;
    const wet = [fur, rim, lit].map(c => css(pack(mixC(c, waterColor, 0.3))));
    const dry = [fur, rim, lit].map(c => css(pack(c)));
    const texC = css(pack(tex));
    const dot = css(pack(P.dot));
    const px = (n: number, s: number): number => Math.round(n * s * dpr) / dpr;

    ctx.font = `600 ${(fh * 0.8).toFixed(1)}px ${MONO}`;
    const solid = typeof Path2D !== 'undefined' ? new Path2D() : null;
    const marks: Array<[number, string, string, number, number]> = [];

    for (let j = 0; j < nr; j++) {
      for (let i = 0; i < nc; i++) {
        const v = g[j * nc + i];
        const al = A[j * nc + i];
        const under = al > wl;
        const f = fade(al);
        if (v === -1 || f <= 0) continue;
        const x = px(i0 + i, fw);
        const y = px(j0 + j, fh);
        const w = px(i0 + i + 1, fw) - x;
        const hh = px(j0 + j + 1, fh) - y;
        const [furC, rimC, litC] = under ? wet : dry;
        const ns = [at(i - 1, j), at(i + 1, j), at(i, j - 1), at(i, j + 1)];
        const edge = ns.some(n => n < 0);
        if (v === -2) {
          ctx.globalAlpha = C[j * nc + i] * 1.3 * f * seen;
          ctx.fillStyle = furC;
          ctx.fillRect(x, y, w, hh);
          continue;
        }
        if (!under && f === 1 && !edge && solid) {
          solid.rect(x, y, w, hh);
        } else {
          ctx.globalAlpha = (under ? 0.8 : 1) * f * seen;
          ctx.fillStyle = edge ? litC : furC;
          ctx.fillRect(x, y, w, hh);
        }
        const gx = x + fw / 2;
        const gy = y + fh / 2;
        if (sink > 0 && Math.abs(al - wl) < halfU) marks.push([0.7, dot, '~', gx, gy]);
        else if (edge) marks.push([(P.dark ? 0.9 : 0.55) * f, rimC, ':', gx, gy]);
        else if (!under && ((i0 + i) * 7 + (j0 + j) * 13) % 4 === 0) {
          marks.push([0.45 * f, texC, (i0 + i + j0 + j) % 3 ? '#' : '%', gx, gy]);
        }
      }
    }
    if (solid) {
      ctx.globalAlpha = seen;
      ctx.fillStyle = dry[0];
      ctx.fill(solid);
    }
    for (const [alpha, style, chStr, gx, gy] of marks) {
      ctx.globalAlpha = alpha * seen;
      ctx.fillStyle = style;
      ctx.fillText(chStr, gx, gy);
    }

    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(0.8, 0.11 * k);
    ctx.strokeStyle = dry[1];
    for (const th of TOES) {
      const c = Math.cos(th);
      const n = Math.sin(th);
      const al = cb + ring * c * 1.08;
      const sd = ring * n;
      const x = cx + ux * al * ka + vx * sd * ks;
      const y = cy + uy * al * ka + vy * sd * ks;
      const phi = Math.atan2(uy * c + vy * n, ux * c + vx * n);
      ctx.globalAlpha = (al + toe > wl ? 0.3 : 0.5) * seen;
      ctx.beginPath();
      ctx.arc(x, y, toe * k, phi - 1.05, phi + 1.05);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function rasterDrops(): void {
    if (!P) return;
    for (const d of drops) {
      const u = (t - d.born) / d.dur;
      if (u < 0 || u >= 1) continue;
      const x = lerp(d.x0, d.x1, u);
      const y = lerp(d.y0, d.y1, u);
      const hh = 4 * u * (1 - u);
      const c = Math.floor(x / cw);
      const r = Math.floor(y / ch);
      const i = r * cols + c;
      if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
      if (!tileA[i] && !glyphA[i]) touched.push(i);
      glyphRGB[i] = pack(P.dot);
      glyphA[i] = 0.9;
      glyphCode[i] = (hh > 0.4 ? 'o' : '.').charCodeAt(0);
      const sc = Math.round(hh * 3);
      const sr = Math.round(hh * 2);
      const si = (r + sr) * cols + (c + sc);
      if ((sc || sr) && r + sr < rows && c + sc < cols) {
        shade[si] = Math.max(shade[si], P.dark ? 0.35 : 0.18);
      }
    }
  }

  function ringAt(px: number, py: number): { a: number; g: string } | null {
    let best: { a: number; g: string } | null = null;
    for (const g of rings) {
      const age = t - g.born;
      const life = 1 - age / (g.tiny ? 0.7 : g.small ? DROP_LIFE : RING_LIFE);
      if (life <= 0 || age < 0) continue;
      const dx = px - g.x;
      const dy = py - g.y;
      const d = Math.hypot(dx, dy);
      for (let j = 0; j < (g.small ? 1 : 2); j++) {
        const ag = age - j * 0.38;
        if (ag <= 0) continue;
        const R = (g.small ? ag * 34 + 4 : ag * 74 + 26) * g.k;
        if (Math.abs(d - R) > cw * 0.62) continue;
        const a = life ** 1.5 * (j ? 0.32 : g.tiny ? 0.28 : g.small ? 0.45 : 0.62);
        if (!best || a > best.a) best = { a, g: j || g.tiny ? '·' : lineGlyph(-dy, dx) };
      }
    }
    return best;
  }

  function stepFood(dt: number): void {
    for (const p of food) {
      if (!p.landed && t >= p.land) {
        p.landed = true;
        rings.push({ x: p.x, y: p.y, born: t, k: K * 1.3, small: false });
        stamp(p.x, p.y, 1.8, 0.6);
      }
      if (p.landed && p.eaten < 0) {
        p.x += Math.sin(t * 0.6 + p.seed) * 2.4 * K * dt;
        p.y += Math.cos(t * 0.45 + p.seed * 1.3) * 1.6 * K * dt;
      }
    }
    for (let j = food.length - 1; j >= 0; j--) {
      const p = food[j];
      if ((p.eaten >= 0 && t - p.eaten > 0.05) || (p.landed && t - p.land > FLOAT + SINKING)) {
        food.splice(j, 1);
      }
    }
    for (let j = bubbles.length - 1; j >= 0; j--) {
      if (t - bubbles[j].born > 0.75) bubbles.splice(j, 1);
    }
  }

  function drawFood(): void {
    if (!ctx || !P || (!food.length && !bubbles.length)) return;
    const px = (v: number): number => Math.round(v * dpr) / dpr;
    const body = '#f59e0b'; // Vibrant amber gold
    const glow = 'rgba(251, 191, 36, 0.45)';
    const top = '#fef3c7'; // Crisp glowing highlight
    const shadow = 'rgba(0, 0, 0, 0.65)';
    const pw = Math.max(12, cw * 1.3) * K;
    const ph = Math.max(9, ch * 1.0) * K;

    for (const p of food) {
      if (t < p.born || p.eaten >= 0) continue;
      let x = p.x;
      let y = p.y;
      let hh = 0;
      let a = 1;
      let big = 1;
      if (!p.landed) {
        const u = clamp((t - p.born) / (p.land - p.born), 0, 1);
        x = lerp(p.x0, p.x, u);
        y = lerp(p.y0, p.y, u);
        hh = 4 * u * (1 - u);
        big = 1 + 0.9 * (1 - u);
      } else {
        const age = t - p.land;
        a = 1 - clamp((age - FLOAT) / SINKING, 0, 1);
        hh = age < 0.3 ? 0.25 * Math.sin((age / 0.3) * Math.PI) : 0;
      }
      const w = pw * big;
      const h = ph * big;
      const X = px(x - w / 2);
      const Y = px(y - h / 2);

      // Outer golden water ripple glow
      ctx.globalAlpha = a * 0.4;
      ctx.fillStyle = glow;
      ctx.beginPath();
      if (typeof ctx.arc === 'function') {
        ctx.arc(px(x), px(y), px(Math.max(w, h) * 1.2), 0, Math.PI * 2);
        ctx.fill();
      }

      // Shadow
      ctx.globalAlpha = a * 0.55;
      ctx.fillStyle = shadow;
      ctx.fillRect(px(X + pw * (0.6 + hh * 4)), px(Y + ph * (0.6 + hh * 3)), px(w), px(h));

      // Golden Pellet Body
      ctx.globalAlpha = a;
      ctx.fillStyle = body;
      ctx.fillRect(X, Y, px(w), px(h));

      // Top Specular Highlight
      ctx.fillStyle = top;
      ctx.fillRect(X, Y, px(w), px(Math.max(2, h * 0.38)));

      // ASCII Character Overlay on Food Pellet
      ctx.font = `bold ${Math.round(ph * 0.85)}px ${MONO}`;
      ctx.fillStyle = '#1c1917';
      ctx.globalAlpha = a * 0.8;
      ctx.fillText('•', px(x - pw * 0.2), px(y + ph * 0.3));
    }

    if (bubbles.length) {
      ctx.font = `bold ${Math.round(ch * 0.9)}px ${MONO}`;
      ctx.fillStyle = css(pack(P.dot));
      for (const b of bubbles) {
        const u = (t - b.born) / 0.75;
        if (u < 0 || u >= 1) continue;
        ctx.globalAlpha = 0.95 * (1 - u * u);
        ctx.fillText(u < 0.35 ? 'o' : u < 0.7 ? '°' : '·', b.x, b.y - u * ch * 0.8);
      }
    }
    ctx.globalAlpha = 1;
  }

  function stepPaws(dt: number): void {
    for (const p of paws) {
      const a = t - p.born;
      if (!p.hit && a >= DIP) splash(p);
      if (a > PULL && a < FLICK - 0.02) stir(p, dt);
      if (!p.flung && a >= FLICK) fling(p);
      if (p.drips < 3 && a >= SHAKE + 0.3 * (0.12 + p.drips * 0.25)) {
        drip(p, (p.drips++ % 2 ? -1 : 1) * p.side);
      }
    }
    for (let j = paws.length - 1; j >= 0; j--) if (t - paws[j].born >= END) paws.splice(j, 1);
    for (let j = drops.length - 1; j >= 0; j--) {
      const d = drops[j];
      if (t - d.born < d.dur) continue;
      rings.push({ x: d.x1, y: d.y1, born: t, k: d.k, small: true });
      stamp(d.x1, d.y1, 1, 0.5);
      drops.splice(j, 1);
    }
    for (let j = rings.length - 1; j >= 0; j--) {
      const rg = rings[j];
      if (t - rg.born >= (rg.tiny ? 0.7 : rg.small ? DROP_LIFE : RING_LIFE)) rings.splice(j, 1);
    }
  }

  function advance(dt: number): void {
    t += dt;
    step(dt);
    stepPaws(dt);
    stepFood(dt);
  }

  function colors(): void {
    const c = paletteFn();
    const dark = !!c.dark;
    const water = rgb(c.water);
    const accent = rgb(c.accent);
    const light = rgb(c.koiLight);
    const black = rgb(c.koiDark);
    const ink = rgb(c.ink);
    const white: RGB = dark ? light : mixC(light, [255, 255, 255], 0.4);
    const red: RGB = dark ? mixC(accent, [232, 92, 52], 0.5) : mixC(accent, [214, 72, 34], 0.7);
    const darkBlack: RGB = dark ? mixC(black, [0, 0, 0], 0.2) : black;
    const finColor: RGB = dark ? mixC(light, water, 0.25) : mixC(water, black, 0.34);

    const scheme = (sRed: RGB, sWhite: RGB, sBlack: RGB): KoiScheme => ({
      red: sRed,
      white: sWhite,
      black: sBlack,
      fin: dark ? mixC(sWhite, water, 0.25) : finColor,
    });

    P = {
      dark,
      water,
      ink,
      white,
      red,
      black: darkBlack,
      eye: dark ? [16, 15, 14] : [30, 27, 24],
      fin: finColor,
      dot: dark ? light : ink,
      food: dark ? [206, 142, 74] : [150, 92, 40],
      koi: {
        course: scheme(red, white, darkBlack),
        vermilion: scheme([214, 58, 36], [246, 242, 234], [24, 22, 20]),
        gold: scheme([230, 164, 52], [222, 228, 232], [98, 74, 42]),
        sakura: scheme([238, 132, 128], [250, 240, 228], [66, 60, 70]),
      },
    };
  }

  function render(): void {
    if (!P || destroyed) return;
    for (const i of touched) {
      tileA[i] = 0;
      glyphA[i] = 0;
      tintA[i] = 0;
    }
    touched.length = 0;
    shade.fill(0);

    const order = fish.filter(f => f.seen > 0).sort((a, b) => a.depth - b.depth);
    for (const f of order) rasterize(f);
    rasterDrops();

    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = css(pack(P.water));
    ctx.fillRect(0, 0, vw, vh);
    ctx.font = `600 ${Math.round(ch * 0.74)}px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const dot = css(pack(P.dot));
    const shadeFill = P.dark ? '#000' : css(pack(mul(P.water, 0.55)));
    const snap = (v: number): number => Math.round(v * dpr) / dpr;
    const gap = cw * 0.05;
    const spark = 0.022;

    ctx.fillStyle = shadeFill;
    for (let i = 0; i < shade.length; i++) {
      if (!(shade[i] > 0)) continue;
      const x = (i % cols) * cw;
      const y = ((i / cols) | 0) * ch;
      ctx.globalAlpha = shade[i];
      ctx.fillRect(snap(x), snap(y), snap(x + cw) - snap(x), snap(y + ch) - snap(y));
    }

    let fill = -1;
    for (const i of touched) {
      if (!(tileA[i] > 0)) continue;
      const x = (i % cols) * cw;
      const y = ((i / cols) | 0) * ch;
      const x0 = snap(x + gap);
      const y0 = snap(y + gap);
      if (tileRGB[i] !== fill) {
        fill = tileRGB[i];
        ctx.fillStyle = css(fill);
      }
      ctx.globalAlpha = tileA[i];
      ctx.fillRect(x0, y0, snap(x + cw - gap) - x0, snap(y + ch - gap) - y0);
    }

    ctx.fillStyle = dot;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const x = c * cw + cw / 2;
        const y = r * ch + ch / 2;
        if (tileA[i] > 0 || glyphA[i] > 0) continue;
        if (rings.length) {
          const g = ringAt(x, y);
          if (g) {
            ctx.globalAlpha = g.a;
            ctx.fillText(g.g, x, y);
            continue;
          }
        }
        const w = wake[i];
        if (w > 0.03) {
          ctx.globalAlpha = Math.min(0.5, w * 1.2);
          ctx.fillText(w > 0.25 ? ':' : '·', x, y);
          continue;
        }
        const cl = caus(x, y);
        if (cl > 0.8) {
          ctx.globalAlpha = (cl - 0.8) * 1.3;
          ctx.fillText(cl > 0.94 ? '~' : cl > 0.87 ? '-' : '·', x, y);
          continue;
        }
        const h = h2(c, r);
        if (h < spark) {
          ctx.globalAlpha = 0.1 + 0.12 * (0.5 + 0.5 * Math.sin(t * 0.9 + h * 900));
          ctx.fillText('·', x, y);
        }
      }
    }

    fill = -1;
    for (const i of touched) {
      if (!(glyphA[i] > 0) || glyphCode[i] === 32) continue;
      if (glyphRGB[i] !== fill) {
        fill = glyphRGB[i];
        ctx.fillStyle = css(fill);
      }
      ctx.globalAlpha = glyphA[i];
      ctx.fillText(
        String.fromCharCode(glyphCode[i]),
        (i % cols) * cw + cw / 2,
        ((i / cols) | 0) * ch + ch / 2
      );
    }

    drawFood();
    for (const p of paws) drawPaw(p);
    ctx.globalAlpha = 1;
  }

  function reset(): void {
    makeFish();
    paws.length = 0;
    rings.length = 0;
    drops.length = 0;
    food.length = 0;
    bubbles.length = 0;
    wake.fill(0);
    wakeTmp.fill(0);
    t = 0;
    const n = count();
    fish.forEach((f, i) => {
      f.seen = i < n ? 1 : 0;
    });
    for (let j = 0; j < 90; j++) {
      t += 1 / 30;
      step(1 / 30);
    }
    dirty = true;
  }

  // Initialize palette, grid, 90-step warm-up, and trigger Geist Mono font loading
  colors();
  size(initW, initH, opts.dpr);
  reset();

  if (typeof document !== 'undefined' && document.fonts?.load) {
    document.fonts
      .load('600 12px "Geist Mono"')
      .then(() => {
        if (!destroyed) dirty = true;
      })
      .catch(() => {
        // Fallback monospace font handles rendering if Geist Mono fails to load
      });
  }

  let last = 0;
  let hasLast = false;
  let drawn = 0;
  let hasDrawn = false;

  function stepAndRender(nowMs: number): boolean {
    if (destroyed) return false;
    const dt = hasLast ? Math.min(0.05, Math.max(0, (nowMs - last) / 1000)) : 0;
    last = nowMs;
    hasLast = true;
    const moving = !paused && !reduce;
    if (moving && dt > 0) advance(dt);
    if (!moving && !dirty) return false;
    if (hasDrawn && nowMs - drawn < 12 && !dirty) return false;
    dirty = false;
    drawn = nowMs;
    hasDrawn = true;
    render();
    return true;
  }

  function resize(width: number, height: number, nextDpr?: number): void {
    if (destroyed) return;
    size(width, height, nextDpr);
    colors();
    dirty = true;
  }

  function destroy(): void {
    if (destroyed) return;
    destroyed = true;
    fish = [];
    paws.length = 0;
    rings.length = 0;
    drops.length = 0;
    food.length = 0;
    bubbles.length = 0;
    touched.length = 0;
    P = null;
  }

  function setPalette(nextPaletteFn: () => AsciiKoiPalette): void {
    if (destroyed) return;
    paletteFn = nextPaletteFn;
    colors();
    dirty = true;
  }

  function feed(clientX: number, clientY: number, count = 4): void {
    if (destroyed) return;
    const pellets = Math.max(1, count || 4);
    for (let i = 0; i < pellets; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = (8 + Math.random() * 32) * K;
      const targetX = clamp(clientX + Math.cos(angle) * dist, 24, vw - 24);
      const targetY = clamp(clientY + Math.sin(angle) * dist, 24, vh - 24);
      const throwAngle = angle + Math.PI + (Math.random() - 0.5) * 0.7;
      const throwDist = (40 + Math.random() * 45) * K;
      const startX = targetX + Math.cos(throwAngle) * throwDist;
      const startY = targetY + Math.sin(throwAngle) * throwDist - 30 * K;
      const flightDuration = 0.3 + Math.random() * 0.2;

      food.push({
        x0: startX,
        y0: startY,
        x: targetX,
        y: targetY,
        born: t,
        land: t + flightDuration,
        seed: Math.random() * 1000,
        landed: false,
        eaten: -1,
        claim: 0,
      });
    }

    // Alert all fish in the pond to turn and rush excitedly towards the food
    fish.forEach((f) => {
      f.kick = Math.max(f.kick, 1.0);
      f.rise = 1.0;
      f.fullUntil = 0;
      f.appetite = Math.max(f.appetite, 0.85);
      f.seekFrom = t;
      f.seekUntil = t + 10.0;
      f.seekX = clientX;
      f.seekY = clientY;
    });

    dirty = true;
  }

  return {
    canvas,
    resize,
    stepAndRender,
    destroy,
    reset,
    render,
    setPalette,
    feed,
    get time() {
      return t;
    },
    get fishCount() {
      return count();
    },
    get dpr() {
      return dpr;
    },
    get cols() {
      return cols;
    },
    get rows() {
      return rows;
    },
  };
}
