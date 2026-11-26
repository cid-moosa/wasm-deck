import { decodePng, diffRegion, regionStats } from '../png.mjs';
import {
  SHARED_DOM_HELPERS,
  clickAccessible,
  locateElement,
  readSliderInfo,
  setSliderValue,
  sampleElementStability,
  checkViewportOverflow,
  checkContrastAndHitTest,
  findVisibleDialog,
  hasVisibleDialog,
  waitForVisibleDialog,
  waitForNoVisibleDialog,
  waitForVisibleDialogIframe,
} from '../selectors.mjs';

export function getDpr(cdp) {
  return cdp.getViewport().deviceScaleFactor || 1;
}

export function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

export function assertApprox(actual, expected, tolerance, message) {
  if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance) {
    throw new Error(
      `${message}: expected ${expected} ± ${tolerance}, got ${actual}`
    );
  }
}

export function assertCleanDiagnostics(cdp, contextLabel = 'test') {
  if (cdp.pageErrors.length > 0) {
    throw new Error(
      `Uncaught page error(s) during ${contextLabel}: ${cdp.pageErrors.map((e) => e.text).join(' | ')}`
    );
  }
  if (cdp.consoleErrors.length > 0) {
    throw new Error(
      `Console error(s) during ${contextLabel}: ${cdp.consoleErrors.map((e) => e.text).join(' | ')}`
    );
  }
  if (cdp.localHttpFailures.length > 0) {
    throw new Error(
      `Local HTTP failure(s) during ${contextLabel}: ${cdp.localHttpFailures
        .map((f) => `${f.status} ${f.url}`)
        .join(' | ')}`
    );
  }
}

export const SCENE_META = {
  bamboo: { label: /bamboo/i, testId: 'scene-bamboo' },
  cyberpunk: { label: /cyberpunk/i, testId: 'scene-cyberpunk' },
  ocean: { label: /deep ocean|ocean/i, testId: 'scene-ocean' },
  nebula: { label: /cosmic nebula|nebula/i, testId: 'scene-nebula' },
  procedural: { label: /offline procedural|procedural/i, testId: 'scene-procedural' },
};

export const PRESET_META = {
  apple: {
    label: /apple vision/i,
    testId: 'preset-apple',
    values: { refraction: 0.08, chroma: 0.045, specular: 1.5, bevel: 0.085 },
  },
  water: {
    label: /water ripple/i,
    testId: 'preset-water',
    values: { refraction: 0.12, chroma: 0.03, specular: 2.0, bevel: 0.09 },
  },
  prism: {
    label: /prism rainbow/i,
    testId: 'preset-prism',
    values: { refraction: 0.14, chroma: 0.095, specular: 2.5, bevel: 0.11 },
  },
  mercury: {
    label: /heavy liquid|mercury/i,
    testId: 'preset-mercury',
    values: { refraction: 0.19, chroma: 0.02, specular: 3.2, bevel: 0.13 },
  },
};

export const SLIDER_META = {
  refraction: { label: /refraction|ior/i, testId: 'slider-refraction', min: 0.0, max: 0.22, step: 0.005 },
  chroma: { label: /chromatic dispersion|dispersion|chroma/i, testId: 'slider-chroma', min: 0.0, max: 0.1, step: 0.002 },
  specular: { label: /specular gloss|specular/i, testId: 'slider-specular', min: 0.2, max: 3.5, step: 0.1 },
  bevel: { label: /curvature bevel|bevel/i, testId: 'slider-bevel', min: 0.02, max: 0.18, step: 0.005 },
};

export async function waitForCatalogReady(cdp, timeoutMs = 12000) {
  await cdp.waitFor(
    `() => {
      const spinner = document.querySelector('.loading-state, .loading-spinner');
      if (spinner) return false;
      const cards = document.querySelectorAll('article, .game-card');
      const empty = document.querySelector('.empty-state');
      const live = document.querySelector('.results-toolbar [aria-live="polite"], [aria-live="polite"]');
      const txt = live?.textContent || '';
      return cards.length > 0 || Boolean(empty) || /\\d+\\s+entr/i.test(txt);
    }`,
    timeoutMs
  );
  // Allow entrance motion to settle slightly
  await cdp.sleep(250);
}

export async function openSettings(cdp) {
  const existing = await hasVisibleDialog(cdp);
  if (!existing) {
    try {
      await clickAccessible(cdp, { role: 'button', name: /^settings$/i });
    } catch {
      try {
        await clickAccessible(cdp, { testId: 'settings-button' });
      } catch {
        await clickAccessible(cdp, { role: 'button', name: /settings|glass/i });
      }
    }
    await waitForVisibleDialog(cdp, 5000);
    await cdp.sleep(250);
  }
}

export async function closeDialog(cdp) {
  const open = await hasVisibleDialog(cdp);
  if (!open) return;
  try {
    await clickAccessible(cdp, {
      withinDialog: true,
      role: 'button',
      name: /^close( dialog)?$/i,
    });
  } catch {
    await cdp.keyPress('Escape');
  }
  await waitForNoVisibleDialog(cdp, 4000);
  await cdp.sleep(150);
}

export async function selectScene(cdp, sceneId) {
  const meta = SCENE_META[sceneId];
  if (!meta) throw new Error(`Unknown sceneId: ${sceneId}`);
  try {
    await clickAccessible(cdp, { withinDialog: true, testId: meta.testId });
  } catch {
    await clickAccessible(cdp, { withinDialog: true, role: 'button', name: meta.label });
  }
  await cdp.sleep(350);
}

export async function selectPreset(cdp, presetKey) {
  const meta = PRESET_META[presetKey];
  if (!meta) throw new Error(`Unknown presetKey: ${presetKey}`);
  try {
    await clickAccessible(cdp, { withinDialog: true, testId: meta.testId });
  } catch {
    await clickAccessible(cdp, { withinDialog: true, role: 'button', name: meta.label });
  }
  await cdp.sleep(250);
}

export async function clickResetSettings(cdp) {
  try {
    await clickAccessible(cdp, { withinDialog: true, testId: 'reset-settings' });
  } catch {
    await clickAccessible(cdp, { withinDialog: true, role: 'button', name: /reset/i });
  }
  await cdp.sleep(250);
}

export async function readOpticalSliders(cdp) {
  const result = {};
  for (const [key, meta] of Object.entries(SLIDER_META)) {
    let info;
    try {
      info = await readSliderInfo(cdp, meta.testId, { stepHint: meta.step });
    } catch {
      info = await readSliderInfo(cdp, meta.label, { stepHint: meta.step });
    }
    result[key] = info;
  }
  return result;
}

export async function setOpticalSlider(cdp, key, value) {
  const meta = SLIDER_META[key];
  if (!meta) throw new Error(`Unknown optical slider key: ${key}`);
  let updated;
  try {
    updated = await setSliderValue(cdp, meta.testId, value, { stepHint: meta.step });
  } catch {
    updated = await setSliderValue(cdp, meta.label, value, { stepHint: meta.step });
  }
  await cdp.sleep(220);
  return updated;
}

export async function readActivePresetAndScene(cdp) {
  return cdp.evaluate(`(() => {
    ${SHARED_DOM_HELPERS}
    const dialog = findVisibleDialog();
    if (!dialog) return { activePreset: null, activeScene: null, customVisible: false };
    const buttons = Array.from(dialog.querySelectorAll('button, [role="radio"], [role="button"]'));
    function hasAriaActive(el) {
      return (
        el.getAttribute('aria-pressed') === 'true' ||
        el.getAttribute('aria-checked') === 'true' ||
        el.getAttribute('aria-selected') === 'true' ||
        el.getAttribute('aria-current') === 'true' ||
        el.getAttribute('data-state') === 'active' ||
        el.getAttribute('data-state') === 'checked' ||
        el.getAttribute('data-state') === 'on' ||
        el.getAttribute('data-active') === 'true' ||
        el.classList.contains('is-active') ||
        el.classList.contains('is-selected')
      );
    }
    function styleSignature(el) {
      const cs = window.getComputedStyle(el);
      return [cs.backgroundColor, cs.borderColor, cs.boxShadow, cs.outlineColor].join('|');
    }
    function detectActiveInGroup(items) {
      for (const [key, btn] of items) {
        if (btn && hasAriaActive(btn)) return key;
      }
      const present = items.filter(([, btn]) => Boolean(btn));
      if (present.length >= 3) {
        const sigCounts = new Map();
        const sigs = present.map(([key, btn]) => {
          const sig = styleSignature(btn);
          sigCounts.set(sig, (sigCounts.get(sig) || 0) + 1);
          return [key, sig];
        });
        if (sigCounts.size === 2) {
          const unique = sigs.filter(([, sig]) => sigCounts.get(sig) === 1);
          if (unique.length === 1) return unique[0][0];
        }
      }
      return null;
    }

    const presetMap = [
      ['apple', /apple vision/i, 'preset-apple'],
      ['water', /water ripple/i, 'preset-water'],
      ['prism', /prism rainbow/i, 'preset-prism'],
      ['mercury', /heavy liquid|mercury/i, 'preset-mercury'],
    ];
    const presetButtons = presetMap.map(([key, rx, tid]) => [
      key,
      buttons.find((b) => b.getAttribute('data-testid') === tid || rx.test(b.textContent || b.getAttribute('aria-label') || '')),
    ]);
    const activePreset = detectActiveInGroup(presetButtons);

    const sceneMap = [
      ['bamboo', /bamboo/i, 'scene-bamboo'],
      ['cyberpunk', /cyberpunk/i, 'scene-cyberpunk'],
      ['ocean', /ocean/i, 'scene-ocean'],
      ['nebula', /nebula/i, 'scene-nebula'],
      ['procedural', /procedural/i, 'scene-procedural'],
    ];
    const sceneButtons = sceneMap.map(([id, rx, tid]) => [
      id,
      buttons.find((b) => b.getAttribute('data-testid') === tid || rx.test(b.textContent || b.getAttribute('aria-label') || '')),
    ]);
    const activeScene = detectActiveInGroup(sceneButtons);

    const customBadge = /\\bcustom\\b/i.test(dialog.textContent || '');
    return { activePreset, activeScene, customVisible: customBadge };
  })()`);
}

export async function getResultsSummary(cdp) {
  return cdp.evaluate(`(() => {
    const toolbar = document.querySelector('.results-toolbar');
    const live = toolbar?.querySelector('[aria-live="polite"]') || document.querySelector('[aria-live="polite"]');
    const text = (live?.textContent || '').replace(/\\s+/g, ' ').trim();
    const countMatch = /^(\\d+|—)\\s+entr/i.exec(text);
    const filterMatch = /(\\d+)\\s+filter/i.exec(text);
    const loadMoreBtn = document.querySelector('button.load-more') || Array.from(document.querySelectorAll('button')).find((b) => /^Load \\d+ more/i.test((b.textContent || '').trim()));
    const showingEl = document.querySelector('.load-more-wrap span');
    const cards = Array.from(document.querySelectorAll('article.game-card, .game-grid > article, article'));
    const heading = document.querySelector('.catalog-heading h2')?.textContent?.trim() || '';
    return {
      rawText: text,
      count: countMatch && countMatch[1] !== '—' ? parseInt(countMatch[1], 10) : null,
      activeFilters: filterMatch ? parseInt(filterMatch[1], 10) : 0,
      cardCount: cards.length,
      loadMoreText: loadMoreBtn ? loadMoreBtn.textContent.replace(/\\s+/g, ' ').trim() : null,
      showingText: showingEl ? showingEl.textContent.replace(/\\s+/g, ' ').trim() : null,
      heading,
    };
  })()`);
}

export async function getCardTitles(cdp) {
  return cdp.evaluate(`Array.from(document.querySelectorAll('article.game-card h3, .game-grid article h3, article h3')).map((el) => el.textContent.trim())`);
}

export async function setSearchInputValue(cdp, query) {
  const box = await locateElement(cdp, { selector: 'input[type="search"], [role="searchbox"]' });
  assert(box, 'Search input not found');
  await cdp.mouseClick(box.cx, box.cy);
  await cdp.evaluate(`(() => {
    const input = document.querySelector('input[type="search"], [role="searchbox"]');
    if (!input) throw new Error('Search input missing');
    input.focus();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
  if (query.length > 0) {
    await cdp.typeText(query);
  }
  await cdp.sleep(150);
}

export async function selectSidebarItem(cdp, labelRegex) {
  const rx = labelRegex instanceof RegExp ? { source: labelRegex.source, flags: labelRegex.flags } : { source: String(labelRegex), flags: 'i' };
  const target = await cdp.evaluate(`(() => {
    const re = new RegExp(${JSON.stringify(rx.source)}, ${JSON.stringify(rx.flags)});
    const buttons = Array.from(document.querySelectorAll('.catalog-sidebar button, aside button'));
    for (const btn of buttons) {
      const label = (btn.querySelector('span:not(.category-marker)')?.textContent || btn.textContent || '').replace(/\\s+/g, ' ').trim();
      if (re.test(label)) {
        btn.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
        const r = btn.getBoundingClientRect();
        const badgeText = btn.querySelector('b')?.textContent?.trim() || null;
        return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, label, badgeText };
      }
    }
    return null;
  })()`);
  assert(target, `Sidebar button matching ${labelRegex} not found`);
  await cdp.mouseClick(target.cx, target.cy);
  await cdp.sleep(150);
  return target;
}

export async function readSidebarBadge(cdp, labelRegex) {
  const rx = labelRegex instanceof RegExp ? { source: labelRegex.source, flags: labelRegex.flags } : { source: String(labelRegex), flags: 'i' };
  return cdp.evaluate(`(() => {
    const re = new RegExp(${JSON.stringify(rx.source)}, ${JSON.stringify(rx.flags)});
    const buttons = Array.from(document.querySelectorAll('.catalog-sidebar button, aside button'));
    for (const btn of buttons) {
      const label = (btn.querySelector('span:not(.category-marker)')?.textContent || btn.textContent || '').replace(/\\s+/g, ' ').trim();
      if (re.test(label)) {
        const b = btn.querySelector('b')?.textContent?.trim() || '';
        return /^\\d+$/.test(b) ? parseInt(b, 10) : b;
      }
    }
    return null;
  })()`);
}

export async function toggleFilterPill(cdp, labelRegex) {
  const info = await clickAccessible(cdp, { selector: '.filter-pill, .filter-buttons button', name: labelRegex });
  await cdp.sleep(150);
  const pressed = await cdp.evaluate(`(() => {
    const pills = Array.from(document.querySelectorAll('.filter-pill, .filter-buttons button'));
    const re = new RegExp(${JSON.stringify(labelRegex.source)}, ${JSON.stringify(labelRegex.flags)});
    const p = pills.find((el) => re.test(el.textContent || el.getAttribute('aria-label') || ''));
    return p ? p.getAttribute('aria-pressed') === 'true' : null;
  })()`);
  return { ...info, pressed };
}

export async function setSortValue(cdp, sortValue) {
  const ok = await cdp.evaluate(`(() => {
    const sel = document.querySelector('.sort-control select, select');
    if (!sel) return false;
    sel.value = ${JSON.stringify(sortValue)};
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return sel.value === ${JSON.stringify(sortValue)};
  })()`);
  assert(ok, `Failed to set sort value to ${sortValue}`);
  await cdp.sleep(180);
}

export async function getExteriorBackgroundRect(cdp) {
  return cdp.evaluate(`(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Try safe top-right or right-margin strip below header, avoiding dialog/cards
    const candidates = [
      { x: Math.max(8, vw - 80), y: 110, width: 64, height: 64 },
      { x: 12, y: 110, width: 64, height: 64 },
      { x: Math.max(8, vw - 80), y: Math.max(8, vh - 80), width: 64, height: 64 },
    ];
    for (const c of candidates) {
      if (c.x + c.width <= vw && c.y + c.height <= vh) return c;
    }
    return { x: 8, y: 90, width: 48, height: 48 };
  })()`);
}

export async function getDialogBevelRect(cdp) {
  return cdp.evaluate(`(() => {
    ${SHARED_DOM_HELPERS}
    const d = findVisibleDialog();
    if (!d) return null;
    const r = d.getBoundingClientRect();
    // Pure outer bevel border strip (stays outside p-8 32px interior text)
    return {
      x: Math.max(0, Math.round(r.left + 1)),
      y: Math.max(0, Math.round(r.top + 1)),
      width: 24,
      height: 24,
    };
  })()`);
}

export async function readStoredGlassSettings(cdp) {
  return cdp.evaluate(`(() => {
    try {
      return JSON.parse(window.localStorage.getItem('wasmdeck:glass-settings') || 'null');
    } catch {
      return null;
    }
  })()`);
}

export async function captureDecoded(cdp) {
  const buf = await cdp.screenshot();
  return decodePng(buf);
}

/**
 * Measures pure background-drift baseline over `waitMs` with unchanged sliders,
 * then runs `mutateFn`, captures `imgAfter`, and isolates optical parameter change
 * from background-drift noise.
 */
export async function measureOpticalDelta(cdp, rect, mutateFn, { baselineWaitMs = 450, settleMs = 240 } = {}) {
  const dpr = getDpr(cdp);
  const imgDrift0 = await captureDecoded(cdp);
  await cdp.sleep(baselineWaitMs);
  const imgDrift1 = await captureDecoded(cdp);
  const baselineDrift = diffRegion(imgDrift0, imgDrift1, rect, dpr, 2);
  const baseStats0 = regionStats(imgDrift0, rect, dpr);
  const baseStats1 = regionStats(imgDrift1, rect, dpr);

  const t0 = Date.now();
  const mutationResult = await mutateFn();
  await cdp.sleep(settleMs);
  const elapsedMs = Math.max(1, Date.now() - t0);
  const imgAfter = await captureDecoded(cdp);

  const diff = diffRegion(imgDrift1, imgAfter, rect, dpr, 2);
  const statsAfter = regionStats(imgAfter, rect, dpr);
  const expectedDrift = (baselineDrift.meanAbsDiff / Math.max(1, baselineWaitMs)) * elapsedMs;
  const stored = await readStoredGlassSettings(cdp);

  return {
    dpr,
    mutationResult,
    diff,
    baselineDrift,
    expectedDrift,
    baseStats0,
    statsBefore: baseStats1,
    statsAfter,
    stored,
  };
}

export function assertOpticalDelta(result, { label = 'Optical change', minDiff = 0.15, driftFactor = 1.25 } = {}) {
  const threshold = Math.max(minDiff, result.expectedDrift * driftFactor + minDiff);
  assert(
    result.diff.meanAbsDiff > threshold,
    `${label} indistinguishable from background drift (diff=${result.diff.meanAbsDiff.toFixed(3)}, expectedDrift=${result.expectedDrift.toFixed(3)}, threshold=${threshold.toFixed(3)}, baseline=${result.baselineDrift.meanAbsDiff.toFixed(3)})`
  );
}

export async function resetBrowserState(cdp, baseUrl, options = {}) {
  const {
    clearStorage = true,
    waitCatalog = true,
    viewport = { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false, touch: false },
  } = options;

  await cdp.clearInterceptions();
  await cdp.setPrefersReducedMotion(false);
  await cdp.setViewport(viewport);
  await cdp.navigate(baseUrl);
  if (clearStorage) {
    await cdp.evaluate(`(() => {
      window.localStorage.clear();
      return true;
    })()`);
    await cdp.reload();
  }
  cdp.clearDiagnostics();
  if (waitCatalog) {
    await waitForCatalogReady(cdp);
  }
}

export {
  SHARED_DOM_HELPERS,
  decodePng,
  diffRegion,
  regionStats,
  clickAccessible,
  locateElement,
  readSliderInfo,
  setSliderValue,
  sampleElementStability,
  checkViewportOverflow,
  checkContrastAndHitTest,
  findVisibleDialog,
  hasVisibleDialog,
  waitForVisibleDialog,
  waitForNoVisibleDialog,
  waitForVisibleDialogIframe,
};
