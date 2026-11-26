import {
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
  diffRegion,
  getCardTitles,
  getDialogBevelRect,
  getExteriorBackgroundRect,
  getResultsSummary,
  openSettings,
  PRESET_META,
  readActivePresetAndScene,
  readOpticalSliders,
  readSidebarBadge,
  resetBrowserState,
  sampleElementStability,
  selectPreset,
  selectScene,
  selectSidebarItem,
  setOpticalSlider,
  setSortValue,
  toggleFilterPill,
  waitForCatalogReady,
} from './helpers.mjs';

function pass(details, metrics = {}, artifacts = []) {
  return { status: 'passed', details, metrics, artifacts };
}

export const tier4Tests = [
  {
    id: 'T4-01',
    tier: 4,
    feature: 'F5,F6,F7,F8',
    req: 'R1',
    name: 'Journey 1: Discover, Filter, Play classic-doom-silent In-Deck & Verify Recent',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      const heroStats = await cdp.evaluate(`Array.from(document.querySelectorAll('.hero-proof strong')).map(el => el.textContent.trim())`);
      assertEqual(heroStats[0], '563', 'Hero catalog count');
      assertEqual(heroStats[1], '07', 'Hero collections count');
      assertEqual(heroStats[2], '224', 'Hero multiplayer count');
      assertEqual((await getResultsSummary(cdp)).count, 563, 'Initial archive count');

      await selectSidebarItem(cdp, /^Classic PC$/i);
      assertEqual((await getResultsSummary(cdp)).count, 15, 'Classic PC count');

      await clickAccessible(cdp, { selector: 'input[type="search"], [role="searchbox"]' });
      await cdp.typeText('doom');
      await cdp.sleep(150);
      assertEqual((await getResultsSummary(cdp)).count, 3, 'Classic PC + doom count');

      await toggleFilterPill(cdp, /In-deck compatible/i);
      assertEqual((await getResultsSummary(cdp)).count, 1, 'Filtered to 1 in-deck Doom');
      assertEqual((await getCardTitles(cdp))[0], 'Classic Doom (Silent Space Marine)', 'Matched card');

      await clickAccessible(cdp, { role: 'button', name: /Open in deck/i });
      await cdp.waitFor(`() => Boolean(document.querySelector('[role="dialog"] iframe, dialog[open] iframe'))`, 5000);
      const iframeSrc = await cdp.evaluate(`document.querySelector('[role="dialog"] iframe, dialog[open] iframe')?.getAttribute('src')`);
      assertEqual(iframeSrc, 'https://silentspacemarine.com/', 'Launcher iframe src');
      await closeDialog(cdp);

      await clickAccessible(cdp, { role: 'button', name: /Clear filters/i });
      await cdp.sleep(150);
      assertEqual((await getResultsSummary(cdp)).count, 563, 'Cleared back to 563');

      await selectSidebarItem(cdp, /^Recently opened$/i);
      assertEqual(await readSidebarBadge(cdp, /^Recently opened$/i), 1, 'Recent badge 1');
      assertEqual((await getCardTitles(cdp))[0], 'Classic Doom (Silent Space Marine)', 'Recent list item');
      assertCleanDiagnostics(cdp, 'T4-01');
      return pass('Journey 1 completed: browse -> filter -> launch classic-doom-silent -> verify recent');
    },
  },
  {
    id: 'T4-02',
    tier: 4,
    feature: 'F5,F6,F7,F8',
    req: 'R1',
    name: 'Journey 2: Multiplayer Retro Arcade Curation, Favorites Shelf & Random Pick',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await selectSidebarItem(cdp, /^Retro arcade$/i);
      assertEqual((await getResultsSummary(cdp)).count, 227, 'Retro arcade count');

      await toggleFilterPill(cdp, /Multiplayer/i);
      assertEqual((await getResultsSummary(cdp)).count, 193, 'Retro arcade + Multiplayer count');

      for (let i = 0; i < 3; i++) {
        await clickAccessible(cdp, { selector: 'button.favorite-toggle', index: i });
        await cdp.sleep(80);
      }
      assertEqual(await readSidebarBadge(cdp, /^Favorites$/i), 3, 'Favorites badge 3');

      await selectSidebarItem(cdp, /^Favorites$/i);
      assertEqual((await getResultsSummary(cdp)).count, 3, 'Favorites shelf shows 3 games');
      const favUrls = await cdp.evaluate(`Array.from(document.querySelectorAll('article.game-card a.card-launch')).map(a => a.href)`);

      await cdp.spyWindowOpen();
      await clickAccessible(cdp, { role: 'button', name: /Random pick/i });
      await cdp.sleep(250);
      const opens = await cdp.getWindowOpenCalls();
      assertEqual(opens.length, 1, 'Random pick opened 1 external URL');
      assert(favUrls.includes(opens[0].url), `Random pick URL ${opens[0].url} not among favorites`);
      assert(/noopener/.test(opens[0].features), 'Random pick missing noopener');
      assertEqual(await readSidebarBadge(cdp, /^Recently opened$/i), 1, 'Recent incremented to 1');

      await cdp.reload();
      await waitForCatalogReady(cdp);
      assertEqual(await readSidebarBadge(cdp, /^Favorites$/i), 3, 'Favorites persisted after reload');
      assertCleanDiagnostics(cdp, 'T4-02');
      return pass('Journey 2 completed: multiplayer curation -> 3 favorites -> random pick -> reload persistence');
    },
  },
  {
    id: 'T4-03',
    tier: 4,
    feature: 'F1,F2,F3,F9',
    req: 'R2,R3',
    name: 'Journey 3: Real-Time Optical Tuning, Scene Switching & Static Glass Stability (R2 + R3)',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      await selectScene(cdp, 'procedural');

      const bgRect = await getExteriorBackgroundRect(cdp);
      const bevelRect = await getDialogBevelRect(cdp);
      const imgT0 = await captureDecoded(cdp);
      const stability = await sampleElementStability(
        cdp,
        `document.querySelector('[role="dialog"], dialog[open]')`,
        { samples: 5, intervalMs: 160, sweepPointer: true }
      );
      await cdp.sleep(200);
      const imgT1 = await captureDecoded(cdp);
      const driftDiff = diffRegion(imgT0, imgT1, bgRect, 1, 1);

      assert(stability.maxDelta <= 0.5, `Glass dialog moved during pointer sweep: ${stability.maxDelta}`);
      assert(driftDiff.meanAbsDiff > 0.05, `Background failed to drift: ${JSON.stringify(driftDiff)}`);

      // Optical slider adjustments (R2)
      const diffs = {};
      for (const [key, val] of [
        ['refraction', 0.21],
        ['chroma', 0.098],
        ['specular', 3.4],
        ['bevel', 0.175],
      ]) {
        const before = await captureDecoded(cdp);
        await setOpticalSlider(cdp, key, val);
        await cdp.sleep(250);
        const after = await captureDecoded(cdp);
        diffs[key] = diffRegion(before, after, bevelRect, 1, 2);
      }
      assert(
        diffs.refraction.changedPixelRatio > 0.005 || diffs.bevel.changedPixelRatio > 0.005,
        `Optical sliders did not visibly alter glass pixels: ${JSON.stringify(diffs)}`
      );

      // Scenes + Preset + Reset + Reload
      for (const scene of ['cyberpunk', 'ocean', 'procedural']) {
        await selectScene(cdp, scene);
        assertEqual((await readActivePresetAndScene(cdp)).activeScene, scene, `Scene ${scene}`);
      }
      await selectPreset(cdp, 'prism');
      assertApprox((await readOpticalSliders(cdp)).chroma.value, PRESET_META.prism.values.chroma, 0.002, 'Prism chroma');

      await clickResetSettings(cdp);
      await cdp.reload();
      await waitForCatalogReady(cdp);
      await openSettings(cdp);
      const resetSliders = await readOpticalSliders(cdp);
      assertApprox(resetSliders.refraction.value, 0.08, 0.002, 'Persisted reset refraction');
      assertApprox(resetSliders.bevel.value, 0.085, 0.002, 'Persisted reset bevel');
      assertCleanDiagnostics(cdp, 'T4-03');
      return pass('Journey 3 completed: R2 live optics + R3 static glass + scene switching + reset persistence', {
        maxDelta: stability.maxDelta,
        driftDiff,
      });
    },
  },
  {
    id: 'T4-04',
    tier: 4,
    feature: 'F3,F5,F7,F8,F9,F10',
    req: 'R1,R2,AC',
    name: 'Journey 4: Mobile (375x812) Browse, Chip Strip, Settings & Dialog Responsiveness',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl, {
        viewport: { width: 375, height: 812, deviceScaleFactor: 2, mobile: true, touch: true },
      });
      assert(!(await checkViewportOverflow(cdp)).overflow, 'Initial mobile overflow');

      await selectSidebarItem(cdp, /^Classic PC$/i);
      assertEqual((await getResultsSummary(cdp)).count, 15, 'Mobile Classic PC count');
      await toggleFilterPill(cdp, /In-deck compatible/i);
      assertEqual((await getResultsSummary(cdp)).count, 1, 'Mobile Classic PC + In-deck count');

      await clickAccessible(cdp, { role: 'button', name: /Open in deck/i });
      await cdp.waitFor(`() => Boolean(document.querySelector('[role="dialog"] iframe, dialog[open] iframe'))`, 4000);
      assert(!(await checkViewportOverflow(cdp)).overflow, 'Mobile launcher dialog overflow');
      await closeDialog(cdp);

      await openSettings(cdp);
      await setOpticalSlider(cdp, 'bevel', 0.16);
      assert(!(await checkViewportOverflow(cdp)).overflow, 'Mobile Settings dialog overflow');
      await closeDialog(cdp);

      await clickAccessible(cdp, { role: 'button', name: /^List view$/i });
      await cdp.sleep(200);
      assert(!(await checkViewportOverflow(cdp)).overflow, 'Mobile List view overflow');
      assertCleanDiagnostics(cdp, 'T4-04');
      return pass('Journey 4 completed: full mobile responsive workflow with zero horizontal overflow');
    },
  },
  {
    id: 'T4-05',
    tier: 4,
    feature: 'F1,F4,F8,F9,F10',
    req: 'R2,AC',
    name: 'Journey 5: Light & Dark Theme Contrast Audit Across Portal & WebGL Scenes',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      assertEqual(await cdp.evaluate(`document.querySelector('[data-theme]')?.getAttribute('data-theme')`), 'dark', 'Default dark');

      const darkAudit = await checkContrastAndHitTest(cdp, [
        { name: 'Hero H1', findExpr: `document.getElementById('hero-title')` },
        { name: 'Card Title', findExpr: `document.querySelector('article.game-card h3')` },
      ]);
      darkAudit.forEach((a) => assert(a.contrastRatio >= 3.0, `Dark contrast low: ${JSON.stringify(a)}`));

      await clickAccessible(cdp, { role: 'button', name: /Switch to light theme/i });
      await cdp.sleep(200);
      await openSettings(cdp);
      for (const scene of ['cyberpunk', 'procedural']) {
        await selectScene(cdp, scene);
        const modalAudit = await checkContrastAndHitTest(cdp, [
          { name: 'Settings Title', findExpr: `document.querySelector('[role="dialog"] h2, dialog[open] h2')` },
        ]);
        assert(modalAudit[0].contrastRatio >= 3.0, `Light modal contrast low in ${scene}`);
      }
      await closeDialog(cdp);

      await clickAccessible(cdp, { selector: 'header nav button', name: /^About$/i });
      await cdp.waitFor(`() => Boolean(document.querySelector('[role="dialog"], dialog[open]'))`, 4000);
      await closeDialog(cdp);

      await cdp.reload();
      await waitForCatalogReady(cdp);
      assertEqual(await cdp.evaluate(`document.querySelector('[data-theme]')?.getAttribute('data-theme')`), 'light', 'Persisted light theme');
      await clickAccessible(cdp, { role: 'button', name: /Switch to dark theme/i });
      assertEqual(await cdp.evaluate(`document.querySelector('[data-theme]')?.getAttribute('data-theme')`), 'dark', 'Toggled back to dark');
      assertCleanDiagnostics(cdp, 'T4-05');
      return pass('Journey 5 completed: Dark & Light theme contrast and persistence verified');
    },
  },
  {
    id: 'T4-06',
    tier: 4,
    feature: 'F3,F4,F5,F7,F9',
    req: 'R1,R2',
    name: 'Journey 6: Keyboard Power-User Navigation (Cmd/Ctrl+K, Escape, Pagination)',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await cdp.keyPress('Tab');
      await cdp.sleep(80);
      const skipFocused = await cdp.evaluate(`document.activeElement?.textContent?.trim() || ''`);
      assert(/Skip to the catalog/i.test(skipFocused), `Expected skip link focus, got: ${skipFocused}`);

      // Ctrl+K focuses search box
      await cdp.keyPress('k', { ctrlKey: true });
      await cdp.sleep(100);
      const isSearchFocused = await cdp.evaluate(`document.activeElement?.matches('input[type="search"], [role="searchbox"]')`);
      assert(isSearchFocused, 'Ctrl+K did not focus search input');

      await cdp.typeText('ruffle');
      await cdp.sleep(180);
      assertEqual((await getResultsSummary(cdp)).count, 287, 'Ruffle search count');
      assertEqual((await getResultsSummary(cdp)).cardCount, 24, 'First page of Ruffle');

      await cdp.keyPress('Escape');
      await cdp.sleep(150);
      assertEqual((await getResultsSummary(cdp)).count, 563, 'Escape cleared search back to 563');

      await clickAccessible(cdp, { role: 'button', name: /Load 24 more/i });
      await cdp.sleep(150);
      await clickAccessible(cdp, { role: 'button', name: /Load 24 more/i });
      await cdp.sleep(200);
      assertEqual((await getResultsSummary(cdp)).cardCount, 72, 'Showing 72 of 563');

      await setSortValue(cdp, 'title');
      assertEqual((await getResultsSummary(cdp)).cardCount, 24, 'Sort reset visibleCount to 24');
      assertEqual((await getCardTitles(cdp))[0], '1 on 1 Soccer', 'Title A-Z first entry');

      // Keyboard focus Settings button and open with Enter, close with Escape
      const focusedSettings = await cdp.evaluate(`(() => {
        const btn = document.querySelector('header button[aria-label*="Settings" i], header [data-testid="settings-button"]') ||
          Array.from(document.querySelectorAll('header button')).find(b => /settings/i.test(b.textContent || ''));
        if (!btn) return false;
        btn.focus();
        return document.activeElement === btn;
      })()`);
      assert(focusedSettings, 'Could not focus Header Settings button');
      await cdp.keyPress('Enter');
      await cdp.waitFor(`() => Boolean(document.querySelector('[role="dialog"], dialog[open]'))`, 4000);
      await cdp.keyPress('Escape');
      await cdp.waitFor(`() => !document.querySelector('[role="dialog"], dialog[open]')`, 4000);
      assertCleanDiagnostics(cdp, 'T4-06');
      return pass('Journey 6 completed: keyboard navigation, Ctrl+K, Escape, pagination, and sort reset');
    },
  },
];
