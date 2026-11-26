import {
  SHARED_DOM_HELPERS,
  assert,
  assertApprox,
  assertCleanDiagnostics,
  assertEqual,
  captureDecoded,
  checkContrastAndHitTest,
  checkViewportOverflow,
  clickAccessible,
  clickResetSettings,
  closeDialog,
  findVisibleDialog,
  getCardTitles,
  getDialogBevelRect,
  getDpr,
  getResultsSummary,
  hasVisibleDialog,
  locateElement,
  openSettings,
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
  toggleFilterPill,
  waitForCatalogReady,
  waitForVisibleDialog,
  waitForVisibleDialogIframe,
} from './helpers.mjs';

function pass(details, metrics = {}, artifacts = []) {
  return { status: 'passed', details, metrics, artifacts };
}

export const tier2Tests = [
  // =========================================================================
  // F1 Boundaries (5)
  // =========================================================================
  {
    id: 'T2-F1-01',
    tier: 2,
    feature: 'F1',
    req: 'R2',
    name: 'Refraction (IOR) exact min (0.00) & max (0.22) bounds',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      await selectScene(cdp, 'procedural');
      const sliders = await readOpticalSliders(cdp);
      assertApprox(sliders.refraction.min, 0.0, 1e-4, 'Refraction min');
      assertApprox(sliders.refraction.max, 0.22, 1e-4, 'Refraction max');
      assertApprox(sliders.refraction.step, 0.005, 1e-4, 'Refraction step');

      const minVal = await setOpticalSlider(cdp, 'refraction', -1.0);
      assertApprox(minVal, 0.0, 1e-4, 'Clamped refraction min');
      await cdp.keyPress('ArrowRight');
      await cdp.sleep(50);
      const steppedRef = (await readOpticalSliders(cdp)).refraction.value;
      assertApprox(steppedRef - minVal, 0.005, 1e-4, 'Refraction ArrowRight runtime step');
      const maxVal = await setOpticalSlider(cdp, 'refraction', 9.9);
      assertApprox(maxVal, 0.22, 1e-4, 'Clamped refraction max');
      const bevelRect = await getDialogBevelRect(cdp);
      const stats = regionStats(await captureDecoded(cdp), bevelRect, getDpr(cdp));
      assert(stats.meanLuminance > 1, 'Canvas rendered black/NaN at max refraction');
      assertCleanDiagnostics(cdp, 'T2-F1-01');
      return pass('Refraction slider bounds [0.00, 0.22] step 0.005 verified', { minVal, maxVal, stats });
    },
  },
  {
    id: 'T2-F1-02',
    tier: 2,
    feature: 'F1',
    req: 'R2',
    name: 'Chromatic Dispersion exact min (0.000) & max (0.100) bounds',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      const sliders = await readOpticalSliders(cdp);
      assertApprox(sliders.chroma.min, 0.0, 1e-4, 'Chroma min');
      assertApprox(sliders.chroma.max, 0.1, 1e-4, 'Chroma max');
      assertApprox(sliders.chroma.step, 0.002, 1e-4, 'Chroma step');

      const minVal = await setOpticalSlider(cdp, 'chroma', -0.5);
      assertApprox(minVal, 0.0, 1e-4, 'Clamped chroma min');
      await cdp.keyPress('ArrowRight');
      await cdp.sleep(50);
      const steppedChroma = (await readOpticalSliders(cdp)).chroma.value;
      assertApprox(steppedChroma - minVal, 0.002, 5e-4, 'Chroma ArrowRight runtime step');
      const maxVal = await setOpticalSlider(cdp, 'chroma', 0.9);
      assertApprox(maxVal, 0.1, 1e-4, 'Clamped chroma max');
      assertCleanDiagnostics(cdp, 'T2-F1-02');
      return pass('Chroma slider bounds [0.000, 0.100] step 0.002 verified', { minVal, steppedChroma, maxVal });
    },
  },
  {
    id: 'T2-F1-03',
    tier: 2,
    feature: 'F1',
    req: 'R2',
    name: 'Specular Gloss exact min (0.2) & max (3.5) bounds',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      const sliders = await readOpticalSliders(cdp);
      assertApprox(sliders.specular.min, 0.2, 1e-3, 'Specular min');
      assertApprox(sliders.specular.max, 3.5, 1e-3, 'Specular max');
      assertApprox(sliders.specular.step, 0.1, 1e-3, 'Specular step');

      const minVal = await setOpticalSlider(cdp, 'specular', 0.0);
      assertApprox(minVal, 0.2, 0.05, 'Clamped specular min');
      await cdp.keyPress('ArrowRight');
      await cdp.sleep(50);
      const steppedSpec = (await readOpticalSliders(cdp)).specular.value;
      assertApprox(steppedSpec - minVal, 0.1, 0.02, 'Specular ArrowRight runtime step');
      const maxVal = await setOpticalSlider(cdp, 'specular', 10.0);
      assertApprox(maxVal, 3.5, 0.05, 'Clamped specular max');
      assertCleanDiagnostics(cdp, 'T2-F1-03');
      return pass('Specular slider bounds [0.2, 3.5] step 0.1 verified', { minVal, steppedSpec, maxVal });
    },
  },
  {
    id: 'T2-F1-04',
    tier: 2,
    feature: 'F1',
    req: 'R2',
    name: 'Curvature Bevel exact min (0.02) & max (0.18) bounds',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      const sliders = await readOpticalSliders(cdp);
      assertApprox(sliders.bevel.min, 0.02, 1e-4, 'Bevel min');
      assertApprox(sliders.bevel.max, 0.18, 1e-4, 'Bevel max');
      assertApprox(sliders.bevel.step, 0.005, 1e-4, 'Bevel step');

      const minVal = await setOpticalSlider(cdp, 'bevel', 0.0);
      assertApprox(minVal, 0.02, 1e-3, 'Clamped bevel min');
      await cdp.keyPress('ArrowRight');
      await cdp.sleep(50);
      const steppedBevel = (await readOpticalSliders(cdp)).bevel.value;
      assertApprox(steppedBevel - minVal, 0.005, 1e-3, 'Bevel ArrowRight runtime step');
      const maxVal = await setOpticalSlider(cdp, 'bevel', 1.0);
      assertApprox(maxVal, 0.18, 1e-3, 'Clamped bevel max');
      assertCleanDiagnostics(cdp, 'T2-F1-04');
      return pass('Bevel slider bounds [0.02, 0.18] step 0.005 verified', { minVal, steppedBevel, maxVal });
    },
  },
  {
    id: 'T2-F1-05',
    tier: 2,
    feature: 'F1',
    req: 'R2',
    name: 'Corrupted localStorage["wasmdeck:glass-settings"] resilience',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await cdp.evaluate(`localStorage.setItem('wasmdeck:glass-settings', '{broken-json!!!')`);
      await cdp.reload();
      await waitForCatalogReady(cdp);
      await openSettings(cdp);
      let sliders = await readOpticalSliders(cdp);
      assertApprox(sliders.refraction.value, 0.08, 0.003, 'Fallback refraction on invalid JSON');
      assertApprox(sliders.bevel.value, 0.085, 0.003, 'Fallback bevel on invalid JSON');

      // Also verify out-of-range numeric values clamp cleanly
      await cdp.evaluate(`localStorage.setItem('wasmdeck:glass-settings', JSON.stringify({ refraction: 999, chroma: -2, specular: 99, bevel: -5 }))`);
      await cdp.reload();
      await waitForCatalogReady(cdp);
      await openSettings(cdp);
      sliders = await readOpticalSliders(cdp);
      assert(sliders.refraction.value >= 0 && sliders.refraction.value <= 0.22, 'Out-of-range refraction not clamped');
      assert(sliders.bevel.value >= 0.02 && sliders.bevel.value <= 0.18, 'Out-of-range bevel not clamped');
      assertCleanDiagnostics(cdp, 'T2-F1-05');
      return pass('Corrupted and out-of-range glass settings recovered cleanly', sliders);
    },
  },

  // =========================================================================
  // F2 Boundaries (5)
  // =========================================================================
  {
    id: 'T2-F2-01',
    tier: 2,
    feature: 'F2',
    req: 'R3',
    name: 'Rapid continuous scroll stability (zero glass jiggle)',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      for (const y of [400, 900, 1500, 2000]) {
        await cdp.evaluate(`window.scrollTo(0, ${y})`);
        await cdp.sleep(50);
      }
      await cdp.sleep(450);
      const stability = await sampleElementStability(
        cdp,
        `Array.from(document.querySelectorAll('article.game-card, .game-grid article')).find((el) => { const r = el.getBoundingClientRect(); return r.top > 80 && r.bottom < window.innerHeight; })`,
        { samples: 5, intervalMs: 120 }
      );
      assert(stability.maxDelta <= 0.5, `Card jiggled after scroll: maxDelta=${stability.maxDelta}`);
      assertCleanDiagnostics(cdp, 'T2-F2-01');
      return pass('Visible glass card stayed static immediately after rapid scroll', { maxDelta: stability.maxDelta });
    },
  },
  {
    id: 'T2-F2-02',
    tier: 2,
    feature: 'F2',
    req: 'R3',
    name: 'prefers-reduced-motion: reduce emulation stability',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await cdp.setPrefersReducedMotion(true);
      await cdp.reload();
      await waitForCatalogReady(cdp);

      const stability = await sampleElementStability(
        cdp,
        `document.querySelector('.hero-console, .hero-stage')`,
        { samples: 5, intervalMs: 120 }
      );
      assert(stability.maxDelta <= 0.5, `Hero moved under reduced motion: ${stability.maxDelta}`);
      const animDur = await cdp.evaluate(`window.getComputedStyle(document.querySelector('.signal-marquee-track') || document.body).animationDuration`);
      assertCleanDiagnostics(cdp, 'T2-F2-02');
      return pass('App rendered cleanly under prefers-reduced-motion: reduce', {
        maxDelta: stability.maxDelta,
        animDur,
      });
    },
  },
  {
    id: 'T2-F2-03',
    tier: 2,
    feature: 'F2',
    req: 'R3',
    name: 'Window resize (1440x900 -> 375x812 -> 1280x720) sync',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      const dims = [];
      for (const vp of [
        { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false, touch: false },
        { width: 375, height: 812, deviceScaleFactor: 2, mobile: true, touch: true },
        { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false, touch: false },
      ]) {
        await cdp.setViewport(vp);
        await cdp.sleep(250);
        const c = await cdp.evaluate(`(() => {
          const cv = document.querySelector('canvas');
          return cv ? { w: cv.width, h: cv.height, cw: cv.clientWidth, ch: cv.clientHeight } : null;
        })()`);
        assert(c && c.w > 0 && c.h > 0, `Canvas invalid at ${vp.width}x${vp.height}`);
        assert(Math.abs(c.cw - vp.width) <= 2, `Canvas clientWidth ${c.cw} != viewport ${vp.width}`);
        dims.push({ vp: `${vp.width}x${vp.height}`, canvas: c });
      }
      assertCleanDiagnostics(cdp, 'T2-F2-03');
      return pass('WebGL canvas resized cleanly across desktop and mobile breakpoints', dims);
    },
  },
  {
    id: 'T2-F2-04',
    tier: 2,
    feature: 'F2',
    req: 'R3',
    name: 'Rapid preset switching (apple -> mercury -> prism -> water)',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      for (const p of ['apple', 'mercury', 'prism', 'water']) {
        await clickAccessible(cdp, { withinDialog: true, role: 'button', name: new RegExp(p === 'mercury' ? 'heavy liquid|mercury' : p, 'i') });
      }
      await cdp.sleep(250);
      const sliders = await readOpticalSliders(cdp);
      assertApprox(sliders.refraction.value, 0.12, 0.003, 'Water refraction');
      assertApprox(sliders.chroma.value, 0.03, 0.002, 'Water chroma');
      assertApprox(sliders.specular.value, 2.0, 0.05, 'Water specular');
      assertApprox(sliders.bevel.value, 0.09, 0.003, 'Water bevel');
      assertCleanDiagnostics(cdp, 'T2-F2-04');
      return pass('Rapid preset switching settled cleanly on Water Ripple', sliders);
    },
  },
  {
    id: 'T2-F2-05',
    tier: 2,
    feature: 'F2',
    req: 'R3',
    name: 'External scene image network failure falls back to procedural',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await cdp.interceptRoutes([
        { match: /images\.unsplash\.com/, abort: true },
      ]);
      await openSettings(cdp);
      await selectScene(cdp, 'cyberpunk');
      await cdp.sleep(500);

      const bevelRect = await getDialogBevelRect(cdp);
      const stats = regionStats(await captureDecoded(cdp), bevelRect, getDpr(cdp));
      assert(stats.meanLuminance > 1 && stats.stdDev > 1, 'Canvas blanked after Unsplash failure');
      assertEqual(cdp.pageErrors.length, 0, 'Uncaught page errors on Unsplash failure');
      assertEqual(cdp.localHttpFailures.length, 0, 'Local HTTP failures');
      await cdp.clearInterceptions();
      return pass('Engine fell back gracefully to procedural caustics on Unsplash failure', stats);
    },
  },

  // =========================================================================
  // F3 Boundaries (5)
  // =========================================================================
  {
    id: 'T2-F3-01',
    tier: 2,
    feature: 'F3',
    req: 'R1,R2',
    name: 'Rapid dialog open/close stress cycle (10x)',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      for (let i = 0; i < 10; i++) {
        await openSettings(cdp);
        await closeDialog(cdp);
      }
      const leftover = await cdp.evaluate(`(() => {
        ${SHARED_DOM_HELPERS}
        return {
          dialogs: countVisibleDialogs(),
          bodyPE: window.getComputedStyle(document.body).pointerEvents,
        };
      })()`);
      assertEqual(leftover.dialogs, 0, 'Orphaned dialogs after 10x cycle');
      assert(leftover.bodyPE !== 'none', 'Body stuck with pointer-events: none');
      assertCleanDiagnostics(cdp, 'T2-F3-01');
      return pass('10x rapid Settings dialog open/close cycle left clean DOM', leftover);
    },
  },
  {
    id: 'T2-F3-02',
    tier: 2,
    feature: 'F3',
    req: 'R1,R2',
    name: 'Dialog on mobile viewport (375x812) with max Bevel 0.18',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl, {
        viewport: { width: 375, height: 812, deviceScaleFactor: 2, mobile: true, touch: true },
      });
      await openSettings(cdp);
      await setOpticalSlider(cdp, 'bevel', 0.18);
      const dlg = await findVisibleDialog(cdp);
      assert(dlg, 'Mobile Settings dialog not visible');
      const bounds = { ...dlg.rect, vw: 375, vh: 812 };
      assert(bounds.right <= 376 && bounds.left >= -1, `Mobile dialog overflowed 375px width: ${JSON.stringify(bounds)}`);
      const overflow = await checkViewportOverflow(cdp);
      assert(!overflow.overflow, 'Mobile Settings dialog caused horizontal scroll');
      await closeDialog(cdp);
      assertCleanDiagnostics(cdp, 'T2-F3-02');
      return pass('Mobile Settings dialog fit within 375px viewport at max Bevel 0.18', bounds);
    },
  },
  {
    id: 'T2-F3-03',
    tier: 2,
    feature: 'F3',
    req: 'R1,R2',
    name: 'Switching dialogs sequentially leaves clean WebGL z-order',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await clickAccessible(cdp, { selector: 'header nav button', name: /^About$/i });
      await waitForVisibleDialog(cdp, 4000);
      await closeDialog(cdp);

      await openSettings(cdp);
      await closeDialog(cdp);

      await toggleFilterPill(cdp, /In-deck compatible/i);
      await clickAccessible(cdp, { role: 'button', name: /Open in deck/i });
      await waitForVisibleDialogIframe(cdp, 4000);
      await closeDialog(cdp);

      const remaining = await cdp.evaluate(`(() => {
        ${SHARED_DOM_HELPERS}
        return countVisibleDialogs();
      })()`);
      assertEqual(remaining, 0, 'Remaining open dialogs');
      assertCleanDiagnostics(cdp, 'T2-F3-03');
      return pass('Sequential About -> Settings -> Doom launcher switching stayed clean');
    },
  },
  {
    id: 'T2-F3-04',
    tier: 2,
    feature: 'F3',
    req: 'R1,R2',
    name: 'Pill bevel on small/narrow pills at max Bevel 0.18',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      await selectScene(cdp, 'procedural');
      await setOpticalSlider(cdp, 'bevel', 0.18);
      await closeDialog(cdp);

      const pillRect = await cdp.evaluate(`(() => {
        const p = document.querySelector('.filter-pill, .filter-buttons button');
        if (!p) return null;
        p.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
        const r = p.getBoundingClientRect();
        return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
      })()`);
      assert(pillRect, 'Filter pill not found');
      await cdp.sleep(250);
      const stats = regionStats(await captureDecoded(cdp), pillRect, getDpr(cdp));
      assert(stats.meanLuminance > 1 && stats.stdDev > 1, 'Narrow pill failed to render cleanly at max bevel');
      assertCleanDiagnostics(cdp, 'T2-F3-04');
      return pass('Narrow pill rendered cleanly at max bevel 0.18', stats);
    },
  },
  {
    id: 'T2-F3-05',
    tier: 2,
    feature: 'F3',
    req: 'R1',
    name: 'Keyboard Tab navigation inside open Settings dialog',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      for (let i = 0; i < 8; i++) {
        await cdp.keyPress('Tab');
        await cdp.sleep(30);
        const inside = await cdp.evaluate(`(() => {
          ${SHARED_DOM_HELPERS}
          const d = findVisibleDialog();
          return Boolean(d && (d.contains(document.activeElement) || document.activeElement === d));
        })()`);
        assert(inside, `Tab step ${i + 1} escaped open Settings dialog`);
      }
      await closeDialog(cdp);
      assertCleanDiagnostics(cdp, 'T2-F3-05');
      return pass('Keyboard Tab focus stayed trapped inside open Settings dialog across 8 steps');
    },
  },

  // =========================================================================
  // F4 Boundaries (5)
  // =========================================================================
  {
    id: 'T2-F4-01',
    tier: 2,
    feature: 'F4',
    req: 'R1',
    name: 'Skip-to-catalog accessibility link works on keyboard Tab',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await cdp.keyPress('Tab');
      await cdp.sleep(80);
      const skipFocused = await cdp.evaluate(`(() => {
        const el = document.activeElement;
        return {
          text: el?.textContent?.trim() || '',
          href: el?.getAttribute('href') || '',
        };
      })()`);
      assert(/Skip to the catalog/i.test(skipFocused.text), `First Tab did not focus skip link: ${JSON.stringify(skipFocused)}`);
      await cdp.keyPress('Enter');
      await cdp.sleep(250);
      const hash = await cdp.evaluate(`window.location.hash`);
      assertEqual(hash, '#archive', 'URL hash after activating skip link');
      assertCleanDiagnostics(cdp, 'T2-F4-01');
      return pass('Skip-to-catalog link focused on Tab and navigated to #archive', skipFocused);
    },
  },
  {
    id: 'T2-F4-02',
    tier: 2,
    feature: 'F4',
    req: 'R1',
    name: 'All 5 Background Scenes render cleanly behind sticky Header',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      for (const scene of ['bamboo', 'cyberpunk', 'ocean', 'nebula', 'procedural']) {
        await openSettings(cdp);
        await selectScene(cdp, scene);
        await closeDialog(cdp);
        const hdr = await cdp.evaluate(`(() => {
          const h = document.querySelector('header');
          const r = h.getBoundingClientRect();
          return { height: r.height, visible: r.width > 0 && r.height > 0 };
        })()`);
        assert(hdr.visible, `Header invisible over ${scene}`);
      }
      assertCleanDiagnostics(cdp, 'T2-F4-02');
      return pass('Sticky Header stayed visible across all 5 background scenes');
    },
  },
  {
    id: 'T2-F4-03',
    tier: 2,
    feature: 'F4',
    req: 'R1',
    name: 'Narrow 320px minimum body width check',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl, {
        viewport: { width: 320, height: 568, deviceScaleFactor: 1, mobile: true, touch: true },
      });
      const overflow = await checkViewportOverflow(cdp);
      assert(!overflow.overflow, `320px viewport overflowed: ${overflow.scrollWidth} > 320`);
      const headerOk = await cdp.evaluate(`(() => {
        const h = document.querySelector('header');
        const brand = h?.querySelector('.brand-home')?.getBoundingClientRect();
        const actions = h?.querySelector('.top-actions')?.getBoundingClientRect();
        return { brandRight: brand?.right, actionsLeft: actions?.left, headerRight: h?.getBoundingClientRect().right };
      })()`);
      assert(headerOk.headerRight <= 321, `Header exceeded 320px: ${JSON.stringify(headerOk)}`);
      assertCleanDiagnostics(cdp, 'T2-F4-03');
      return pass('Narrow 320px layout rendered cleanly without header wrapping off-screen', headerOk);
    },
  },
  {
    id: 'T2-F4-04',
    tier: 2,
    feature: 'F4',
    req: 'R1',
    name: 'Favicon & root metadata integrity',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      const meta = await cdp.evaluate(`(() => {
        const icon = document.querySelector('link[rel="icon"]')?.getAttribute('href') || '';
        const desc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
        return { title: document.title, icon, desc };
      })()`);
      assert(/WASM\/\/DECK/i.test(meta.title), `Title mismatch: ${meta.title}`);
      assert(/deck-mark\.svg/i.test(meta.icon), `Favicon href mismatch: ${meta.icon}`);
      const iconRes = await fetch(`${baseUrl}${meta.icon.startsWith('/') ? '' : '/'}${meta.icon}`);
      assertEqual(iconRes.status, 200, 'Favicon HTTP status');
      assertCleanDiagnostics(cdp, 'T2-F4-04');
      return pass('Favicon HTTP 200 and WASM//DECK metadata verified', meta);
    },
  },
  {
    id: 'T2-F4-05',
    tier: 2,
    feature: 'F4',
    req: 'R1',
    name: '/404 unknown route fallback renders NotFound cleanly',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl, { waitCatalog: false });
      await cdp.navigate(`${baseUrl}/nonexistent-route-e2e`);
      await cdp.sleep(300);
      const bodyText = await cdp.evaluate(`(document.body.textContent || '').trim()`);
      assert(bodyText.length > 0, 'NotFound route rendered empty page');
      assertEqual(cdp.pageErrors.length, 0, 'Page errors on unknown route');
      assertEqual(cdp.consoleErrors.length, 0, 'Console errors on unknown route');
      return pass('Unknown route rendered fallback cleanly without JS errors', { sample: bodyText.slice(0, 80) });
    },
  },

  // =========================================================================
  // F5 Boundaries (5)
  // =========================================================================
  {
    id: 'T2-F5-01',
    tier: 2,
    feature: 'F5',
    req: 'R1',
    name: 'Exact 563 total catalog count & final page remainder (11)',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      // Click Load more 23 times (24 * 23 = 552, leaving 11 for the final click)
      for (let i = 0; i < 22; i++) {
        await cdp.evaluate(`document.querySelector('button.load-more')?.click()`);
      }
      await cdp.sleep(200);
      const beforeFinal = await getResultsSummary(cdp);
      assertEqual(beforeFinal.cardCount, 552, 'Card count before final Load 11 more');
      assert(/Load 11 more/i.test(beforeFinal.loadMoreText || ''), `Expected "Load 11 more", got ${beforeFinal.loadMoreText}`);

      await cdp.evaluate(`document.querySelector('button.load-more')?.click()`);
      await cdp.sleep(250);
      const afterFinal = await getResultsSummary(cdp);
      assertEqual(afterFinal.cardCount, 563, 'All 563 cards rendered');
      assertEqual(afterFinal.loadMoreText, null, 'Load more button hidden after 563');
      assertCleanDiagnostics(cdp, 'T2-F5-01');
      return pass('Exhaustive pagination reached 563 cards via final Load 11 more slice', {
        beforeFinal: beforeFinal.loadMoreText,
        afterFinal: afterFinal.cardCount,
      });
    },
  },
  {
    id: 'T2-F5-02',
    tier: 2,
    feature: 'F5',
    req: 'R1',
    name: 'Catalog fetch failure & Retry catalog recovery',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await cdp.interceptRoutes([
        { match: /\/catalog\.json/, status: 500, body: 'Internal Server Error', contentType: 'text/plain', once: true },
      ]);
      await cdp.reload();
      await cdp.waitFor(`() => /The catalog didn't load\./i.test(document.body.textContent || '')`, 5000);

      await cdp.clearInterceptions();
      cdp.clearDiagnostics();
      await clickAccessible(cdp, { role: 'button', name: /Retry catalog/i });
      await waitForCatalogReady(cdp);
      const summary = await getResultsSummary(cdp);
      assertEqual(summary.count, 563, 'Catalog count after Retry catalog');
      assertCleanDiagnostics(cdp, 'T2-F5-02');
      return pass('Catalog 500 error UI and Retry catalog recovery verified', summary);
    },
  },
  {
    id: 'T2-F5-03',
    tier: 2,
    feature: 'F5',
    req: 'R1',
    name: 'localStorage corrupted JSON resilience for Favorites/Recent/Theme',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await cdp.evaluate(`(() => {
        localStorage.setItem('wasmdeck:favorites', 'not-json');
        localStorage.setItem('wasmdeck:recent', '{bad');
        localStorage.setItem('wasmdeck:theme', '[invalid');
        return true;
      })()`);
      await cdp.reload();
      await waitForCatalogReady(cdp);
      assertEqual(await readSidebarBadge(cdp, /^Favorites$/i), 0, 'Recovered Favorites badge');
      assertEqual(await readSidebarBadge(cdp, /^Recently opened$/i), 0, 'Recovered Recent badge');
      const theme = await cdp.evaluate(`document.querySelector('[data-theme]')?.getAttribute('data-theme')`);
      assertEqual(theme, 'dark', 'Recovered default dark theme');
      assertCleanDiagnostics(cdp, 'T2-F5-03');
      return pass('Corrupted Favorites/Recent/Theme localStorage recovered cleanly');
    },
  },
  {
    id: 'T2-F5-04',
    tier: 2,
    feature: 'F5',
    req: 'R1',
    name: 'Recently opened list caps at 20 entries & deduplicates',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      // Pre-seed 20 valid catalog IDs except classic-doom-silent, then open 2 more to verify cap=20 + dedup
      await cdp.evaluate(`(() => {
        return fetch('/catalog.json').then(r => r.json()).then(data => {
          const ids = data.filter(g => g.id !== 'classic-doom-silent').slice(0, 20).map(g => g.id);
          localStorage.setItem('wasmdeck:recent', JSON.stringify(ids));
          return ids.length;
        });
      })()`);
      await cdp.reload();
      await waitForCatalogReady(cdp);
      assertEqual(await readSidebarBadge(cdp, /^Recently opened$/i), 20, 'Pre-seeded recent count');

      // Launch classic-doom-silent -> still capped at 20 and moves to index 0
      await toggleFilterPill(cdp, /In-deck compatible/i);
      await clickAccessible(cdp, { role: 'button', name: /Open in deck/i });
      await waitForVisibleDialogIframe(cdp, 4000);
      await closeDialog(cdp);
      assertEqual(await readSidebarBadge(cdp, /^Recently opened$/i), 20, 'Recent count capped at 20');

      // Launch classic-doom-silent a second time -> no duplicate
      await clickAccessible(cdp, { role: 'button', name: /Open in deck/i });
      await waitForVisibleDialogIframe(cdp, 4000);
      await closeDialog(cdp);

      const stored = await cdp.evaluate(`JSON.parse(localStorage.getItem('wasmdeck:recent') || '[]')`);
      assertEqual(stored.length, 20, 'Stored recent array length');
      assertEqual(stored[0], 'classic-doom-silent', 'Re-opened game promoted to index 0');
      assertEqual(stored.filter((id) => id === 'classic-doom-silent').length, 1, 'No duplicate ID in recent');
      assertCleanDiagnostics(cdp, 'T2-F5-04');
      return pass('Recently opened capped at 20 entries and deduplicated MRU order');
    },
  },
  {
    id: 'T2-F5-05',
    tier: 2,
    feature: 'F5',
    req: 'R1',
    name: 'Broken cover image falls back to category monogram + icon',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl, { waitCatalog: false });
      await cdp.interceptRoutes([
        { match: /\.(jpg|jpeg|png|webp)(\?|$)/i, status: 404, body: 'missing', contentType: 'text/plain' },
      ]);
      await cdp.reload();
      await waitForCatalogReady(cdp);
      await cdp.evaluate(`document.getElementById('archive')?.scrollIntoView({ behavior: 'instant', block: 'start' })`);
      await cdp.sleep(450);

      const fallbackCount = await cdp.evaluate(`document.querySelectorAll('.cover-fallback').length`);
      assert(fallbackCount > 0, 'Expected .cover-fallback monograms when cover images fail');
      await cdp.clearInterceptions();
      assertEqual(cdp.pageErrors.length, 0, 'Page errors on broken cover images');
      return pass('Broken cover images fell back cleanly to .cover-fallback monograms', { fallbackCount });
    },
  },

  // =========================================================================
  // F6 Boundaries (5)
  // =========================================================================
  {
    id: 'T2-F6-01',
    tier: 2,
    feature: 'F6',
    req: 'R1',
    name: 'Hero proof stats while catalog is loading vs loaded',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      // Serve real catalog JSON fetched from Node with delayMs so loading state is observable
      const catalogText = await (await fetch(`${baseUrl}/catalog.json`)).text();
      await cdp.interceptRoutes([
        { match: /\/catalog\.json/, delayMs: 600, status: 200, body: catalogText, contentType: 'application/json', once: true },
      ]);

      await cdp.evaluate(`document.documentElement.dataset.e2eStale = '1'`);
      await cdp.send('Page.reload', { ignoreCache: false });
      await cdp.waitFor(
        `() => !document.documentElement.dataset.e2eStale && Boolean(document.querySelector('.hero-proof'))`,
        4000
      );
      const loadingVals = await cdp.evaluate(`Array.from(document.querySelectorAll('.hero-proof strong')).map(el => el.textContent.trim())`);
      await waitForCatalogReady(cdp);
      const loadedVals = await cdp.evaluate(`Array.from(document.querySelectorAll('.hero-proof strong')).map(el => el.textContent.trim())`);
      await cdp.clearInterceptions();

      assert(loadingVals[0] === '—' || loadingVals[0] === '563', `Unexpected loading stat: ${JSON.stringify(loadingVals)}`);
      assertEqual(loadedVals[0], '563', 'Loaded catalog stat');
      assertEqual(loadedVals[1], '07', 'Loaded collections stat');
      assertEqual(loadedVals[2], '224', 'Loaded multiplayer stat');
      assertCleanDiagnostics(cdp, 'T2-F6-01');
      return pass('Hero proof stats transitioned cleanly from loading to 563/07/224', { loadingVals, loadedVals });
    },
  },
  {
    id: 'T2-F6-02',
    tier: 2,
    feature: 'F6',
    req: 'R1',
    name: 'Hero Random pick disabled when 0 results match filters',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await setSearchInputValue(cdp, 'zzz_nonexistent_999');
      const btn = await locateElement(cdp, { role: 'button', name: /Random pick/i });
      assert(btn && btn.disabled === true, 'Random pick button must be disabled when 0 results match');
      assertCleanDiagnostics(cdp, 'T2-F6-02');
      return pass('Hero Random pick button disabled cleanly on 0 matches');
    },
  },
  {
    id: 'T2-F6-03',
    tier: 2,
    feature: 'F6',
    req: 'R1',
    name: 'Hero Random pick deterministically launches single-item filter',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await setSearchInputValue(cdp, 'silent');
      assertEqual((await getResultsSummary(cdp)).count, 1, 'Search "silent" match count');

      await clickAccessible(cdp, { role: 'button', name: /Random pick/i });
      await waitForVisibleDialogIframe(cdp, 5000);
      const iframeSrc = await cdp.evaluate(`(() => {
        ${SHARED_DOM_HELPERS}
        return findVisibleDialog()?.querySelector('iframe')?.getAttribute('src') || null;
      })()`);
      assertEqual(iframeSrc, 'https://silentspacemarine.com/', 'Random pick launched classic-doom-silent');
      await closeDialog(cdp);
      assertEqual(await readSidebarBadge(cdp, /^Recently opened$/i), 1, 'Recent incremented to 1');
      assertCleanDiagnostics(cdp, 'T2-F6-03');
      return pass('Hero Random pick deterministically launched single matching in-deck game');
    },
  },
  {
    id: 'T2-F6-04',
    tier: 2,
    feature: 'F6',
    req: 'R1',
    name: 'Hero Random pick on multi-item subset ("doom", 3 entries)',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await setSearchInputValue(cdp, 'doom');
      assertEqual((await getResultsSummary(cdp)).count, 3, 'Doom match count');
      await cdp.spyWindowOpen();
      await clickAccessible(cdp, { role: 'button', name: /Random pick/i });
      await cdp.sleep(250);

      const dialogOpen = await hasVisibleDialog(cdp);
      const opens = await cdp.getWindowOpenCalls();
      assert(
        dialogOpen || (opens.length === 1 && /noopener/i.test(opens[0].features) && /^https?:\/\//.test(opens[0].url)),
        `Unexpected multi-item Random pick result: dialog=${dialogOpen}, opens=${JSON.stringify(opens)}`
      );
      if (dialogOpen) await closeDialog(cdp);
      assertCleanDiagnostics(cdp, 'T2-F6-04');
      return pass('Hero Random pick launched a valid Doom match cleanly', { dialogOpen, opens });
    },
  },
  {
    id: 'T2-F6-05',
    tier: 2,
    feature: 'F6',
    req: 'R1,R3',
    name: 'Hero stage pointer move & leave at desktop vs mobile',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      const stageRect = await locateElement(cdp, { selector: 'section[aria-labelledby="hero-title"] .hero-stage, section[aria-labelledby="hero-title"] [role="img"]' });
      assert(stageRect, 'Hero stage missing');
      await cdp.mouseMove(stageRect.cx - 40, stageRect.cy - 20);
      await cdp.mouseMove(stageRect.cx + 40, stageRect.cy + 20);
      await cdp.mouseMove(5, 5);

      await cdp.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, mobile: true, touch: true });
      await cdp.sleep(250);
      const caption = await cdp.evaluate(`(() => {
        const el = document.querySelector('.hero-visual-caption');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { text: el.textContent, right: r.right, vw: window.innerWidth };
      })()`);
      assert(caption && /01 — 563 \/ OPEN INDEX/i.test(caption.text || ''), 'Hero caption missing');
      assert(caption.right <= 376, `Hero caption clipped on mobile: ${JSON.stringify(caption)}`);
      assertCleanDiagnostics(cdp, 'T2-F6-05');
      return pass('Hero stage handled desktop pointer sweep and mobile resize cleanly', caption);
    },
  },

  // =========================================================================
  // F7 Boundaries (5)
  // =========================================================================
  {
    id: 'T2-F7-01',
    tier: 2,
    feature: 'F7',
    req: 'R1',
    name: 'Exact counts for all 7 Categories + Popular + MP + In-deck',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      const expectedCategories = [
        [/^Flash classics$/i, 286],
        [/^Retro arcade$/i, 227],
        [/^Classic PC$/i, 15],
        [/^AAA & console$/i, 14],
        [/^Port hubs$/i, 9],
        [/^Modern indie$/i, 6],
        [/^Nintendo decomps$/i, 6],
        [/^Popular picks$/i, 31],
      ];
      for (const [rx, expected] of expectedCategories) {
        await selectSidebarItem(cdp, rx);
        const s = await getResultsSummary(cdp);
        assertEqual(s.count, expected, `Category count for ${rx}`);
      }
      await selectSidebarItem(cdp, /^All entries$/i);
      await toggleFilterPill(cdp, /Multiplayer/i);
      assertEqual((await getResultsSummary(cdp)).count, 224, 'Multiplayer pill count');
      await toggleFilterPill(cdp, /Multiplayer/i);
      await toggleFilterPill(cdp, /In-deck compatible/i);
      assertEqual((await getResultsSummary(cdp)).count, 1, 'In-deck pill count');
      assertCleanDiagnostics(cdp, 'T2-F7-01');
      return pass('All 7 categories, Popular, Multiplayer, and In-deck matched exact ground-truth counts');
    },
  },
  {
    id: 'T2-F7-02',
    tier: 2,
    feature: 'F7',
    req: 'R1',
    name: 'Empty string & whitespace-only search treated as unfiltered',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await setSearchInputValue(cdp, '     ');
      const s = await getResultsSummary(cdp);
      assertEqual(s.count, 563, 'Whitespace search count');
      assertEqual(s.activeFilters, 0, 'Whitespace search activeFilterCount');
      assertCleanDiagnostics(cdp, 'T2-F7-02');
      return pass('Whitespace-only query treated as unfiltered (563 entries, 0 filters)');
    },
  },
  {
    id: 'T2-F7-03',
    tier: 2,
    feature: 'F7',
    req: 'R1',
    name: 'Special regex & HTML characters in search input (XSS/ReDoS safe)',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await setSearchInputValue(cdp, '.*+?^${}()|[]');
      assertEqual((await getResultsSummary(cdp)).count, 0, 'Regex metacharacters count');

      await setSearchInputValue(cdp, '<script>alert(1)</script>');
      assertEqual((await getResultsSummary(cdp)).count, 0, 'Script tag search count');

      await setSearchInputValue(cdp, '(Silent');
      const s = await getResultsSummary(cdp);
      assertEqual(s.count, 1, 'Literal parenthesis search count');
      assertEqual((await getCardTitles(cdp))[0], 'Classic Doom (Silent Space Marine)', 'Literal parenthesis match');
      assertCleanDiagnostics(cdp, 'T2-F7-03');
      return pass('Search input safely handled regex metacharacters, HTML, and literal parens');
    },
  },
  {
    id: 'T2-F7-04',
    tier: 2,
    feature: 'F7',
    req: 'R1',
    name: '0-result search recovery via Clear search button & Show all entries',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await setSearchInputValue(cdp, 'zzz_no_match_xyz');
      const emptyTxt = await cdp.evaluate(`document.querySelector('.empty-state')?.textContent || ''`);
      assert(/No entries match those filters\./i.test(emptyTxt), `Unexpected empty state: ${emptyTxt}`);
      await clickAccessible(cdp, { role: 'button', name: /Show all entries/i });
      await cdp.sleep(150);
      assertEqual((await getResultsSummary(cdp)).count, 563, 'Count after Show all entries');

      await setSearchInputValue(cdp, 'zzz_no_match_xyz');
      await clickAccessible(cdp, { role: 'button', name: /Clear search/i });
      await cdp.sleep(150);
      assertEqual((await getResultsSummary(cdp)).count, 563, 'Count after Clear search X');
      assertCleanDiagnostics(cdp, 'T2-F7-04');
      return pass('0-result empty state recovered via both Show all entries and Clear search');
    },
  },
  {
    id: 'T2-F7-05',
    tier: 2,
    feature: 'F7',
    req: 'R1',
    name: 'Mobile (375x812) horizontal category chip strip scrolling',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl, {
        viewport: { width: 375, height: 812, deviceScaleFactor: 2, mobile: true, touch: true },
      });
      await selectSidebarItem(cdp, /^Port hubs$/i);
      const s = await getResultsSummary(cdp);
      assertEqual(s.count, 9, 'Port hubs count on mobile');
      const overflow = await checkViewportOverflow(cdp);
      assert(!overflow.overflow, `Mobile chip strip caused body overflow: ${overflow.scrollWidth}`);
      assertCleanDiagnostics(cdp, 'T2-F7-05');
      return pass('Mobile horizontal category chip strip selected Port hubs (9) with zero overflow');
    },
  },

  // =========================================================================
  // F8 Boundaries (5)
  // =========================================================================
  {
    id: 'T2-F8-01',
    tier: 2,
    feature: 'F8',
    req: 'R1',
    name: 'classic-doom-silent is the sole In-deck compatible entry',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await toggleFilterPill(cdp, /In-deck compatible/i);
      const s = await getResultsSummary(cdp);
      const titles = await getCardTitles(cdp);
      assertEqual(s.count, 1, 'In-deck compatible count');
      assertEqual(titles[0], 'Classic Doom (Silent Space Marine)', 'Sole in-deck entry');
      const hasOpenInDeck = await locateElement(cdp, { role: 'button', name: /Open in deck/i });
      assert(Boolean(hasOpenInDeck), 'Expected Open in deck button');
      assertCleanDiagnostics(cdp, 'T2-F8-01');
      return pass('Verified classic-doom-silent is the sole In-deck compatible entry');
    },
  },
  {
    id: 'T2-F8-02',
    tier: 2,
    feature: 'F8',
    req: 'R1',
    name: 'Launcher iframe security & fallback link attributes',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await toggleFilterPill(cdp, /In-deck compatible/i);
      await clickAccessible(cdp, { role: 'button', name: /Open in deck/i });
      await waitForVisibleDialogIframe(cdp, 4000);
      const attrs = await cdp.evaluate(`(() => {
        ${SHARED_DOM_HELPERS}
        const d = findVisibleDialog();
        const f = d.querySelector('iframe');
        const a = Array.from(d.querySelectorAll('a')).find((x) => /Open source instead/i.test(x.textContent || ''));
        return {
          src: f?.getAttribute('src'),
          sandbox: f?.getAttribute('sandbox'),
          target: a?.getAttribute('target'),
          rel: a?.getAttribute('rel'),
        };
      })()`);
      assertEqual(attrs.src, 'https://silentspacemarine.com/', 'Iframe src');
      assert(/allow-scripts/.test(attrs.sandbox || '') && /allow-same-origin/.test(attrs.sandbox || ''), 'Iframe sandbox');
      assertEqual(attrs.target, '_blank', 'Fallback link target');
      assert(/noopener/.test(attrs.rel || '') && /noreferrer/.test(attrs.rel || ''), 'Fallback link rel');
      await closeDialog(cdp);
      assertCleanDiagnostics(cdp, 'T2-F8-02');
      return pass('Launcher iframe sandbox and fallback anchor security verified', attrs);
    },
  },
  {
    id: 'T2-F8-03',
    tier: 2,
    feature: 'F8',
    req: 'R1',
    name: 'Unsafe javascript: URL sanitization boundary (safeGameUrl)',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      const synthetic = JSON.stringify([
        {
          id: 'xss-probe',
          title: 'XSS Probe Game',
          category: 'classic-pc',
          engine: 'Probe WASM',
          delivery: null,
          memoryEst: '1 MB',
          multiplayer: false,
          iframeCompatible: true,
          thumbnailUrl: null,
          primaryUrl: 'javascript:alert(1)',
          mirrors: [],
          notes: 'Synthetic safety boundary test',
          popular: false,
          sourceStatus: 'listed',
        },
      ]);
      await cdp.interceptRoutes([
        { match: /\/catalog\.json/, status: 200, body: synthetic, contentType: 'application/json', once: true },
      ]);
      await cdp.reload();
      await waitForCatalogReady(cdp);

      const cardState = await cdp.evaluate(`(() => {
        const card = document.querySelector('article.game-card, .game-grid article');
        const disabled = card?.querySelector('[aria-disabled="true"], .card-launch--disabled');
        const badHref = card?.querySelector('a[href^="javascript:"]');
        return {
          disabledText: disabled?.textContent?.trim() || null,
          hasJavascriptHref: Boolean(badHref),
        };
      })()`);
      await cdp.clearInterceptions();
      assert(!cardState.hasJavascriptHref, 'Unsafe javascript: href rendered!');
      assert(/No launch link/i.test(cardState.disabledText || ''), `Expected disabled "No launch link", got ${cardState.disabledText}`);
      assertCleanDiagnostics(cdp, 'T2-F8-03');
      return pass('Unsafe javascript: URL sanitized to disabled No launch link', cardState);
    },
  },
  {
    id: 'T2-F8-04',
    tier: 2,
    feature: 'F8',
    req: 'R1',
    name: 'Empty Favorites & Empty Recent shelf states',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await selectSidebarItem(cdp, /^Favorites$/i);
      const favTxt = await cdp.evaluate(`document.querySelector('.empty-state')?.textContent || ''`);
      assert(/Your shelf is waiting\./i.test(favTxt), `Empty favorites text mismatch: ${favTxt}`);

      await selectSidebarItem(cdp, /^Recently opened$/i);
      const recTxt = await cdp.evaluate(`document.querySelector('.empty-state')?.textContent || ''`);
      assert(/Nothing opened yet\./i.test(recTxt), `Empty recent text mismatch: ${recTxt}`);

      await clickAccessible(cdp, { role: 'button', name: /Show all entries/i });
      await cdp.sleep(150);
      assertEqual((await getResultsSummary(cdp)).count, 563, 'Restored 563 via Show all entries');
      assertCleanDiagnostics(cdp, 'T2-F8-04');
      return pass('Empty Favorites and Recently opened shelf states verified');
    },
  },
  {
    id: 'T2-F8-05',
    tier: 2,
    feature: 'F8',
    req: 'R1',
    name: 'GameCard long title & layout clamp stress check',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await setSearchInputValue(cdp, 'Black Ops');
      const cardBounds = await cdp.evaluate(`(() => {
        const card = document.querySelector('article.game-card, .game-grid article');
        const h3 = card?.querySelector('h3');
        const launch = card?.querySelector('.card-launch');
        if (!card || !h3 || !launch) return null;
        const cr = card.getBoundingClientRect();
        const hr = h3.getBoundingClientRect();
        const lr = launch.getBoundingClientRect();
        return {
          title: h3.textContent.trim(),
          titleInsideCard: hr.right <= cr.right + 2 && hr.bottom <= lr.top + 2,
          cardRight: cr.right,
          titleRight: hr.right,
        };
      })()`);
      assert(cardBounds && cardBounds.titleInsideCard, `Long title overlapped card bounds: ${JSON.stringify(cardBounds)}`);
      await clickAccessible(cdp, { role: 'button', name: /^List view$/i });
      await cdp.sleep(150);
      const overflow = await checkViewportOverflow(cdp);
      assert(!overflow.overflow, 'Long title overflowed in List view');
      assertCleanDiagnostics(cdp, 'T2-F8-05');
      return pass('Long title card rendered cleanly without clipping in Grid and List views', cardBounds);
    },
  },

  // =========================================================================
  // F9 Boundaries (5)
  // =========================================================================
  {
    id: 'T2-F9-01',
    tier: 2,
    feature: 'F9',
    req: 'R2',
    name: 'Slider step increments & keyboard ArrowRight/ArrowLeft control',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      // Focus Refraction slider and press ArrowRight then ArrowLeft
      const focused = await cdp.evaluate(`(() => {
        ${SHARED_DOM_HELPERS}
        const d = findVisibleDialog();
        const s = d?.querySelector('[data-testid="slider-refraction"]') || d?.querySelector('input[type="range"], [role="slider"]');
        if (!s) return false;
        const target = s.matches('input[type="range"], [role="slider"]') ? s : s.querySelector('input[type="range"], [role="slider"]');
        if (!target) return false;
        target.focus();
        return true;
      })()`);
      assert(focused, 'Could not focus Refraction slider');
      const initial = (await readOpticalSliders(cdp)).refraction.value;
      await cdp.keyPress('ArrowRight');
      await cdp.sleep(80);
      const afterRight = (await readOpticalSliders(cdp)).refraction.value;
      await cdp.keyPress('ArrowLeft');
      await cdp.sleep(80);
      const afterLeft = (await readOpticalSliders(cdp)).refraction.value;

      assertApprox(afterRight - initial, 0.005, 0.001, 'ArrowRight step increment');
      assertApprox(afterLeft, initial, 0.001, 'ArrowLeft step decrement');
      assertCleanDiagnostics(cdp, 'T2-F9-01');
      return pass('Keyboard ArrowRight/ArrowLeft stepped refraction by exact 0.005', {
        initial,
        afterRight,
        afterLeft,
      });
    },
  },
  {
    id: 'T2-F9-02',
    tier: 2,
    feature: 'F9',
    req: 'R2',
    name: 'Manual slider tweak switches active preset to custom',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      await selectPreset(cdp, 'mercury');
      let state = await readActivePresetAndScene(cdp);
      assertEqual(state.activePreset, 'mercury', 'Mercury preset active before tweak');

      await setOpticalSlider(cdp, 'specular', 3.1);
      state = await readActivePresetAndScene(cdp);
      const sliders = await readOpticalSliders(cdp);
      assert(state.activePreset === null, `Preset button still marked active after tweak: ${state.activePreset}`);
      assertApprox(sliders.refraction.value, 0.19, 0.003, 'Retained Mercury refraction');
      assertApprox(sliders.chroma.value, 0.02, 0.002, 'Retained Mercury chroma');
      assertApprox(sliders.bevel.value, 0.13, 0.003, 'Retained Mercury bevel');
      assertCleanDiagnostics(cdp, 'T2-F9-02');
      return pass('Manual specular nudge cleared active preset to custom while keeping other parameters');
    },
  },
  {
    id: 'T2-F9-03',
    tier: 2,
    feature: 'F9',
    req: 'R2',
    name: 'All 5 Background Scenes individually verified (bamboo..procedural)',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      for (const scene of ['bamboo', 'cyberpunk', 'ocean', 'nebula', 'procedural']) {
        await selectScene(cdp, scene);
        await cdp.sleep(400);
        const state = await readActivePresetAndScene(cdp);
        assertEqual(state.activeScene, scene, `Active scene ${scene}`);
      }
      assertCleanDiagnostics(cdp, 'T2-F9-03');
      return pass('All 5 background scenes verified individually');
    },
  },
  {
    id: 'T2-F9-04',
    tier: 2,
    feature: 'F9',
    req: 'R2',
    name: 'Settings dialog closes and re-opens preserving live edits',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      await setOpticalSlider(cdp, 'chroma', 0.09);
      await selectScene(cdp, 'nebula');
      await closeDialog(cdp);

      await cdp.evaluate(`window.scrollTo(0, 600)`);
      await cdp.sleep(200);
      await openSettings(cdp);
      const sliders = await readOpticalSliders(cdp);
      const state = await readActivePresetAndScene(cdp);
      assertApprox(sliders.chroma.value, 0.09, 0.002, 'Preserved chroma after reopen');
      assertEqual(state.activeScene, 'nebula', 'Preserved nebula scene after reopen');
      assertCleanDiagnostics(cdp, 'T2-F9-04');
      return pass('Settings dialog preserved live edits across close, scroll, and reopen');
    },
  },
  {
    id: 'T2-F9-05',
    tier: 2,
    feature: 'F9',
    req: 'R2',
    name: 'Reset from custom + non-default scene restores baseline cleanly',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      await selectPreset(cdp, 'water');
      await selectScene(cdp, 'cyberpunk');
      await setOpticalSlider(cdp, 'bevel', 0.175);
      await clickResetSettings(cdp);

      const sliders = await readOpticalSliders(cdp);
      const state = await readActivePresetAndScene(cdp);
      assertApprox(sliders.refraction.value, 0.08, 0.002, 'Reset refraction');
      assertApprox(sliders.chroma.value, 0.045, 0.002, 'Reset chroma');
      assertApprox(sliders.specular.value, 1.5, 0.05, 'Reset specular');
      assertApprox(sliders.bevel.value, 0.085, 0.002, 'Reset bevel');
      assertEqual(state.activePreset, 'apple', 'Apple preset restored');
      assertCleanDiagnostics(cdp, 'T2-F9-05');
      return pass('Reset restored Apple optical baseline from custom+cyberpunk state', { sliders, state });
    },
  },

  // =========================================================================
  // F10 Boundaries (5)
  // =========================================================================
  {
    id: 'T2-F10-01',
    tier: 2,
    feature: 'F10',
    req: 'AC',
    name: 'Theme toggle persistence across page reload',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await clickAccessible(cdp, { role: 'button', name: /Switch to light theme/i });
      await cdp.sleep(150);
      await cdp.reload();
      await waitForCatalogReady(cdp);
      const theme = await cdp.evaluate(`document.querySelector('[data-theme]')?.getAttribute('data-theme')`);
      assertEqual(theme, 'light', 'Persisted theme after reload');
      assertCleanDiagnostics(cdp, 'T2-F10-01');
      return pass('Light theme persisted in localStorage across reload');
    },
  },
  {
    id: 'T2-F10-02',
    tier: 2,
    feature: 'F10',
    req: 'AC',
    name: 'Contrast check across Dark + bamboo/cyberpunk and Light + ocean/procedural',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      const combos = [
        { theme: 'dark', scene: 'bamboo' },
        { theme: 'dark', scene: 'cyberpunk' },
        { theme: 'light', scene: 'ocean' },
        { theme: 'light', scene: 'procedural' },
      ];
      for (const combo of combos) {
        const curTheme = await cdp.evaluate(`document.querySelector('[data-theme]')?.getAttribute('data-theme')`);
        if (curTheme !== combo.theme) {
          await clickAccessible(cdp, { role: 'button', name: new RegExp(`Switch to ${combo.theme} theme`, 'i') });
          await cdp.sleep(150);
        }
        await openSettings(cdp);
        await selectScene(cdp, combo.scene);
        const modalAudit = await checkContrastAndHitTest(cdp, [
          { name: 'Settings heading', findExpr: `findVisibleDialog()?.querySelector('h2')` },
        ]);
        assert(modalAudit[0].found && modalAudit[0].contrastRatio >= 3.0, `Settings heading contrast low in ${combo.theme}/${combo.scene}: ${JSON.stringify(modalAudit)}`);
        await closeDialog(cdp);

        const pageAudit = await checkContrastAndHitTest(cdp, [
          { name: 'Hero H1', findExpr: `document.getElementById('hero-title')` },
          { name: 'Card title', findExpr: `document.querySelector('article.game-card h3, .game-grid article h3')` },
        ]);
        for (const item of pageAudit) {
          assert(item.contrastRatio >= 3.0, `Low contrast for ${item.name} in ${combo.theme}/${combo.scene}: ${item.contrastRatio}`);
        }
      }
      assertCleanDiagnostics(cdp, 'T2-F10-02');
      return pass('Contrast verified across Dark/Light themes and 4 WebGL scenes');
    },
  },
  {
    id: 'T2-F10-03',
    tier: 2,
    feature: 'F10',
    req: 'AC',
    name: 'Mobile (375x812) List view + Settings interaction',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl, {
        viewport: { width: 375, height: 812, deviceScaleFactor: 2, mobile: true, touch: true },
      });
      await clickAccessible(cdp, { role: 'button', name: /^List view$/i });
      await cdp.sleep(200);
      assert(!(await checkViewportOverflow(cdp)).overflow, 'Mobile list view overflowed');

      await openSettings(cdp);
      const val = await setOpticalSlider(cdp, 'refraction', 0.15);
      assertApprox(val, 0.15, 0.005, 'Mobile slider adjustment');
      assert(!(await checkViewportOverflow(cdp)).overflow, 'Mobile Settings dialog overflowed');
      await closeDialog(cdp);
      assertCleanDiagnostics(cdp, 'T2-F10-03');
      return pass('Mobile List view and Settings slider interaction succeeded without overflow');
    },
  },
  {
    id: 'T2-F10-04',
    tier: 2,
    feature: 'F10',
    req: 'AC',
    name: 'Narrow desktop (900x700) breakpoint boundary',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl, {
        viewport: { width: 900, height: 700, deviceScaleFactor: 1, mobile: false, touch: false },
      });
      const overflow = await checkViewportOverflow(cdp);
      assert(!overflow.overflow, `900px viewport overflowed: ${overflow.scrollWidth}`);
      assertEqual(overflow.clippedControls.length, 0, 'Clipped controls at 900x700');
      assertCleanDiagnostics(cdp, 'T2-F10-04');
      return pass('900x700 breakpoint rendered cleanly without clipping', overflow);
    },
  },
  {
    id: 'T2-F10-05',
    tier: 2,
    feature: 'F10',
    req: 'AC',
    name: 'Overlapping element hit-test audit (elementFromPoint)',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      for (const vp of [
        { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false, touch: false },
        { width: 375, height: 812, deviceScaleFactor: 2, mobile: true, touch: true },
      ]) {
        await resetBrowserState(cdp, baseUrl, { viewport: vp });
        const audit = await checkContrastAndHitTest(cdp, [
          { name: 'Settings button', findExpr: `document.querySelector('header button[aria-label*="Settings" i], header [data-testid="settings-button"]') || Array.from(document.querySelectorAll('header button')).find(b => /settings/i.test(b.textContent || ''))` },
          { name: 'Search input', findExpr: `document.querySelector('input[type="search"], [role="searchbox"]')` },
          { name: 'Filter pill', findExpr: `document.querySelector('.filter-pill, .filter-buttons button')` },
          { name: 'Card launch', findExpr: `document.querySelector('article.game-card .card-launch, .game-grid article .card-launch')` },
        ]);
        for (const t of audit) {
          assert(t.found, `Hit-test target missing at ${vp.width}x${vp.height}: ${t.name}`);
          assert(t.hitOk, `Hit-test blocked on ${t.name} at ${vp.width}x${vp.height} (hit ${t.hitTag})`);
        }
      }
      assertCleanDiagnostics(cdp, 'T2-F10-05');
      return pass('elementFromPoint hit-test passed on desktop and mobile interactive targets');
    },
  },
];
