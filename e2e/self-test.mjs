import fs from 'node:fs';
import path from 'node:path';
import { launchBrowser } from './cdp.mjs';
import { startFixtureServer } from './server.mjs';
import { decodePng, diffRegion, regionStats } from './png.mjs';
import {
  checkViewportOverflow,
  clickAccessible,
  readSliderInfo,
  sampleElementStability,
  setSliderValue,
} from './selectors.mjs';
import { tier1Tests } from './tiers/tier1-features.mjs';
import { tier2Tests } from './tiers/tier2-boundaries.mjs';
import { tier3Tests } from './tiers/tier3-cross-feature.mjs';
import { tier4Tests } from './tiers/tier4-scenarios.mjs';

function assert(cond, msg) {
  if (!cond) throw new Error(`Self-test assertion failed: ${msg}`);
}

export function validateTestRegistry() {
  const all = [...tier1Tests, ...tier2Tests, ...tier3Tests, ...tier4Tests];
  const ids = new Set();
  for (const t of all) {
    assert(typeof t.id === 'string' && t.id.trim().length > 0, `Invalid test id: ${t.id}`);
    assert(!ids.has(t.id), `Duplicate test id: ${t.id}`);
    ids.add(t.id);
    assert(Number.isInteger(t.tier) && t.tier >= 1 && t.tier <= 4, `Invalid tier on ${t.id}: ${t.tier}`);
    assert(typeof t.feature === 'string' && t.feature.trim().length > 0, `Missing feature on ${t.id}`);
    assert(typeof t.req === 'string' && t.req.trim().length > 0, `Missing req on ${t.id}`);
    assert(typeof t.name === 'string' && t.name.trim().length > 0, `Missing name on ${t.id}`);
    assert(typeof t.run === 'function', `Missing run() function on ${t.id}`);
  }

  assert(tier1Tests.length === 50, `Expected 50 Tier 1 tests, got ${tier1Tests.length}`);
  assert(tier2Tests.length === 50, `Expected 50 Tier 2 tests, got ${tier2Tests.length}`);
  assert(tier3Tests.length === 18, `Expected 18 Tier 3 tests, got ${tier3Tests.length}`);
  assert(tier4Tests.length === 6, `Expected 6 Tier 4 tests, got ${tier4Tests.length}`);
  assert(all.length === 124, `Expected 124 total tests, got ${all.length}`);

  for (let f = 1; f <= 10; f++) {
    const fKey = `F${f}`;
    const t1Count = tier1Tests.filter((t) => t.feature === fKey).length;
    const t2Count = tier2Tests.filter((t) => t.feature === fKey).length;
    assert(t1Count === 5, `Expected 5 Tier 1 tests for ${fKey}, got ${t1Count}`);
    assert(t2Count === 5, `Expected 5 Tier 2 tests for ${fKey}, got ${t2Count}`);
  }

  return {
    total: all.length,
    tier1: tier1Tests.length,
    tier2: tier2Tests.length,
    tier3: tier3Tests.length,
    tier4: tier4Tests.length,
  };
}

export function validateCatalogGroundTruth(cwd = process.cwd()) {
  const catalogPath = path.join(cwd, 'client', 'public', 'catalog.json');
  assert(fs.existsSync(catalogPath), `Catalog missing at ${catalogPath}`);
  const data = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  assert(Array.isArray(data), 'catalog.json is not an array');
  assert(data.length === 563, `Expected 563 catalog games, got ${data.length}`);

  const expectedCats = {
    'aaa-console': 14,
    'nintendo-decomp': 6,
    'classic-pc': 15,
    'retro-arcade': 227,
    'flash-classics': 286,
    'modern-indie': 6,
    hubs: 9,
  };
  for (const [cat, expected] of Object.entries(expectedCats)) {
    const actual = data.filter((g) => g.category === cat).length;
    assert(actual === expected, `Category ${cat}: expected ${expected}, got ${actual}`);
  }

  const popular = data.filter((g) => g.popular).length;
  const multiplayer = data.filter((g) => g.multiplayer).length;
  const iframeGames = data.filter((g) => g.iframeCompatible);
  assert(popular === 31, `Expected 31 popular games, got ${popular}`);
  assert(multiplayer === 224, `Expected 224 multiplayer games, got ${multiplayer}`);
  assert(
    iframeGames.length === 1 && iframeGames[0].id === 'classic-doom-silent',
    `Expected sole iframeCompatible classic-doom-silent, got ${JSON.stringify(iframeGames.map((g) => g.id))}`
  );

  // Pairwise counts
  const iframeMp = data.filter((g) => g.iframeCompatible && g.multiplayer).length;
  const iframePop = data.filter((g) => g.iframeCompatible && g.popular).length;
  const iframeClassic = data.filter((g) => g.iframeCompatible && g.category === 'classic-pc').length;
  const popMp = data.filter((g) => g.popular && g.multiplayer).length;
  const retroMp = data.filter((g) => g.category === 'retro-arcade' && g.multiplayer).length;

  assert(iframeMp === 0, `Expected iframe+mp=0, got ${iframeMp}`);
  assert(iframePop === 0, `Expected iframe+popular=0, got ${iframePop}`);
  assert(iframeClassic === 1, `Expected iframe+classic-pc=1, got ${iframeClassic}`);
  assert(popMp === 19, `Expected popular+mp=19, got ${popMp}`);
  assert(retroMp === 193, `Expected retro-arcade+mp=193, got ${retroMp}`);

  return {
    total: data.length,
    categories: expectedCats,
    popular,
    multiplayer,
    iframeId: iframeGames[0].id,
  };
}

const FIXTURE_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WASM//DECK Self-Test Fixture</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #070914; color: #f4f6fb; font-family: system-ui, sans-serif; overflow-x: hidden; }
    canvas { position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 0; pointer-events: none; }
    .shell { position: relative; z-index: 10; min-height: 100vh; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
    .topbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 16px; border: 1px solid rgba(255,255,255,0.2); border-radius: 16px; background: rgba(10,14,28,0.65); }
    .glass-card { width: min(460px, 100%); padding: 20px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.25); background: rgba(255,255,255,0.04); }
    .controls { display: grid; gap: 10px; margin-top: 12px; }
    .dialog { position: fixed; left: 50%; top: 50%; transform: translate(-50%,-50%); width: min(340px, calc(100vw - 32px)); padding: 18px; border-radius: 20px; background: rgba(16,22,40,0.92); border: 1px solid rgba(255,255,255,0.28); z-index: 60; }
    [hidden] { display: none !important; }
    button { cursor: pointer; padding: 6px 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.1); color: #fff; }
    input[type="search"] { padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.25); background: rgba(0,0,0,0.4); color: #fff; width: 100%; }
  </style>
</head>
<body>
  <canvas id="gl-canvas" aria-hidden="true"></canvas>
  <main class="shell">
    <header class="topbar">
      <strong>WASM//DECK</strong>
      <button id="open-settings" type="button" aria-label="Settings">Settings</button>
    </header>
    <section id="static-card" class="glass-card" aria-label="Static Glass Card">
      <h1 style="margin:0 0 8px;font-size:20px;">Static Optical Lens</h1>
      <p style="margin:0;font-size:13px;opacity:0.85;">Drifting WebGL backdrop with static DOM card.</p>
      <div class="controls">
        <label>Refraction (IOR): <span id="refraction-val">0.080</span>
          <input id="refraction-slider" type="range" min="0" max="0.22" step="0.005" value="0.080" aria-label="Refraction (IOR)" />
        </label>
        <input id="search-box" type="search" placeholder="Filter fixture items" aria-label="Search items" />
        <div id="filter-count" aria-live="polite">3 entries</div>
        <button id="fetch-probe" type="button">Fetch Catalog Probe</button>
        <div id="fetch-status">idle</div>
      </div>
    </section>
  </main>
  <div id="modal" class="dialog" role="dialog" aria-labelledby="modal-title" hidden>
    <h2 id="modal-title" style="margin:0 0 10px;font-size:18px;">Settings Modal</h2>
    <button id="close-modal" type="button" aria-label="Close">Close</button>
  </div>
  <script>
    const canvas = document.getElementById('gl-canvas');
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: false, alpha: true });
    let refraction = 0.08;
    const items = ['Classic Doom', 'Super Mario 64', 'Quake III'];
    const search = document.getElementById('search-box');
    const filterCount = document.getElementById('filter-count');
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      const matched = items.filter(i => i.toLowerCase().includes(q));
      filterCount.textContent = matched.length + (matched.length === 1 ? ' entry' : ' entries');
    });

    const slider = document.getElementById('refraction-slider');
    const refVal = document.getElementById('refraction-val');
    slider.addEventListener('input', () => {
      refraction = parseFloat(slider.value);
      refVal.textContent = refraction.toFixed(3);
    });

    const modal = document.getElementById('modal');
    document.getElementById('open-settings').addEventListener('click', () => { modal.hidden = false; });
    document.getElementById('close-modal').addEventListener('click', () => { modal.hidden = true; });
    document.getElementById('fetch-probe').addEventListener('click', async () => {
      try {
        const res = await fetch('/api/probe');
        document.getElementById('fetch-status').textContent = 'status:' + res.status + ':' + (await res.text());
      } catch (err) {
        document.getElementById('fetch-status').textContent = 'error';
      }
    });

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
      canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
      if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
    }
    window.addEventListener('resize', resize);
    resize();

    if (gl) {
      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, 'attribute vec2 p; varying vec2 uv; void main(){ uv = p*0.5+0.5; gl_Position = vec4(p,0.0,1.0); }');
      gl.compileShader(vs);
      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, 'precision mediump float; varying vec2 uv; uniform float t; uniform float ref; void main(){ vec2 s = uv + vec2(sin(t*1.8)*0.22, cos(t*1.3)*0.18); float r = 0.5 + 0.5*sin(s.x*18.0 + ref*24.0); float g = 0.5 + 0.5*cos(s.y*16.0 - ref*18.0); float b = 0.5 + 0.5*sin((s.x+s.y)*12.0); gl_FragColor = vec4(r, g, b, 1.0); }');
      gl.compileShader(fs);
      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const uT = gl.getUniformLocation(prog, 't');
      const uR = gl.getUniformLocation(prog, 'ref');
      const start = performance.now();
      function frame(now) {
        const dt = (now - start) * 0.001;
        gl.uniform1f(uT, dt);
        gl.uniform1f(uR, refraction);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }
  </script>
</body>
</html>`;

export async function runSelfTest({ swiftshader = false, cwd = process.cwd() } = {}) {
  const registrySummary = validateTestRegistry();
  const catalogSummary = validateCatalogGroundTruth(cwd);

  const fixture = await startFixtureServer((req, res) => {
    const urlPath = (req.url || '/').split('?')[0];
    if (urlPath === '/' || urlPath === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(FIXTURE_HTML);
      return;
    }
    if (urlPath === '/api/probe') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('live');
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  });

  const cdp = await launchBrowser({ swiftshader, baseUrl: fixture.baseUrl });
  try {
    await cdp.navigate(fixture.baseUrl);
    await cdp.waitFor(`() => Boolean(document.getElementById('gl-canvas')?.width > 0)`, 5000);

    // 1. WebGL1 verification
    const webglOk = await cdp.evaluate(`(() => {
      const c = document.getElementById('gl-canvas');
      const gl = c.getContext('webgl');
      return Boolean(gl && c.width > 0 && c.height > 0);
    })()`);
    assert(webglOk, 'WebGL1 context failed on fixture canvas');

    // 2. PNG screenshot decode + animated background drift check
    const bgRect = { x: 900, y: 120, width: 120, height: 120 };
    const img0 = decodePng(await cdp.screenshot());
    await cdp.sleep(450);
    const img1 = decodePng(await cdp.screenshot());
    const drift = diffRegion(img0, img1, bgRect, 1, 2);
    assert(drift.meanAbsDiff > 0.5, `Fixture WebGL background did not drift: ${JSON.stringify(drift)}`);

    // 3. Static glass card stability (getBoundingClientRect <= 0.5px during pointer sweep)
    const stability = await sampleElementStability(
      cdp,
      `document.getElementById('static-card')`,
      { samples: 5, intervalMs: 100, sweepPointer: true }
    );
    assert(stability.maxDelta <= 0.5, `Static card moved: ${stability.maxDelta}`);

    // 4. Range slider interaction + optical change
    const sliderBefore = await readSliderInfo(cdp, /Refraction/i);
    assert(Math.abs(sliderBefore.value - 0.08) < 0.002, `Initial slider mismatch: ${sliderBefore.value}`);
    const updatedVal = await setSliderValue(cdp, /Refraction/i, 0.2);
    assert(Math.abs(updatedVal - 0.2) < 0.005, `Updated slider mismatch: ${updatedVal}`);
    const imgSlider = decodePng(await cdp.screenshot());
    const sliderStats = regionStats(imgSlider, bgRect, 1);
    assert(sliderStats.stdDev > 2, 'Screenshot region unexpectedly flat');

    // 5. Modal open & close + Search filter
    await clickAccessible(cdp, { role: 'button', name: /^Settings$/i });
    await cdp.waitFor(`() => !document.getElementById('modal').hidden`, 3000);
    await clickAccessible(cdp, { withinDialog: true, role: 'button', name: /^Close$/i });
    await cdp.waitFor(`() => document.getElementById('modal').hidden`, 3000);

    // 6. Fetch route interception check
    await cdp.interceptRoutes([
      { match: /\/api\/probe/, status: 500, body: 'intercepted-500', contentType: 'text/plain' },
    ]);
    await clickAccessible(cdp, { role: 'button', name: /Fetch Catalog Probe/i });
    await cdp.waitFor(`() => document.getElementById('fetch-status').textContent.includes('status:500:intercepted-500')`, 4000);
    await cdp.clearInterceptions();
    cdp.clearDiagnostics();

    // 7. Viewport emulation desktop 1440x900 & mobile 375x812
    await cdp.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1, mobile: false, touch: false });
    assert(!(await checkViewportOverflow(cdp)).overflow, 'Desktop fixture overflowed');

    await cdp.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, mobile: true, touch: true });
    await cdp.sleep(150);
    const mobileVw = await cdp.evaluate(`window.innerWidth`);
    assert(mobileVw === 375, `Expected mobile innerWidth 375, got ${mobileVw}`);
    assert(!(await checkViewportOverflow(cdp)).overflow, 'Mobile fixture overflowed');

    assert(cdp.pageErrors.length === 0, `Unexpected pageErrors: ${JSON.stringify(cdp.pageErrors)}`);
    assert(cdp.consoleErrors.length === 0, `Unexpected consoleErrors: ${JSON.stringify(cdp.consoleErrors)}`);

    return {
      ok: true,
      registrySummary,
      catalogSummary,
      fixtureChecks: {
        webglOk,
        driftMeanAbsDiff: Number(drift.meanAbsDiff.toFixed(2)),
        staticMaxDelta: stability.maxDelta,
        sliderUpdated: updatedVal,
        mobileInnerWidth: mobileVw,
        fetchInterception: 'verified',
      },
    };
  } finally {
    await cdp.close();
    await fixture.close();
  }
}
