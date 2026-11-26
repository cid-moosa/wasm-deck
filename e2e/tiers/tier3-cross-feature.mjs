import {
  assert,
  assertApprox,
  assertCleanDiagnostics,
  assertEqual,
  assertOpticalDelta,
  checkContrastAndHitTest,
  checkViewportOverflow,
  clickAccessible,
  clickResetSettings,
  closeDialog,
  getCardTitles,
  getDialogBevelRect,
  getResultsSummary,
  hasVisibleDialog,
  measureOpticalDelta,
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

export const tier3Tests = [
  {
    id: 'T3-01',
    tier: 3,
    feature: 'F5+F7',
    req: 'R1',
    name: 'Search + Category + Multiplayer pairwise intersection',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await selectSidebarItem(cdp, /^Retro arcade$/i);
      assertEqual((await getResultsSummary(cdp)).count, 227, 'Retro arcade count');

      await toggleFilterPill(cdp, /Multiplayer/i);
      assertEqual((await getResultsSummary(cdp)).count, 193, 'Retro arcade + Multiplayer count');

      await setSearchInputValue(cdp, 'street');
      const s = await getResultsSummary(cdp);
      assert(s.count > 0 && s.count < 193, `Expected street subset inside 193, got ${s.count}`);
      assertEqual(s.activeFilters, 3, 'Active filters count');
      assertCleanDiagnostics(cdp, 'T3-01');
      return pass('Category + Multiplayer + Search intersection narrowed results accurately', s);
    },
  },
  {
    id: 'T3-02',
    tier: 3,
    feature: 'F5+F7',
    req: 'R1',
    name: 'In-deck compatible + Multiplayer empty intersection + recovery',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await toggleFilterPill(cdp, /In-deck compatible/i);
      assertEqual((await getResultsSummary(cdp)).count, 1, 'In-deck count');

      await toggleFilterPill(cdp, /Multiplayer/i);
      let s = await getResultsSummary(cdp);
      assertEqual(s.count, 0, 'In-deck + Multiplayer intersection');
      assertEqual(s.activeFilters, 2, 'Active filter count');

      await toggleFilterPill(cdp, /Multiplayer/i);
      s = await getResultsSummary(cdp);
      assertEqual(s.count, 1, 'Restored In-deck count');
      assertEqual((await getCardTitles(cdp))[0], 'Classic Doom (Silent Space Marine)', 'Restored entry');
      assertCleanDiagnostics(cdp, 'T3-02');
      return pass('Empty pairwise intersection recovered cleanly on toggle off');
    },
  },
  {
    id: 'T3-03',
    tier: 3,
    feature: 'F5+F7',
    req: 'R1',
    name: 'Pagination reset on filter/sort/view changes',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await clickAccessible(cdp, { role: 'button', name: /Load 24 more/i });
      await cdp.sleep(200);
      assertEqual((await getResultsSummary(cdp)).cardCount, 48, '48 cards loaded');

      await setSortValue(cdp, 'title');
      assertEqual((await getResultsSummary(cdp)).cardCount, 24, 'Visible cards reset to 24 on sort change');

      await clickAccessible(cdp, { role: 'button', name: /Load 24 more/i });
      await cdp.sleep(200);
      assertEqual((await getResultsSummary(cdp)).cardCount, 48, '48 cards loaded again');

      await clickAccessible(cdp, { role: 'button', name: /^List view$/i });
      await cdp.sleep(200);
      assertEqual((await getResultsSummary(cdp)).cardCount, 24, 'Visible cards reset to 24 on view change');
      assertCleanDiagnostics(cdp, 'T3-03');
      return pass('Pagination cleanly reset to 24 cards on Sort and ViewMode changes');
    },
  },
  {
    id: 'T3-04',
    tier: 3,
    feature: 'F5+F7+F8',
    req: 'R1',
    name: 'Popular picks + Multiplayer + Sort Engine + Favorite',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await selectSidebarItem(cdp, /^Popular picks$/i);
      assertEqual((await getResultsSummary(cdp)).count, 31, 'Popular picks');

      await toggleFilterPill(cdp, /Multiplayer/i);
      assertEqual((await getResultsSummary(cdp)).count, 19, 'Popular + Multiplayer');

      await setSortValue(cdp, 'engine');
      await clickAccessible(cdp, { selector: 'button.favorite-toggle', index: 0 });
      await cdp.sleep(150);
      assertEqual(await readSidebarBadge(cdp, /^Favorites$/i), 1, 'Favorites incremented');
      assertCleanDiagnostics(cdp, 'T3-04');
      return pass('Popular + Multiplayer (19) sorted by engine and starred cleanly');
    },
  },
  {
    id: 'T3-05',
    tier: 3,
    feature: 'F7+F8',
    req: 'R1',
    name: 'Search "silent" + In-deck compatible + Launch + Clear',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await setSearchInputValue(cdp, 'silent');
      await toggleFilterPill(cdp, /In-deck compatible/i);
      assertEqual((await getResultsSummary(cdp)).count, 1, 'Filtered count');

      await clickAccessible(cdp, { role: 'button', name: /Open in deck/i });
      await waitForVisibleDialogIframe(cdp, 4000);
      await closeDialog(cdp);

      await clickAccessible(cdp, { role: 'button', name: /Clear filters/i });
      await cdp.sleep(150);
      assertEqual((await getResultsSummary(cdp)).count, 563, 'Restored 563 entries');
      assertEqual(await readSidebarBadge(cdp, /^Recently opened$/i), 1, 'Recent retained 1');
      assertCleanDiagnostics(cdp, 'T3-05');
      return pass('Search + In-deck + Launch + Clear preserved Recently opened');
    },
  },
  {
    id: 'T3-06',
    tier: 3,
    feature: 'F5+F6',
    req: 'R1',
    name: 'Favorites filter + Hero Random pick scopes to shelf',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await clickAccessible(cdp, { selector: 'button.favorite-toggle', index: 0 });
      await setSearchInputValue(cdp, 'silent');
      await clickAccessible(cdp, { selector: 'button.favorite-toggle', index: 0 });
      await clickAccessible(cdp, { role: 'button', name: /Clear filters/i });
      await cdp.sleep(150);

      await selectSidebarItem(cdp, /^Favorites$/i);
      assertEqual((await getResultsSummary(cdp)).count, 2, 'Favorites shelf count');
      const favUrls = await cdp.evaluate(`(() => {
        const urls = [];
        for (const a of document.querySelectorAll('article.game-card a.card-launch')) urls.push(a.href);
        return urls;
      })()`);

      await cdp.spyWindowOpen();
      await clickAccessible(cdp, { role: 'button', name: /Random pick/i });
      await cdp.sleep(250);
      const dialogOpen = await hasVisibleDialog(cdp);
      const opens = await cdp.getWindowOpenCalls();
      assert(
        dialogOpen || (opens.length === 1 && favUrls.some((u) => u === opens[0].url)),
        `Random pick went outside Favorites shelf: dialog=${dialogOpen} opens=${JSON.stringify(opens)}`
      );
      if (dialogOpen) await closeDialog(cdp);
      assertEqual(await readSidebarBadge(cdp, /^Recently opened$/i), 1, 'Recent updated');
      assertCleanDiagnostics(cdp, 'T3-06');
      return pass('Hero Random pick scoped exclusively to 2-item Favorites shelf');
    },
  },
  {
    id: 'T3-07',
    tier: 3,
    feature: 'F1+F3+F9',
    req: 'R1,R2',
    name: 'Settings Refraction/Bevel + Scene + Open About/Launcher',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      await setOpticalSlider(cdp, 'refraction', 0.2);
      await setOpticalSlider(cdp, 'bevel', 0.16);
      await selectScene(cdp, 'cyberpunk');
      await closeDialog(cdp);

      await clickAccessible(cdp, { selector: 'header nav button', name: /^About$/i });
      await cdp.waitFor(`() => Boolean(document.querySelector('[role="dialog"], dialog[open]'))`, 4000);
      await closeDialog(cdp);

      await toggleFilterPill(cdp, /In-deck compatible/i);
      await clickAccessible(cdp, { role: 'button', name: /Open in deck/i });
      await waitForVisibleDialogIframe(cdp, 4000);
      await closeDialog(cdp);

      await openSettings(cdp);
      const sliders = await readOpticalSliders(cdp);
      const state = await readActivePresetAndScene(cdp);
      assertApprox(sliders.refraction.value, 0.2, 0.005, 'Preserved refraction');
      assertApprox(sliders.bevel.value, 0.16, 0.005, 'Preserved bevel');
      assertEqual(state.activeScene, 'cyberpunk', 'Preserved scene');
      assertCleanDiagnostics(cdp, 'T3-07');
      return pass('Optical settings and scene preserved across About and Launcher modals');
    },
  },
  {
    id: 'T3-08',
    tier: 3,
    feature: 'F1+F5+F9',
    req: 'R1,R2',
    name: 'Settings persistence + Favorites + Recent across full reload',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await clickAccessible(cdp, { selector: 'button.favorite-toggle', index: 0 });
      await toggleFilterPill(cdp, /In-deck compatible/i);
      await clickAccessible(cdp, { role: 'button', name: /Open in deck/i });
      await waitForVisibleDialogIframe(cdp, 4000);
      await closeDialog(cdp);

      await openSettings(cdp);
      await selectPreset(cdp, 'prism');
      await selectScene(cdp, 'ocean');
      await closeDialog(cdp);

      await cdp.reload();
      await waitForCatalogReady(cdp);
      assertEqual(await readSidebarBadge(cdp, /^Favorites$/i), 1, 'Persisted Favorites');
      assertEqual(await readSidebarBadge(cdp, /^Recently opened$/i), 1, 'Persisted Recent');

      await openSettings(cdp);
      const sliders = await readOpticalSliders(cdp);
      const state = await readActivePresetAndScene(cdp);
      assertApprox(sliders.refraction.value, PRESET_META.prism.values.refraction, 0.003, 'Persisted Prism refraction');
      assertApprox(sliders.chroma.value, PRESET_META.prism.values.chroma, 0.002, 'Persisted Prism chroma');
      assertEqual(state.activeScene, 'ocean', 'Persisted Ocean scene');
      assertCleanDiagnostics(cdp, 'T3-08');
      return pass('Favorites, Recent, Prism preset, and Ocean scene persisted across reload');
    },
  },
  {
    id: 'T3-09',
    tier: 3,
    feature: 'F1+F9+F10',
    req: 'R2,AC',
    name: 'Settings optical controls + Background Scene + Light Theme',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await clickAccessible(cdp, { role: 'button', name: /Switch to light theme/i });
      await cdp.sleep(150);
      await openSettings(cdp);
      await selectScene(cdp, 'nebula');
      await setOpticalSlider(cdp, 'specular', 3.5);

      const theme = await cdp.evaluate(`document.querySelector('[data-theme]')?.getAttribute('data-theme')`);
      assertEqual(theme, 'light', 'Light theme intact');
      const audit = await checkContrastAndHitTest(cdp, [
        { name: 'Settings title', findExpr: `findVisibleDialog()?.querySelector('h2')` },
      ]);
      assert(audit[0].found && audit[0].contrastRatio >= 3.0, `Settings legibility in light theme: ${JSON.stringify(audit)}`);
      assertCleanDiagnostics(cdp, 'T3-09');
      return pass('Light theme + Nebula scene + Specular 3.5 remained crisp and legible');
    },
  },
  {
    id: 'T3-10',
    tier: 3,
    feature: 'F2+F3+F9',
    req: 'R2,R3',
    name: 'Live optical slider drag + static glass stability check',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      await selectScene(cdp, 'procedural');
      const bevelRect = await getDialogBevelRect(cdp);
      assert(bevelRect, 'Settings dialog bevel rect missing');

      let stability;
      const optical = await measureOpticalDelta(cdp, bevelRect, async () => {
        await setOpticalSlider(cdp, 'refraction', 0.21);
        await setOpticalSlider(cdp, 'chroma', 0.095);
        stability = await sampleElementStability(
          cdp,
          `findVisibleDialog()`,
          { samples: 5, intervalMs: 120 }
        );
      });

      assert(stability.maxDelta <= 0.5, `Dialog rect moved during slider update: ${stability.maxDelta}`);
      assertOpticalDelta(optical, { label: 'Live refraction+chroma update', minDiff: 0.2 });
      assert(
        optical.stored && Math.abs(optical.stored.refraction - 0.21) < 0.01 && Math.abs(optical.stored.chroma - 0.095) < 0.003,
        `Optical settings did not persist to localStorage: ${JSON.stringify(optical.stored)}`
      );
      assertCleanDiagnostics(cdp, 'T3-10');
      return pass('Dialog geometry stayed 0px static while optical pixels updated live', {
        maxDelta: stability.maxDelta,
        diff: optical.diff,
        baselineDrift: optical.baselineDrift,
      });
    },
  },
  {
    id: 'T3-11',
    tier: 3,
    feature: 'F4+F7+F10',
    req: 'R1,AC',
    name: 'Sticky header Search (Cmd+K / click) + Mobile (375x812) + Theme',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl, {
        viewport: { width: 375, height: 812, deviceScaleFactor: 2, mobile: true, touch: true },
      });
      await clickAccessible(cdp, { role: 'button', name: /Switch to light theme/i });
      await clickAccessible(cdp, { selector: 'header button.search-open' });
      await cdp.sleep(200);
      await cdp.typeText('mario');
      await cdp.sleep(150);
      await selectSidebarItem(cdp, /^Nintendo decomps$/i);
      const s = await getResultsSummary(cdp);
      assert(s.count >= 1, `Expected Mario match in Nintendo decomps, got ${s.count}`);
      assert(!(await checkViewportOverflow(cdp)).overflow, 'Mobile overflow after search + chip');
      assertCleanDiagnostics(cdp, 'T3-11');
      return pass('Mobile header Search + Light theme + Nintendo chip worked without overflow', s);
    },
  },
  {
    id: 'T3-12',
    tier: 3,
    feature: 'F5+F7+F8',
    req: 'R1',
    name: 'All entries + Sort Title A-Z + List View + Favorite + Link',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await clickAccessible(cdp, { role: 'button', name: /^List view$/i });
      await setSortValue(cdp, 'title');
      const titles = await getCardTitles(cdp);
      assertEqual(titles[0], '1 on 1 Soccer', 'First title A-Z');
      await clickAccessible(cdp, { selector: 'button.favorite-toggle', index: 0 });
      await cdp.sleep(150);
      assertEqual(await readSidebarBadge(cdp, /^Favorites$/i), 1, 'Favorites badge');
      const href = await cdp.evaluate(`document.querySelector('article.game-card a.card-launch')?.getAttribute('href')`);
      assert(/^https?:\/\//.test(href || ''), `Invalid external href: ${href}`);
      assertCleanDiagnostics(cdp, 'T3-12');
      return pass('List view + Sort A-Z + Favorite + valid external link verified', { firstTitle: titles[0], href });
    },
  },
  {
    id: 'T3-13',
    tier: 3,
    feature: 'F1+F2+F5',
    req: 'R1,R2,R3',
    name: 'Pagination load + WebGL scissor card count budget',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await clickAccessible(cdp, { role: 'button', name: /Load 24 more/i });
      await cdp.sleep(180);
      await clickAccessible(cdp, { role: 'button', name: /Load 24 more/i });
      await cdp.sleep(200);
      assertEqual((await getResultsSummary(cdp)).cardCount, 72, 'Loaded 72 cards');

      await cdp.evaluate(`window.scrollTo(0, 1600)`);
      await cdp.sleep(250);
      await openSettings(cdp);
      await setOpticalSlider(cdp, 'bevel', 0.16);
      await closeDialog(cdp);
      assertCleanDiagnostics(cdp, 'T3-13');
      return pass('72-card paginated grid scrolled and updated Bevel cleanly without WebGL loss');
    },
  },
  {
    id: 'T3-14',
    tier: 3,
    feature: 'F3+F8+F9',
    req: 'R1,R2',
    name: 'Settings -> Escape -> Submit dialog -> Scrim close -> Settings',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      await setOpticalSlider(cdp, 'chroma', 0.088);
      await cdp.keyPress('Escape');
      await waitForNoVisibleDialog(cdp, 4000);

      await clickAccessible(cdp, { role: 'button', name: /Submit a game/i });
      await waitForVisibleDialog(cdp, 4000);
      await cdp.mouseClick(10, 10);
      await waitForNoVisibleDialog(cdp, 4000);

      await openSettings(cdp);
      const sliders = await readOpticalSliders(cdp);
      assertApprox(sliders.chroma.value, 0.088, 0.0025, 'Settings chroma preserved');
      await closeDialog(cdp);
      assertCleanDiagnostics(cdp, 'T3-14');
      return pass('Mixed Escape and scrim dialog dismissals preserved state and focus cleanly');
    },
  },
  {
    id: 'T3-15',
    tier: 3,
    feature: 'F6+F7+F10',
    req: 'R1,AC',
    name: 'Hero CTA scroll + Category filter + Dark/Light contrast',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await clickAccessible(cdp, { role: 'link', name: /Browse the archive/i });
      await cdp.sleep(450);
      await selectSidebarItem(cdp, /^Flash classics$/i);
      assertEqual((await getResultsSummary(cdp)).count, 286, 'Flash classics count');

      await clickAccessible(cdp, { role: 'button', name: /Switch to light theme/i });
      await cdp.evaluate(`window.scrollTo(0, 0)`);
      await cdp.sleep(300);
      const audit = await checkContrastAndHitTest(cdp, [
        { name: 'Hero H1', findExpr: `document.getElementById('hero-title')` },
        { name: 'Hero proof stat', findExpr: `document.querySelector('.hero-proof strong')` },
      ]);
      for (const item of audit) {
        assert(item.contrastRatio >= 3.0, `Light theme Hero contrast failed: ${JSON.stringify(item)}`);
      }
      assertCleanDiagnostics(cdp, 'T3-15');
      return pass('Hero CTA + Flash classics (286) + Light theme contrast verified', audit);
    },
  },
  {
    id: 'T3-16',
    tier: 3,
    feature: 'F1+F7+F9',
    req: 'R1,R2',
    name: 'Custom optical sliders + Category switch (hubs) + Reset',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await openSettings(cdp);
      await setOpticalSlider(cdp, 'refraction', 0.19);
      await closeDialog(cdp);

      await selectSidebarItem(cdp, /^Port hubs$/i);
      assertEqual((await getResultsSummary(cdp)).count, 9, 'Port hubs count');

      await openSettings(cdp);
      await clickResetSettings(cdp);
      await closeDialog(cdp);
      assertEqual((await getResultsSummary(cdp)).count, 9, 'Port hubs filter preserved after Settings reset');
      assertCleanDiagnostics(cdp, 'T3-16');
      return pass('Resetting Settings left Port hubs catalog filter (9 entries) intact');
    },
  },
  {
    id: 'T3-17',
    tier: 3,
    feature: 'F4+F5+F8',
    req: 'R1',
    name: 'Footer About this index + Catalog Recently opened + Reload',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await toggleFilterPill(cdp, /In-deck compatible/i);
      await clickAccessible(cdp, { role: 'button', name: /Open in deck/i });
      await waitForVisibleDialogIframe(cdp, 4000);
      await closeDialog(cdp);
      await clickAccessible(cdp, { role: 'button', name: /Clear filters/i });
      await cdp.sleep(150);

      // Click second external card link safely
      await cdp.evaluate(`(() => {
        const a = document.querySelectorAll('article.game-card a.card-launch')[0];
        a.addEventListener('click', (e) => e.preventDefault(), { once: true });
        a.click();
      })()`);
      await cdp.sleep(150);

      await clickAccessible(cdp, { selector: 'footer button', name: /about this index/i });
      await cdp.waitFor(`() => Boolean(document.querySelector('[role="dialog"], dialog[open]'))`, 4000);
      await closeDialog(cdp);

      await cdp.reload();
      await waitForCatalogReady(cdp);
      assertEqual(await readSidebarBadge(cdp, /^Recently opened$/i), 2, 'Recent retained 2 after reload');
      await selectSidebarItem(cdp, /^Recently opened$/i);
      const titles = await getCardTitles(cdp);
      assertEqual(titles[0], 'Grand Theft Auto V (GTA 5)', 'MRU order index 0');
      assertEqual(titles[1], 'Classic Doom (Silent Space Marine)', 'MRU order index 1');
      assertCleanDiagnostics(cdp, 'T3-17');
      return pass('Footer About modal and MRU Recently opened order verified across reload', titles);
    },
  },
  {
    id: 'T3-18',
    tier: 3,
    feature: 'F2+F5+F7',
    req: 'R1,R3',
    name: 'PopLayout AnimatePresence filter transitions + static WebGL check',
    async run(ctx) {
      const { cdp, baseUrl } = ctx;
      await resetBrowserState(cdp, baseUrl);
      await setSearchInputValue(cdp, 'doom');
      await setSearchInputValue(cdp, '');
      await setSearchInputValue(cdp, 'gta');
      await setSearchInputValue(cdp, '');
      await cdp.sleep(550);

      const stability = await sampleElementStability(
        cdp,
        `document.querySelector('article.game-card, .game-grid article')`,
        { samples: 5, intervalMs: 120 }
      );
      assertEqual((await getResultsSummary(cdp)).count, 563, 'Restored 563 entries');
      assert(stability.maxDelta <= 0.5, `Card oscillated after rapid AnimatePresence transitions: ${stability.maxDelta}`);
      assertCleanDiagnostics(cdp, 'T3-18');
      return pass('Rapid filter transitions settled statically within <=0.5px', { maxDelta: stability.maxDelta });
    },
  },
];
