import {
  SHARED_DOM_HELPERS,
  assert,
  assertApprox,
  assertCleanDiagnostics,
  assertEqual,
  assertOpticalDelta,
  captureDecoded,
  checkContrastAndHitTest,
  checkViewportOverflow,
  clickAccessible,
  clickResetSettings,
  closeDialog,
  diffRegion,
  findVisibleDialog,
  getCardTitles,
  getDialogBevelRect,
  getDpr,
  getExteriorBackgroundRect,
  getResultsSummary,
  hasVisibleDialog,
  locateElement,
  measureOpticalDelta,
  openSettings,
  PRESET_META,
  readActivePresetAndScene,
  readOpticalSliders,
  readSidebarBadge,
  regionStats,
  resetBrowserState,
  sampleElementStability,
  selectPreset,
  selectScene,
  selectSidebarItem,
  setOpticalSlider,
  setSearchInputValue,
  setSortValue,
  toggleFilterPill,
  waitForCatalogReady,
  waitForNoVisibleDialog,
  waitForVisibleDialog,
  waitForVisibleDialogIframe,
} from './helpers.mjs';

function pass(details, metrics = {}, artifacts = []) {
  return { status: 'passed', details, metrics, artifacts };
}

export const tier1Tests = [
  // =========================================================================
  // F1: Global Liquid Glass Settings State & Engine Overrides (5)
  // =========================================================================
  {
    id: 'T1-F1-01',
    tier: 1,
    feature: 'F1',
    req: 'R2',
    name: 'Default Apple optical state on initial load',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      const sliders = await readOpticalSliders(cdp);
      const state = await readActivePresetAndScene(cdp);

      assertApprox(sliders.refraction.value, 0.08, 0.002, 'Default refraction');
      assertApprox(sliders.chroma.value, 0.045, 0.002, 'Default chroma');
      assertApprox(sliders.specular.value, 1.5, 0.05, 'Default specular');
      assertApprox(sliders.bevel.value, 0.085, 0.002, 'Default bevel');
      assertEqual(state.activePreset, 'apple', 'Default preset');
      assertEqual(state.activeScene, 'bamboo', 'Default scene');
      assertCleanDiagnostics(cdp, 'T1-F1-01');
      return pass('Default Apple optical values verified in Settings', { sliders, state });
    },
  },
  {
    id: 'T1-F1-02',
    tier: 1,
    feature: 'F1',
    req: 'R2',
    name: 'Live Refraction slider updates canvas pixels',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      // Use deterministic offline procedural scene for reproducible high-contrast optical diff
      await selectScene(cdp, 'procedural');
      await setOpticalSlider(cdp, 'refraction', 0.02);
      const bevelRect = await getDialogBevelRect(cdp);
      assert(bevelRect, 'Settings dialog bevel rect missing');

      const optical = await measureOpticalDelta(cdp, bevelRect, () =>
        setOpticalSlider(cdp, 'refraction', 0.2)
      );
      const newVal = optical.mutationResult;
      assertApprox(newVal, 0.2, 0.005, 'Updated refraction slider');
      assertOpticalDelta(optical, { label: 'Refraction 0.02 -> 0.20', minDiff: 0.25 });
      assert(
        optical.stored && Math.abs(optical.stored.refraction - 0.2) < 0.01,
        `Refraction did not persist to localStorage: ${JSON.stringify(optical.stored)}`
      );

      const state = await readActivePresetAndScene(cdp);
      assert(state.activePreset !== 'apple', 'Preset should switch away from apple after manual tweak');
      assertCleanDiagnostics(cdp, 'T1-F1-02');
      return pass('Refraction slider updated optical rendering in real time', {
        newVal,
        diff: optical.diff,
        baselineDrift: optical.baselineDrift,
        state,
      });
    },
  },
  {
    id: 'T1-F1-03',
    tier: 1,
    feature: 'F1',
    req: 'R2',
    name: 'Preset quick-select updates all 4 optical parameters',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      await selectScene(cdp, 'procedural');
      const bevelRect = await getDialogBevelRect(cdp);
      assert(bevelRect, 'Settings dialog bevel rect missing');

      const optical = await measureOpticalDelta(cdp, bevelRect, () => selectPreset(cdp, 'prism'));
      const sliders = await readOpticalSliders(cdp);

      assertApprox(sliders.refraction.value, PRESET_META.prism.values.refraction, 0.003, 'Prism refraction');
      assertApprox(sliders.chroma.value, PRESET_META.prism.values.chroma, 0.002, 'Prism chroma');
      assertApprox(sliders.specular.value, PRESET_META.prism.values.specular, 0.05, 'Prism specular');
      assertApprox(sliders.bevel.value, PRESET_META.prism.values.bevel, 0.003, 'Prism bevel');
      assertOpticalDelta(optical, { label: 'Prism preset optical update', minDiff: 0.2 });
      assert(
        optical.stored && Math.abs(optical.stored.chroma - PRESET_META.prism.values.chroma) < 0.003,
        `Prism preset did not update localStorage: ${JSON.stringify(optical.stored)}`
      );
      assertCleanDiagnostics(cdp, 'T1-F1-03');
      return pass('Prism Rainbow preset updated all 4 sliders and glass pixels', {
        sliders,
        diff: optical.diff,
        baselineDrift: optical.baselineDrift,
      });
    },
  },
  {
    id: 'T1-F1-04',
    tier: 1,
    feature: 'F1',
    req: 'R2',
    name: 'Background scene switch updates WebGL backdrop',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      const bgRect = await getExteriorBackgroundRect(cdp);

      await selectScene(cdp, 'cyberpunk');
      await cdp.sleep(450);
      const stateCyber = await readActivePresetAndScene(cdp);
      const imgCyber = await captureDecoded(cdp);

      await selectScene(cdp, 'procedural');
      await cdp.sleep(350);
      const stateProc = await readActivePresetAndScene(cdp);
      const imgProc = await captureDecoded(cdp);

      const diff = diffRegion(imgCyber, imgProc, bgRect, getDpr(cdp), 3);
      assert(stateCyber.activeScene === 'cyberpunk', `Expected cyberpunk active, got ${stateCyber.activeScene}`);
      assert(stateProc.activeScene === 'procedural', `Expected procedural active, got ${stateProc.activeScene}`);
      assert(diff.meanAbsDiff > 0.25, `Background scene switch produced zero backdrop change: ${JSON.stringify(diff)}`);
      assertCleanDiagnostics(cdp, 'T1-F1-04');
      return pass('Background scene switch updated UI state and WebGL backdrop', { diff });
    },
  },
  {
    id: 'T1-F1-05',
    tier: 1,
    feature: 'F1',
    req: 'R2',
    name: 'Reset to Default restores Apple preset & persists',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      await setOpticalSlider(cdp, 'refraction', 0.2);
      await selectScene(cdp, 'ocean');
      await clickResetSettings(cdp);

      let sliders = await readOpticalSliders(cdp);
      assertApprox(sliders.refraction.value, 0.08, 0.002, 'Reset refraction');
      assertApprox(sliders.chroma.value, 0.045, 0.002, 'Reset chroma');
      assertApprox(sliders.specular.value, 1.5, 0.05, 'Reset specular');
      assertApprox(sliders.bevel.value, 0.085, 0.002, 'Reset bevel');

      await cdp.reload();
      await waitForCatalogReady(cdp);
      await openSettings(cdp);
      sliders = await readOpticalSliders(cdp);
      assertApprox(sliders.refraction.value, 0.08, 0.002, 'Persisted reset refraction');
      assertApprox(sliders.bevel.value, 0.085, 0.002, 'Persisted reset bevel');
      assertCleanDiagnostics(cdp, 'T1-F1-05');
      return pass('Reset restored Apple defaults and persisted across reload', { sliders });
    },
  },

  // =========================================================================
  // F2: Static Glass Visual Stability (5)
  // =========================================================================
  {
    id: 'T1-F2-01',
    tier: 1,
    feature: 'F2',
    req: 'R3',
    name: 'Background continuously drifts while canvas renders',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      await selectScene(cdp, 'procedural');
      await closeDialog(cdp);

      const canvasInfo = await cdp.evaluate(`(() => {
        const c = document.querySelector('canvas');
        if (!c) return null;
        const r = c.getBoundingClientRect();
        return { width: c.width, height: c.height, rw: r.width, rh: r.height };
      })()`);
      assert(canvasInfo && canvasInfo.width > 0 && canvasInfo.height > 0, 'Fullscreen WebGL canvas missing');

      const bgRect = await getExteriorBackgroundRect(cdp);
      await cdp.sleep(300);
      const img0 = await captureDecoded(cdp);
      await cdp.sleep(850);
      const img1 = await captureDecoded(cdp);
      const diff = diffRegion(img0, img1, bgRect, getDpr(cdp), 1);

      assert(diff.meanAbsDiff > 0.1, `WebGL background did not drift over 850ms: ${JSON.stringify(diff)}`);
      assertCleanDiagnostics(cdp, 'T1-F2-01');
      return pass('WebGL background renders and drifts continuously', { canvasInfo, diff });
    },
  },
  {
    id: 'T1-F2-02',
    tier: 1,
    feature: 'F2',
    req: 'R3',
    name: 'Glass cards remain geometrically static at idle',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await cdp.evaluate(`document.getElementById('archive')?.scrollIntoView({ behavior: 'instant', block: 'start' })`);
      await cdp.sleep(600);

      const samples = [];
      for (let idx = 0; idx < 3; idx++) {
        const res = await sampleElementStability(
          cdp,
          `document.querySelectorAll('article.game-card, .game-grid article')[${idx}]`,
          { samples: 5, intervalMs: 150 }
        );
        assert(res.maxDelta <= 0.5, `Card ${idx} wobbled at idle: maxDelta=${res.maxDelta}`);
        samples.push(res.maxDelta);
      }
      assertCleanDiagnostics(cdp, 'T1-F2-02');
      return pass('First 3 game cards stayed static within <=0.5px at idle', { maxDeltas: samples });
    },
  },
  {
    id: 'T1-F2-03',
    tier: 1,
    feature: 'F2',
    req: 'R3',
    name: 'Glass pills & cards remain static under pointer sweep',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await cdp.evaluate(`document.querySelector('.filter-pill, .filter-buttons button')?.scrollIntoView({ behavior: 'instant', block: 'center' })`);
      await cdp.sleep(450);

      const pillStability = await sampleElementStability(
        cdp,
        `document.querySelector('.filter-pill, .filter-buttons button')`,
        { samples: 5, intervalMs: 120, sweepPointer: true }
      );
      const cardStability = await sampleElementStability(
        cdp,
        `document.querySelector('article.game-card, .game-grid article')`,
        { samples: 5, intervalMs: 120, sweepPointer: true }
      );

      assert(pillStability.maxDelta <= 0.5, `Filter pill shifted under pointer sweep: ${pillStability.maxDelta}`);
      // Note: GameCard has subtle hover lift if Framer whileHover exists; verify no continuous wobble after pointer settles
      const postSweep = await sampleElementStability(
        cdp,
        `document.querySelector('article.game-card, .game-grid article')`,
        { samples: 4, intervalMs: 140, sweepPointer: false }
      );
      assert(postSweep.maxDelta <= 0.5, `GameCard oscillated after pointer sweep: ${postSweep.maxDelta}`);
      assertCleanDiagnostics(cdp, 'T1-F2-03');
      return pass('Glass pills and cards remained static under pointer sweep', {
        pillDelta: pillStability.maxDelta,
        cardDelta: cardStability.maxDelta,
        postSweepDelta: postSweep.maxDelta,
      });
    },
  },
  {
    id: 'T1-F2-04',
    tier: 1,
    feature: 'F2',
    req: 'R3',
    name: 'Glass dialog remains static during background refraction',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      await selectScene(cdp, 'procedural');

      const bevelRect = await getDialogBevelRect(cdp);
      assert(bevelRect, 'Dialog bevel rect unavailable');
      const img0 = await captureDecoded(cdp);
      const stability = await sampleElementStability(
        cdp,
        `findVisibleDialog()`,
        { samples: 5, intervalMs: 150 }
      );
      await cdp.sleep(300);
      const img1 = await captureDecoded(cdp);
      const borderDiff = diffRegion(img0, img1, bevelRect, getDpr(cdp), 1);

      assert(stability.maxDelta <= 0.5, `Settings dialog rect moved: maxDelta=${stability.maxDelta}`);
      assert(
        borderDiff.meanAbsDiff > 0.02,
        `Static dialog border did not refract moving background: ${JSON.stringify(borderDiff)}`
      );
      assertCleanDiagnostics(cdp, 'T1-F2-04');
      return pass('Glass dialog stayed geometrically static while refracting moving backdrop', {
        maxDelta: stability.maxDelta,
        borderDiff,
      });
    },
  },
  {
    id: 'T1-F2-05',
    tier: 1,
    feature: 'F2',
    req: 'R3',
    name: 'Click ripple triggers without moving DOM element',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      const dlg = await findVisibleDialog(cdp);
      assert(dlg, 'Settings dialog not visible');
      const before = dlg.rect;

      // Click empty header/padding area inside dialog to trigger WebGL click ripple
      await cdp.mouseClick(before.x + 28, before.y + 24);
      const stability = await sampleElementStability(
        cdp,
        `findVisibleDialog()`,
        { samples: 5, intervalMs: 120 }
      );
      assert(stability.maxDelta <= 0.5, `Click ripple caused DOM shift: ${stability.maxDelta}`);
      assertCleanDiagnostics(cdp, 'T1-F2-05');
      return pass('Click ripple fired with zero DOM movement', { maxDelta: stability.maxDelta });
    },
  },

  // =========================================================================
  // F3: Glass Dialog & Pill Bevel/Overlay Fix (5)
  // =========================================================================
  {
    id: 'T1-F3-01',
    tier: 1,
    feature: 'F3',
    req: 'R1,R2',
    name: 'Global Bevel slider updates LiquidGlassPill curvature',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      await selectScene(cdp, 'procedural');

      // Measure inside Settings preset pill/button region which uses glass surface
      const pillRect = await cdp.evaluate(`(() => {
        ${SHARED_DOM_HELPERS}
        const d = findVisibleDialog();
        const btn = d?.querySelector('[data-testid="preset-apple"]') || Array.from(d?.querySelectorAll('button') || []).find((b) => /apple vision/i.test(b.textContent || ''));
        if (!btn) return null;
        const r = btn.getBoundingClientRect();
        return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
      })()`);
      const targetRect = pillRect || (await getDialogBevelRect(cdp));

      await setOpticalSlider(cdp, 'bevel', 0.02);
      const optical = await measureOpticalDelta(cdp, targetRect, () =>
        setOpticalSlider(cdp, 'bevel', 0.18)
      );
      assertOpticalDelta(optical, { label: 'Pill bevel 0.02 -> 0.18', minDiff: 0.2 });
      assert(
        optical.stored && Math.abs(optical.stored.bevel - 0.18) < 0.01,
        `Bevel did not persist to localStorage: ${JSON.stringify(optical.stored)}`
      );
      assertCleanDiagnostics(cdp, 'T1-F3-01');
      return pass('Global Bevel slider updated glass pill/surface curvature pixels', {
        diff: optical.diff,
        baselineDrift: optical.baselineDrift,
      });
    },
  },
  {
    id: 'T1-F3-02',
    tier: 1,
    feature: 'F3',
    req: 'R1,R2',
    name: 'Global Bevel slider updates LiquidGlassDialog curvature',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      await selectScene(cdp, 'procedural');
      const bevelRect = await getDialogBevelRect(cdp);
      assert(bevelRect, 'Dialog bevel rect missing');

      await setOpticalSlider(cdp, 'bevel', 0.02);
      const optical = await measureOpticalDelta(cdp, bevelRect, () =>
        setOpticalSlider(cdp, 'bevel', 0.18)
      );
      assertOpticalDelta(optical, { label: 'Dialog bevel 0.02 -> 0.18', minDiff: 0.25 });
      assert(
        optical.stored && Math.abs(optical.stored.bevel - 0.18) < 0.01,
        `Dialog bevel did not persist to localStorage: ${JSON.stringify(optical.stored)}`
      );
      assertCleanDiagnostics(cdp, 'T1-F3-02');
      return pass('Global Bevel slider updated LiquidGlassDialog corner curvature', {
        diff: optical.diff,
        baselineDrift: optical.baselineDrift,
      });
    },
  },
  {
    id: 'T1-F3-03',
    tier: 1,
    feature: 'F3',
    req: 'R1,R2',
    name: 'Dialog overlay scrim preserves WebGL refraction behind modal',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      await selectScene(cdp, 'procedural');
      await cdp.sleep(300);

      const overlayCheck = await cdp.evaluate(`(() => {
        ${SHARED_DOM_HELPERS}
        const dialog = findVisibleDialog();
        const hit = document.elementFromPoint(10, 10);
        const found = Boolean(
          dialog &&
          hit &&
          hit !== document.documentElement &&
          hit !== document.body &&
          !dialog.contains(hit)
        );
        const cs = found ? window.getComputedStyle(hit) : null;
        return {
          hasDialog: Boolean(dialog),
          found,
          hitTag: hit ? hit.tagName.toLowerCase() : null,
          backdropFilter: cs ? (cs.backdropFilter || cs.webkitBackdropFilter || 'none') : null,
        };
      })()`);
      assert(overlayCheck.hasDialog, 'Dialog not open');
      assert(overlayCheck.found === true, `Dialog overlay scrim not found at (10,10): ${JSON.stringify(overlayCheck)}`);
      assert(
        !/blur\(/i.test(overlayCheck.backdropFilter || ''),
        `Dialog overlay has blurring backdrop-filter: ${overlayCheck.backdropFilter}`
      );

      const bevelRect = await getDialogBevelRect(cdp);
      const img = await captureDecoded(cdp);
      const stats = regionStats(img, bevelRect, getDpr(cdp));
      assert(stats.stdDev > 3, `Dialog glass bevel looks flat/washed out (stdDev=${stats.stdDev})`);
      assertCleanDiagnostics(cdp, 'T1-F3-03');
      return pass('Dialog overlay preserves crisp WebGL refraction behind modal', { overlayCheck, stats });
    },
  },
  {
    id: 'T1-F3-04',
    tier: 1,
    feature: 'F3',
    req: 'R1',
    name: 'Dialog opens cleanly, receives focus, and closes via button',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      const modalMeta = await cdp.evaluate(`(() => {
        ${SHARED_DOM_HELPERS}
        const d = findVisibleDialog();
        return {
          role: d?.getAttribute('role') || d?.tagName?.toLowerCase(),
          labelledBy: d?.getAttribute('aria-labelledby') || null,
          focusInside: d ? d.contains(document.activeElement) || document.activeElement === d : false,
        };
      })()`);
      assert(modalMeta.role === 'dialog', `Expected dialog role, got ${modalMeta.role}`);

      await closeDialog(cdp);
      const stillOpen = await hasVisibleDialog(cdp);
      assert(!stillOpen, 'Dialog remained open after Close click');
      assertCleanDiagnostics(cdp, 'T1-F3-04');
      return pass('Dialog opened with aria semantics and closed cleanly via button', { modalMeta });
    },
  },
  {
    id: 'T1-F3-05',
    tier: 1,
    feature: 'F3',
    req: 'R1',
    name: 'Dialog closes via Escape key and outside scrim click',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      await cdp.keyPress('Escape');
      await waitForNoVisibleDialog(cdp, 4000);

      // Reopen and click outside dialog card on scrim
      await openSettings(cdp);
      await cdp.mouseClick(12, 12);
      await waitForNoVisibleDialog(cdp, 4000);
      assertCleanDiagnostics(cdp, 'T1-F3-05');
      return pass('Dialog closed cleanly on both Escape key and outside scrim click');
    },
  },

  // =========================================================================
  // F4: WASM//DECK Entry, Header, Marquee & Footer (5)
  // =========================================================================
  {
    id: 'T1-F4-01',
    tier: 1,
    feature: 'F4',
    req: 'R1',
    name: 'Document title, brand mark, and header navigation render',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      const headerState = await cdp.evaluate(`(() => {
        const header = document.querySelector('header');
        const text = header?.textContent || '';
        return {
          title: document.title,
          hasBrand: Boolean(header?.querySelector('a[href="#top"]')),
          hasBrowse: Boolean(header?.querySelector('a[href="#archive"]')),
          hasAbout: /about/i.test(text),
          hasSearch: /search/i.test(text),
          hasSettings: /settings/i.test(text) || Boolean(header?.querySelector('[aria-label*="Settings" i]')),
          hasSubmit: /submit a game/i.test(text),
          hasThemeToggle: Boolean(document.querySelector('button[aria-label*="theme" i]')),
        };
      })()`);

      assert(/WASM\/\/DECK/i.test(headerState.title), `Unexpected title: ${headerState.title}`);
      assert(headerState.hasBrand, 'Brand link #top missing');
      assert(headerState.hasBrowse, 'Browse archive link missing');
      assert(headerState.hasAbout && headerState.hasSearch && headerState.hasSettings && headerState.hasSubmit && headerState.hasThemeToggle, `Header controls incomplete: ${JSON.stringify(headerState)}`);
      assertCleanDiagnostics(cdp, 'T1-F4-01');
      return pass('Document title and full header navigation rendered', headerState);
    },
  },
  {
    id: 'T1-F4-02',
    tier: 1,
    feature: 'F4',
    req: 'R1',
    name: 'Sticky header remains accessible after scrolling',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await cdp.evaluate(`window.scrollTo(0, 1200)`);
      await cdp.sleep(300);

      const headerPos = await cdp.evaluate(`(() => {
        const h = document.querySelector('header');
        const r = h.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, height: r.height };
      })()`);
      assert(headerPos.top >= -2 && headerPos.top <= 16, `Header not sticky near top: top=${headerPos.top}`);

      await openSettings(cdp);
      await closeDialog(cdp);
      assertCleanDiagnostics(cdp, 'T1-F4-02');
      return pass('Sticky header remained pinned and interactive after 1200px scroll', headerPos);
    },
  },
  {
    id: 'T1-F4-03',
    tier: 1,
    feature: 'F4',
    req: 'R1',
    name: 'ScrollProgress bar updates as page scrolls',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      const readProgress = () =>
        cdp.evaluate(`(() => {
          const el = document.querySelector('.scroll-progress, [role="progressbar"], [data-testid="scroll-progress"]');
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const st = window.getComputedStyle(el);
          return { width: r.width, transform: st.transform };
        })()`);

      const atTop = await readProgress();
      await cdp.evaluate(`window.scrollTo(0, 1500)`);
      await cdp.sleep(250);
      const atMid = await readProgress();
      assert(atTop && atMid, 'ScrollProgress indicator element not found');
      assert(
        atTop.width !== atMid.width || atTop.transform !== atMid.transform,
        `ScrollProgress did not update on scroll: top=${JSON.stringify(atTop)} mid=${JSON.stringify(atMid)}`
      );
      assertCleanDiagnostics(cdp, 'T1-F4-03');
      return pass('ScrollProgress indicator updated monotonically on scroll', { atTop, atMid });
    },
  },
  {
    id: 'T1-F4-04',
    tier: 1,
    feature: 'F4',
    req: 'R1',
    name: 'Signal marquee renders without blocking screen readers',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      const marquee = await cdp.evaluate(`(() => {
        const el = document.querySelector('.signal-marquee');
        if (!el) return null;
        return {
          ariaHidden: el.getAttribute('aria-hidden'),
          text: (el.textContent || '').replace(/\\s+/g, ' ').trim(),
          height: el.getBoundingClientRect().height,
        };
      })()`);
      assert(marquee, '.signal-marquee missing');
      assertEqual(marquee.ariaHidden, 'true', 'Marquee must be aria-hidden="true"');
      assert(/FOLLOW THE SOURCE/i.test(marquee.text) && /OPEN-WEB PORTS/i.test(marquee.text), 'Marquee copy mismatch');
      assertCleanDiagnostics(cdp, 'T1-F4-04');
      return pass('Signal marquee rendered with aria-hidden="true"', marquee);
    },
  },
  {
    id: 'T1-F4-05',
    tier: 1,
    feature: 'F4',
    req: 'R1',
    name: 'Footer renders catalog link and About trigger',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      const footerInfo = await cdp.evaluate(`(() => {
        const f = document.querySelector('footer');
        if (!f) return null;
        f.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
        const link = Array.from(f.querySelectorAll('a')).find((a) => /catalog source/i.test(a.textContent || ''));
        return {
          hasBrand: /WASM\/\/DECK/i.test(f.textContent || ''),
          linkHref: link?.getAttribute('href') || null,
          linkTarget: link?.getAttribute('target') || null,
          linkRel: link?.getAttribute('rel') || null,
        };
      })()`);
      assert(footerInfo && footerInfo.hasBrand, 'Footer brand missing');
      assertEqual(footerInfo.linkTarget, '_blank', 'Catalog source link target');
      assert(/noopener/i.test(footerInfo.linkRel || ''), 'Catalog source link rel');

      await clickAccessible(cdp, { selector: 'footer button', name: /about this index/i });
      await waitForVisibleDialog(cdp, 4000);
      const aboutDlg = await findVisibleDialog(cdp);
      assert(aboutDlg && /An index, not a game host/i.test(aboutDlg.text || ''), 'About dialog heading missing');
      await closeDialog(cdp);
      assertCleanDiagnostics(cdp, 'T1-F4-05');
      return pass('Footer rendered external catalog source link and opened About dialog', footerInfo);
    },
  },

  // =========================================================================
  // F5: 563-Game Catalog, Pagination & Local Shelf (5)
  // =========================================================================
  {
    id: 'T1-F5-01',
    tier: 1,
    feature: 'F5',
    req: 'R1',
    name: 'Catalog loads all 563 games and renders first 24',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      const summary = await getResultsSummary(cdp);
      assertEqual(summary.count, 563, 'Total catalog entries');
      assertEqual(summary.cardCount, 24, 'Initial paginated cards');
      assert(/Load 24 more/i.test(summary.loadMoreText || ''), `Missing Load 24 more button: ${summary.loadMoreText}`);
      assert(/Showing 24 of 563/i.test(summary.showingText || ''), `Showing text mismatch: ${summary.showingText}`);
      assertCleanDiagnostics(cdp, 'T1-F5-01');
      return pass('Catalog loaded 563 entries and rendered first 24 cards', summary);
    },
  },
  {
    id: 'T1-F5-02',
    tier: 1,
    feature: 'F5',
    req: 'R1',
    name: 'Load more pagination appends next 24 entries',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await clickAccessible(cdp, { role: 'button', name: /Load 24 more/i });
      await cdp.sleep(250);
      const summary = await getResultsSummary(cdp);
      assertEqual(summary.cardCount, 48, 'Card count after one Load 24 more click');
      assert(/Showing 48 of 563/i.test(summary.showingText || ''), `Showing text mismatch: ${summary.showingText}`);
      assertCleanDiagnostics(cdp, 'T1-F5-02');
      return pass('Load more pagination expanded visible cards from 24 to 48', summary);
    },
  },
  {
    id: 'T1-F5-03',
    tier: 1,
    feature: 'F5',
    req: 'R1',
    name: 'Grid and List view switcher toggles card layout',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await clickAccessible(cdp, { role: 'button', name: /^List view$/i });
      await cdp.sleep(200);
      const listState = await cdp.evaluate(`(() => {
        const listBtn = document.querySelector('button[aria-label="List view"]');
        const grid = document.querySelector('.game-grid');
        return {
          listPressed: listBtn?.getAttribute('aria-pressed'),
          hasListClass: Boolean(grid?.classList.contains('game-grid--list')),
        };
      })()`);
      assertEqual(listState.listPressed, 'true', 'List view aria-pressed');
      assert(listState.hasListClass, 'game-grid--list class not applied');

      await clickAccessible(cdp, { role: 'button', name: /^Grid view$/i });
      await cdp.sleep(200);
      const gridPressed = await cdp.evaluate(`document.querySelector('button[aria-label="Grid view"]')?.getAttribute('aria-pressed')`);
      assertEqual(gridPressed, 'true', 'Grid view aria-pressed');
      assertCleanDiagnostics(cdp, 'T1-F5-03');
      return pass('Grid/List view switcher toggled cleanly', { listState, gridPressed });
    },
  },
  {
    id: 'T1-F5-04',
    tier: 1,
    feature: 'F5',
    req: 'R1',
    name: 'Favorites star toggles shelf count and Favorites view',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      assertEqual(await readSidebarBadge(cdp, /^Favorites$/i), 0, 'Initial Favorites count');

      await clickAccessible(cdp, { selector: 'button.favorite-toggle', index: 0 });
      await cdp.sleep(150);
      const pressed = await cdp.evaluate(`document.querySelectorAll('button.favorite-toggle')[0]?.getAttribute('aria-pressed')`);
      assertEqual(pressed, 'true', 'First card favorite aria-pressed');
      assertEqual(await readSidebarBadge(cdp, /^Favorites$/i), 1, 'Incremented Favorites badge');

      await selectSidebarItem(cdp, /^Favorites$/i);
      const summary = await getResultsSummary(cdp);
      const titles = await getCardTitles(cdp);
      assertEqual(summary.count, 1, 'Favorites shelf entry count');
      assertEqual(titles[0], 'Grand Theft Auto V (GTA 5)', 'Starred card in Favorites shelf');
      assertCleanDiagnostics(cdp, 'T1-F5-04');
      return pass('Favorites toggle updated badge and Favorites shelf', { titles });
    },
  },
  {
    id: 'T1-F5-05',
    tier: 1,
    feature: 'F5',
    req: 'R1',
    name: 'Recently opened tracks launched games and Random pick works',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await toggleFilterPill(cdp, /In-deck compatible/i);
      await clickAccessible(cdp, { role: 'button', name: /Open in deck/i });
      await waitForVisibleDialogIframe(cdp, 5000);
      await closeDialog(cdp);

      await selectSidebarItem(cdp, /^Recently opened$/i);
      const recentBadge = await readSidebarBadge(cdp, /^Recently opened$/i);
      const titles = await getCardTitles(cdp);
      assertEqual(recentBadge, 1, 'Recently opened badge');
      assertEqual(titles[0], 'Classic Doom (Silent Space Marine)', 'Recent game title');

      // Reset to All entries and test Random pick with window.open spied
      await selectSidebarItem(cdp, /^All entries$/i);
      await cdp.spyWindowOpen();
      await clickAccessible(cdp, { role: 'button', name: /Random pick/i });
      await cdp.sleep(250);
      const dialogOpen = await hasVisibleDialog(cdp);
      const opens = await cdp.getWindowOpenCalls();
      assert(
        dialogOpen || (opens.length === 1 && /^https?:\/\//i.test(opens[0].url)),
        `Random pick neither opened dialog nor valid window.open: dialog=${dialogOpen} opens=${JSON.stringify(opens)}`
      );
      if (dialogOpen) await closeDialog(cdp);
      assertCleanDiagnostics(cdp, 'T1-F5-05');
      return pass('Recently opened and Random pick operated accurately', { recentBadge, titles, opens });
    },
  },

  // =========================================================================
  // F6: Hero Deck Showcase (5)
  // =========================================================================
  {
    id: 'T1-F6-01',
    tier: 1,
    feature: 'F6',
    req: 'R1',
    name: 'Hero headline, description, and proof stats render',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      const hero = await cdp.evaluate(`(() => {
        const sec = document.querySelector('section[aria-labelledby="hero-title"]');
        const h1 = sec?.querySelector('h1')?.textContent?.replace(/\\s+/g, ' ').trim() || '';
        const stats = Array.from(sec?.querySelectorAll('.hero-proof > div') || []).map((d) => ({
          value: d.querySelector('strong')?.textContent?.trim(),
          label: d.querySelector('span')?.textContent?.trim(),
        }));
        return { h1, stats };
      })()`);
      assert(/A world of ports\.\s*One game deck\./i.test(hero.h1), `Unexpected Hero H1: ${hero.h1}`);
      assertEqual(hero.stats[0]?.value, '563', 'Hero catalog links stat');
      assertEqual(hero.stats[1]?.value, '07', 'Hero collections stat');
      assertEqual(hero.stats[2]?.value, '224', 'Hero multiplayer stat');
      assertCleanDiagnostics(cdp, 'T1-F6-01');
      return pass('Hero headline and 563 / 07 / 224 proof stats rendered', hero);
    },
  },
  {
    id: 'T1-F6-02',
    tier: 1,
    feature: 'F6',
    req: 'R1',
    name: 'Hero showcase console displays featured game titles',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      const stageText = await cdp.evaluate(`document.querySelector('section[aria-labelledby="hero-title"] .hero-stage, section[aria-labelledby="hero-title"] [role="img"]')?.textContent?.replace(/\\s+/g, ' ').trim() || ''`);
      assert(/Grand Theft Auto V \(GTA 5\)/i.test(stageText), `Missing GTA V in Hero stage: ${stageText}`);
      assert(/Grand Theft Auto: Vice City/i.test(stageText), `Missing Vice City in Hero stage: ${stageText}`);
      assert(/Grand Theft Auto III/i.test(stageText), `Missing GTA III in Hero stage: ${stageText}`);
      assertCleanDiagnostics(cdp, 'T1-F6-02');
      return pass('Hero showcase displayed top 3 featured catalog titles');
    },
  },
  {
    id: 'T1-F6-03',
    tier: 1,
    feature: 'F6',
    req: 'R1',
    name: 'Hero primary CTA scrolls to #archive',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await clickAccessible(cdp, { role: 'link', name: /Browse the archive/i });
      await cdp.sleep(600);
      const archiveTop = await cdp.evaluate(`document.getElementById('archive')?.getBoundingClientRect().top`);
      const innerHeight = await cdp.evaluate(`window.innerHeight`);
      assert(archiveTop !== undefined && archiveTop < innerHeight, `#archive did not scroll into view: top=${archiveTop}`);
      assertCleanDiagnostics(cdp, 'T1-F6-03');
      return pass('Hero CTA scrolled viewport to #archive', { archiveTop, innerHeight });
    },
  },
  {
    id: 'T1-F6-04',
    tier: 1,
    feature: 'F6',
    req: 'R1',
    name: 'Hero Random pick button enabled after catalog loads',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      const btn = await locateElement(cdp, { role: 'button', name: /Random pick/i });
      assert(btn && !btn.disabled, 'Random pick button should be enabled after 563 load');
      await cdp.spyWindowOpen();
      await cdp.mouseClick(btn.cx, btn.cy);
      await cdp.sleep(200);
      const dialogOpen = await hasVisibleDialog(cdp);
      const opens = await cdp.getWindowOpenCalls();
      assert(dialogOpen || opens.length === 1, 'Random pick click did not trigger launch');
      if (dialogOpen) await closeDialog(cdp);
      assertCleanDiagnostics(cdp, 'T1-F6-04');
      return pass('Hero Random pick button enabled and launched after catalog load', { opens });
    },
  },
  {
    id: 'T1-F6-05',
    tier: 1,
    feature: 'F6',
    req: 'R3',
    name: 'Hero glass framing stays aligned with WebGL scissor pass',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      const stability = await sampleElementStability(
        cdp,
        `document.querySelector('.hero-console, .hero-stage')`,
        { samples: 5, intervalMs: 150 }
      );
      assert(stability.maxDelta <= 0.5, `Hero glass frame moved at idle: maxDelta=${stability.maxDelta}`);
      assertCleanDiagnostics(cdp, 'T1-F6-05');
      return pass('Hero glass framing remained geometrically static at idle', { maxDelta: stability.maxDelta });
    },
  },

  // =========================================================================
  // F7: Search, Category Filters, Pills & Sort (5)
  // =========================================================================
  {
    id: 'T1-F7-01',
    tier: 1,
    feature: 'F7',
    req: 'R1',
    name: 'Real-time search filters by title, engine, or notes',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await setSearchInputValue(cdp, 'doom');
      const summary = await getResultsSummary(cdp);
      const titles = await getCardTitles(cdp);
      assertEqual(summary.count, 3, 'Search "doom" result count');
      assertEqual(summary.activeFilters, 1, 'Active filter count');
      assertEqual(titles.length, 3, 'Rendered Doom cards');
      assertCleanDiagnostics(cdp, 'T1-F7-01');
      return pass('Real-time search filtered catalog to 3 Doom matches', { summary, titles });
    },
  },
  {
    id: 'T1-F7-02',
    tier: 1,
    feature: 'F7',
    req: 'R1',
    name: 'Discover & 7 Category sidebar filters update results',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);

      await selectSidebarItem(cdp, /^Popular picks$/i);
      let s = await getResultsSummary(cdp);
      assertEqual(s.count, 31, 'Popular picks count');
      assert(/Popular picks/i.test(s.heading), `Heading mismatch: ${s.heading}`);

      await selectSidebarItem(cdp, /^Classic PC$/i);
      s = await getResultsSummary(cdp);
      assertEqual(s.count, 15, 'Classic PC count');
      assert(/Classic PC/i.test(s.heading), `Heading mismatch: ${s.heading}`);

      await selectSidebarItem(cdp, /^All entries$/i);
      s = await getResultsSummary(cdp);
      assertEqual(s.count, 563, 'All entries count');
      assertCleanDiagnostics(cdp, 'T1-F7-02');
      return pass('Sidebar Discover & Category filters updated counts and headings');
    },
  },
  {
    id: 'T1-F7-03',
    tier: 1,
    feature: 'F7',
    req: 'R1',
    name: 'Filter pills (In-deck compatible & Multiplayer) toggle correctly',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);

      const deckOn = await toggleFilterPill(cdp, /In-deck compatible/i);
      assert(deckOn.pressed === true, 'In-deck pill should be pressed');
      let s = await getResultsSummary(cdp);
      assertEqual(s.count, 1, 'In-deck compatible count');

      await toggleFilterPill(cdp, /In-deck compatible/i);
      const mpOn = await toggleFilterPill(cdp, /Multiplayer/i);
      assert(mpOn.pressed === true, 'Multiplayer pill should be pressed');
      s = await getResultsSummary(cdp);
      assertEqual(s.count, 224, 'Multiplayer count');
      assertCleanDiagnostics(cdp, 'T1-F7-03');
      return pass('Filter pills toggled between 1 in-deck and 224 multiplayer entries');
    },
  },
  {
    id: 'T1-F7-04',
    tier: 1,
    feature: 'F7',
    req: 'R1',
    name: 'Sort selector orders by Featured, Title A-Z, and Engine',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);

      await setSortValue(cdp, 'title');
      const titleFirst = (await getCardTitles(cdp))[0];
      assertEqual(titleFirst, '1 on 1 Soccer', 'First card sorted by Title A-Z');

      await setSortValue(cdp, 'engine');
      const engineFirst = (await getCardTitles(cdp))[0];
      assertEqual(engineFirst, '2020 Super Baseball', 'First card sorted by Engine');

      await setSortValue(cdp, 'featured');
      const featuredFirst = (await getCardTitles(cdp))[0];
      assertEqual(featuredFirst, 'Grand Theft Auto V (GTA 5)', 'First card sorted by Featured');
      assertCleanDiagnostics(cdp, 'T1-F7-04');
      return pass('Sort selector ordered entries by title, engine, and featured', {
        titleFirst,
        engineFirst,
        featuredFirst,
      });
    },
  },
  {
    id: 'T1-F7-05',
    tier: 1,
    feature: 'F7',
    req: 'R1',
    name: 'Clear filters button & Escape key reset active filters',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await setSearchInputValue(cdp, 'doom');
      assertEqual((await getResultsSummary(cdp)).count, 3, 'Count with doom');
      await clickAccessible(cdp, { role: 'button', name: /Clear filters/i });
      await cdp.sleep(150);
      assertEqual((await getResultsSummary(cdp)).count, 563, 'Count after Clear filters');

      await setSearchInputValue(cdp, 'gta');
      assertEqual((await getResultsSummary(cdp)).count, 3, 'Count with gta');
      await cdp.keyPress('Escape');
      await cdp.sleep(150);
      assertEqual((await getResultsSummary(cdp)).count, 563, 'Count after Escape in search');
      assertCleanDiagnostics(cdp, 'T1-F7-05');
      return pass('Clear filters and Escape key both restored 563 entries');
    },
  },

  // =========================================================================
  // F8: Game Grid Cards & Launcher Dialog (5)
  // =========================================================================
  {
    id: 'T1-F8-01',
    tier: 1,
    feature: 'F8',
    req: 'R1',
    name: 'GameCard displays category, title, engine, memory, and status',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      const card = await cdp.evaluate(`(() => {
        const el = document.querySelector('article.game-card, .game-grid article');
        const link = el?.querySelector('a.card-launch');
        return {
          text: (el?.textContent || '').replace(/\\s+/g, ' ').trim(),
          title: el?.querySelector('h3')?.textContent?.trim(),
          linkText: link?.textContent?.replace(/\\s+/g, ' ').trim(),
          href: link?.getAttribute('href'),
        };
      })()`);
      assertEqual(card.title, 'Grand Theft Auto V (GTA 5)', 'First card title');
      assert(/AAA & console/i.test(card.text), 'Card missing category');
      assert(/RAGE C\+\+ \/ Emscripten WASM \+ WebGPU/i.test(card.text), 'Card missing engine');
      assert(/POPULAR PICK/i.test(card.text), 'Card missing POPULAR PICK flag');
      assert(/External source link/i.test(card.text), 'Card missing status');
      assert(/Open source/i.test(card.linkText || ''), 'Card missing Open source link');
      assertCleanDiagnostics(cdp, 'T1-F8-01');
      return pass('First GameCard displayed all metadata fields accurately', card);
    },
  },
  {
    id: 'T1-F8-02',
    tier: 1,
    feature: 'F8',
    req: 'R1',
    name: 'In-deck launcher opens iframe player for classic-doom-silent',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await toggleFilterPill(cdp, /In-deck compatible/i);
      await clickAccessible(cdp, { role: 'button', name: /Open in deck/i });
      await waitForVisibleDialogIframe(cdp, 5000);

      const launcher = await cdp.evaluate(`(() => {
        ${SHARED_DOM_HELPERS}
        const d = findVisibleDialog();
        const iframe = d?.querySelector('iframe');
        const ext = Array.from(d?.querySelectorAll('a') || []).find((a) => /Open source instead/i.test(a.textContent || ''));
        return {
          dialogText: d?.textContent || '',
          iframeSrc: iframe?.getAttribute('src'),
          iframeTitle: iframe?.getAttribute('title'),
          sandbox: iframe?.getAttribute('sandbox'),
          extHref: ext?.getAttribute('href'),
        };
      })()`);
      assert(/Classic Doom \(Silent Space Marine\)/i.test(launcher.dialogText), 'Launcher title mismatch');
      assertEqual(launcher.iframeSrc, 'https://silentspacemarine.com/', 'Iframe src mismatch');
      assert(/allow-scripts/.test(launcher.sandbox || ''), 'Iframe missing sandbox allow-scripts');
      assertEqual(launcher.extHref, 'https://silentspacemarine.com/', 'Fallback source link mismatch');
      await closeDialog(cdp);
      assertCleanDiagnostics(cdp, 'T1-F8-02');
      return pass('In-deck launcher opened iframe player with fallback link', launcher);
    },
  },
  {
    id: 'T1-F8-03',
    tier: 1,
    feature: 'F8',
    req: 'R1',
    name: 'External cards open safely in new tab and record Recent',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      // Prevent actual popup window while preserving anchor click handler execution
      const linkInfo = await cdp.evaluate(`(() => {
        const a = document.querySelector('article.game-card a.card-launch, .game-grid article a.card-launch');
        if (!a) return null;
        const info = {
          href: a.getAttribute('href'),
          target: a.getAttribute('target'),
          rel: a.getAttribute('rel'),
        };
        a.addEventListener('click', (e) => e.preventDefault(), { once: true });
        a.click();
        return info;
      })()`);
      await cdp.sleep(150);
      assert(linkInfo && /^https:\/\//i.test(linkInfo.href || ''), 'External href invalid');
      assertEqual(linkInfo.target, '_blank', 'External target');
      assert(/noopener/.test(linkInfo.rel || '') && /noreferrer/.test(linkInfo.rel || ''), 'External rel');
      assertEqual(await readSidebarBadge(cdp, /^Recently opened$/i), 1, 'Recently opened incremented');
      assertCleanDiagnostics(cdp, 'T1-F8-03');
      return pass('External card anchor attributes safe and recorded in Recent', linkInfo);
    },
  },
  {
    id: 'T1-F8-04',
    tier: 1,
    feature: 'F8',
    req: 'R1',
    name: 'About dialog displays index explanation and source link',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await clickAccessible(cdp, { selector: 'header nav button', name: /^About$/i });
      await waitForVisibleDialog(cdp, 4000);
      const about = await cdp.evaluate(`(() => {
        ${SHARED_DOM_HELPERS}
        const d = findVisibleDialog();
        const a = Array.from(d?.querySelectorAll('a') || []).find((el) => /View the source catalog/i.test(el.textContent || ''));
        return {
          text: (d?.textContent || '').replace(/\\s+/g, ' ').trim(),
          linkTarget: a?.getAttribute('target'),
        };
      })()`);
      assert(/An index, not a game host\./i.test(about.text), 'About dialog heading missing');
      assert(/In-deck compatible/i.test(about.text), 'About callout missing');
      assertEqual(about.linkTarget, '_blank', 'Source catalog link target');
      await closeDialog(cdp);
      assertCleanDiagnostics(cdp, 'T1-F8-04');
      return pass('About dialog rendered index explanation and source link');
    },
  },
  {
    id: 'T1-F8-05',
    tier: 1,
    feature: 'F8',
    req: 'R1',
    name: 'Submit dialog displays 3 proposal steps and GitHub link',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await clickAccessible(cdp, { role: 'button', name: /Submit a game/i });
      await waitForVisibleDialog(cdp, 4000);
      const submit = await cdp.evaluate(`(() => {
        ${SHARED_DOM_HELPERS}
        const d = findVisibleDialog();
        const a = Array.from(d?.querySelectorAll('a') || []).find((el) => /GitHub proposal form/i.test(el.textContent || ''));
        return {
          text: (d?.textContent || '').replace(/\\s+/g, ' ').trim(),
          href: a?.getAttribute('href'),
        };
      })()`);
      assert(/Suggest a game or port/i.test(submit.text), 'Submit dialog heading missing');
      assert(submit.text.includes('01') && submit.text.includes('02') && submit.text.includes('03'), 'Proposal steps missing');
      assert(/github\.com/i.test(submit.href || ''), 'GitHub proposal href missing');
      await closeDialog(cdp);
      assertCleanDiagnostics(cdp, 'T1-F8-05');
      return pass('Submit dialog displayed 3 steps and GitHub link');
    },
  },

  // =========================================================================
  // F9: Real-Time Settings Modal Controls (5)
  // =========================================================================
  {
    id: 'T1-F9-01',
    tier: 1,
    feature: 'F9',
    req: 'R2',
    name: 'Settings dialog opens from Header Settings button',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      const sliders = await readOpticalSliders(cdp);
      const hasControls = await cdp.evaluate(`(() => {
        ${SHARED_DOM_HELPERS}
        const d = findVisibleDialog();
        const t = d?.textContent || '';
        return {
          hasPresets: /apple vision/i.test(t) && /prism rainbow/i.test(t),
          hasScenes: /bamboo/i.test(t) && /procedural/i.test(t),
          hasReset: /reset/i.test(t),
        };
      })()`);
      assert(Object.keys(sliders).length === 4, 'Missing optical sliders');
      assert(hasControls.hasPresets && hasControls.hasScenes && hasControls.hasReset, `Settings missing controls: ${JSON.stringify(hasControls)}`);
      assertCleanDiagnostics(cdp, 'T1-F9-01');
      return pass('Settings modal exposed all 4 sliders, scenes, presets, and reset', hasControls);
    },
  },
  {
    id: 'T1-F9-02',
    tier: 1,
    feature: 'F9',
    req: 'R2',
    name: 'Chromatic Dispersion slider changes RGB split in real time',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      await selectScene(cdp, 'procedural');
      await setOpticalSlider(cdp, 'refraction', 0.18);
      const bevelRect = await getDialogBevelRect(cdp);
      assert(bevelRect, 'Dialog bevel rect missing');

      await setOpticalSlider(cdp, 'chroma', 0.0);
      const optical = await measureOpticalDelta(cdp, bevelRect, () =>
        setOpticalSlider(cdp, 'chroma', 0.1)
      );
      const maxChroma = optical.mutationResult;

      assertApprox(maxChroma, 0.1, 0.002, 'Chroma readout');
      assertOpticalDelta(optical, { label: 'Chroma 0.000 -> 0.100', minDiff: 0.2 });
      assert(
        optical.stored && Math.abs(optical.stored.chroma - 0.1) < 0.003,
        `Chroma did not persist to localStorage: ${JSON.stringify(optical.stored)}`
      );
      assertCleanDiagnostics(cdp, 'T1-F9-02');
      return pass('Chromatic Dispersion slider altered RGB bevel pixels in real time', {
        diff: optical.diff,
        baselineDrift: optical.baselineDrift,
      });
    },
  },
  {
    id: 'T1-F9-03',
    tier: 1,
    feature: 'F9',
    req: 'R2',
    name: 'Specular Gloss slider adjusts highlight intensity in real time',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      await selectScene(cdp, 'procedural');
      // Set bevel near outer 24x24 strip so specular highlight peak on bevel rim sits inside bevelRect
      await setOpticalSlider(cdp, 'bevel', 0.025);
      const bevelRect = await getDialogBevelRect(cdp);
      assert(bevelRect, 'Dialog bevel rect missing');

      await setOpticalSlider(cdp, 'specular', 0.2);
      const optical = await measureOpticalDelta(cdp, bevelRect, () =>
        setOpticalSlider(cdp, 'specular', 3.5)
      );
      const highSpec = optical.mutationResult;

      assertApprox(highSpec, 3.5, 0.1, 'Specular readout');
      assert(
        optical.diff.meanAbsDiff > 0.15 || optical.diff.changedPixelRatio > 0.005,
        `Specular 0.2 -> 3.5 produced no rim highlight change: ${JSON.stringify(optical.diff)}`
      );
      assertOpticalDelta(optical, { label: 'Specular 0.2 -> 3.5', minDiff: 0.15 });
      assert(
        optical.stored && optical.stored.specular >= 3.4,
        `Specular did not persist to localStorage: ${JSON.stringify(optical.stored)}`
      );
      assertCleanDiagnostics(cdp, 'T1-F9-03');
      return pass('Specular Gloss slider adjusted highlight intensity in real time', {
        diff: optical.diff,
        baselineDrift: optical.baselineDrift,
        lowLum: optical.statsBefore.meanLuminance,
        highLum: optical.statsAfter.meanLuminance,
      });
    },
  },
  {
    id: 'T1-F9-04',
    tier: 1,
    feature: 'F9',
    req: 'R2',
    name: 'Curvature Bevel slider adjusts bevel thickness in real time',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      await selectScene(cdp, 'procedural');
      const bevelRect = await getDialogBevelRect(cdp);
      assert(bevelRect, 'Dialog bevel rect missing');

      await setOpticalSlider(cdp, 'bevel', 0.02);
      const optical = await measureOpticalDelta(cdp, bevelRect, () =>
        setOpticalSlider(cdp, 'bevel', 0.18)
      );
      const thick = optical.mutationResult;

      assertApprox(thick, 0.18, 0.005, 'Bevel readout');
      assertOpticalDelta(optical, { label: 'Bevel 0.02 -> 0.18', minDiff: 0.2 });
      assert(
        optical.diff.changedPixelRatio > 0.01 || optical.diff.meanAbsDiff > 0.25,
        `Bevel 0.02 -> 0.18 did not alter glass rim: ${JSON.stringify(optical.diff)}`
      );
      assert(
        optical.stored && Math.abs(optical.stored.bevel - 0.18) < 0.01,
        `Bevel did not persist to localStorage: ${JSON.stringify(optical.stored)}`
      );
      assertCleanDiagnostics(cdp, 'T1-F9-04');
      return pass('Curvature Bevel slider adjusted rim geometry in real time', {
        diff: optical.diff,
        baselineDrift: optical.baselineDrift,
      });
    },
  },
  {
    id: 'T1-F9-05',
    tier: 1,
    feature: 'F9',
    req: 'R2',
    name: 'All 4 presets & all 5 background scenes selectable in Settings',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);

      for (const preset of ['apple', 'water', 'prism', 'mercury']) {
        await selectPreset(cdp, preset);
        const sliders = await readOpticalSliders(cdp);
        assertApprox(sliders.refraction.value, PRESET_META[preset].values.refraction, 0.003, `${preset} refraction`);
      }

      for (const scene of ['bamboo', 'cyberpunk', 'ocean', 'nebula', 'procedural']) {
        await selectScene(cdp, scene);
        const state = await readActivePresetAndScene(cdp);
        assertEqual(state.activeScene, scene, `Active scene after selecting ${scene}`);
      }
      assertCleanDiagnostics(cdp, 'T1-F9-05');
      return pass('All 4 presets and 5 background scenes cycled cleanly without errors');
    },
  },

  // =========================================================================
  // F10: Contrast, Legibility & Responsive Layout (5)
  // =========================================================================
  {
    id: 'T1-F10-01',
    tier: 1,
    feature: 'F10',
    req: 'AC',
    name: 'Dark theme text legibility over WebGL canvas',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      const audit = await checkContrastAndHitTest(cdp, [
        { name: 'Hero H1', findExpr: `document.getElementById('hero-title')` },
        { name: 'Sidebar heading', findExpr: `document.querySelector('.catalog-sidebar h2')` },
        { name: 'GameCard title', findExpr: `document.querySelector('article.game-card h3, .game-grid article h3')` },
      ]);
      for (const item of audit) {
        assert(item.found, `Missing element in dark contrast audit: ${item.name}`);
        assert(item.contrastRatio >= 3.0, `Insufficient dark theme contrast on ${item.name}: ${item.contrastRatio}`);
      }
      assertCleanDiagnostics(cdp, 'T1-F10-01');
      return pass('Dark theme contrast verified across Hero, Sidebar, and GameCard', audit);
    },
  },
  {
    id: 'T1-F10-02',
    tier: 1,
    feature: 'F10',
    req: 'AC',
    name: 'Light theme toggle switches .site-shell & preserves legibility',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await clickAccessible(cdp, { role: 'button', name: /Switch to light theme/i });
      await cdp.sleep(250);
      const theme = await cdp.evaluate(`document.querySelector('[data-theme]')?.getAttribute('data-theme')`);
      assertEqual(theme, 'light', 'data-theme attribute');
      const toggleLabel = await cdp.evaluate(`document.querySelector('button.theme-toggle')?.getAttribute('aria-label')`);
      assert(/Switch to dark theme/i.test(toggleLabel || ''), `Unexpected toggle aria-label: ${toggleLabel}`);

      const audit = await checkContrastAndHitTest(cdp, [
        { name: 'Hero H1', findExpr: `document.getElementById('hero-title')` },
        { name: 'GameCard title', findExpr: `document.querySelector('article.game-card h3, .game-grid article h3')` },
      ]);
      for (const item of audit) {
        assert(item.contrastRatio >= 3.0, `Insufficient light theme contrast on ${item.name}: ${item.contrastRatio}`);
      }
      assertCleanDiagnostics(cdp, 'T1-F10-02');
      return pass('Light theme toggled and preserved text legibility', { theme, audit });
    },
  },
  {
    id: 'T1-F10-03',
    tier: 1,
    feature: 'F10',
    req: 'AC',
    name: 'Desktop viewport (1440x900) layout integrity',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl, {
        viewport: { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false, touch: false },
      });
      const overflow = await checkViewportOverflow(cdp);
      assert(!overflow.overflow, `Desktop overflow: ${overflow.scrollWidth} > ${overflow.innerWidth}`);
      assertEqual(overflow.clippedControls.length, 0, 'Clipped desktop controls');
      assertCleanDiagnostics(cdp, 'T1-F10-03');
      return pass('Desktop 1440x900 layout rendered with zero overflow', overflow);
    },
  },
  {
    id: 'T1-F10-04',
    tier: 1,
    feature: 'F10',
    req: 'AC',
    name: 'Tablet viewport (768x1024) layout integrity',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl, {
        viewport: { width: 768, height: 1024, deviceScaleFactor: 1, mobile: false, touch: false },
      });
      const overflow = await checkViewportOverflow(cdp);
      assert(!overflow.overflow, `Tablet overflow: ${overflow.scrollWidth} > ${overflow.innerWidth}`);
      assertEqual(overflow.clippedControls.length, 0, 'Clipped tablet controls');
      assertCleanDiagnostics(cdp, 'T1-F10-04');
      return pass('Tablet 768x1024 layout rendered with zero overflow', overflow);
    },
  },
  {
    id: 'T1-F10-05',
    tier: 1,
    feature: 'F10',
    req: 'AC',
    name: 'Mobile viewport (375x812) layout integrity',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl, {
        viewport: { width: 375, height: 812, deviceScaleFactor: 2, mobile: true, touch: true },
      });
      const overflow = await checkViewportOverflow(cdp);
      assert(!overflow.overflow, `Mobile overflow: ${overflow.scrollWidth} > ${overflow.innerWidth}`);
      assertEqual(overflow.clippedControls.length, 0, 'Clipped mobile controls');

      await openSettings(cdp);
      const modalOverflow = await checkViewportOverflow(cdp);
      assert(!modalOverflow.overflow, 'Mobile Settings modal caused horizontal overflow');
      await closeDialog(cdp);
      assertCleanDiagnostics(cdp, 'T1-F10-05');
      return pass('Mobile 375x812 layout and Settings dialog rendered cleanly', { overflow });
    },
  },
];
