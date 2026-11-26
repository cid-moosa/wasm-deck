/**
 * Strictly opaque-box accessible selector helpers, slider drivers (native <input type="range">
 * and Radix [role="slider"]), bounding-box stability samplers, viewport overflow checks, and
 * contrast + elementFromPoint hit-test auditors.
 */

export const SHARED_DOM_HELPERS = `
  function isVisible(el) {
    if (!el || !(el instanceof Element)) return false;
    if (typeof el.checkVisibility === 'function') {
      if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) {
        return false;
      }
    }
    let cur = el;
    while (cur && cur.nodeType === 1) {
      const style = window.getComputedStyle(cur);
      if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
        return false;
      }
      cur = cur.parentElement;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function getAccessibleName(el) {
    if (!el) return '';
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.trim();
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const parts = labelledBy
        .split(/\\s+/)
        .map((id) => document.getElementById(id)?.textContent?.trim() || '')
        .filter(Boolean);
      if (parts.length) return parts.join(' ');
    }
    if (el.id) {
      const label = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
      if (label?.textContent) return label.textContent.trim();
    }
    const wrappingLabel = el.closest('label');
    if (wrappingLabel?.textContent) return wrappingLabel.textContent.trim();
    const title = el.getAttribute('title');
    if (title) return title.trim();
    return (el.textContent || '').replace(/\\s+/g, ' ').trim();
  }

  function matchesPattern(text, pattern) {
    if (!pattern) return true;
    if (pattern.source !== undefined && pattern.flags !== undefined) {
      return new RegExp(pattern.source, pattern.flags).test(text);
    }
    return text.toLowerCase().includes(String(pattern).toLowerCase());
  }

  function findVisibleDialog() {
    const dialogs = document.querySelectorAll('[role="dialog"], dialog[open]');
    for (const d of dialogs) {
      if (isVisible(d)) return d;
    }
    return null;
  }

  function hasVisibleDialog() {
    return Boolean(findVisibleDialog());
  }

  function countVisibleDialogs() {
    return Array.from(document.querySelectorAll('[role="dialog"], dialog[open]')).filter(isVisible).length;
  }

  function findByCriteria(opts) {
    const scopeRoot = opts.withinDialog
      ? (findVisibleDialog() || document)
      : document;

    if (opts.testId) {
      const byTestId = Array.from(scopeRoot.querySelectorAll('[data-testid="' + opts.testId + '"]')).find(isVisible);
      if (byTestId) return byTestId;
    }

    if (opts.selector) {
      const candidates = Array.from(scopeRoot.querySelectorAll(opts.selector)).filter(isVisible);
      if (!opts.namePattern && !opts.textPattern) {
        return candidates[opts.index || 0] || null;
      }
      const matched = candidates.filter((el) => {
        const name = getAccessibleName(el);
        const rawText = (el.textContent || '').replace(/\\s+/g, ' ').trim();
        if (opts.namePattern && matchesPattern(name, opts.namePattern)) return true;
        if (opts.textPattern && matchesPattern(rawText, opts.textPattern)) return true;
        return false;
      });
      return matched[opts.index || 0] || null;
    }

    const roleSelectors = {
      button: 'button, [role="button"]',
      link: 'a[href], [role="link"]',
      slider: 'input[type="range"], [role="slider"]',
      searchbox: 'input[type="search"], [role="searchbox"]',
      textbox: 'input[type="text"], input[type="search"], textarea, [role="textbox"]',
      dialog: '[role="dialog"], dialog[open]',
      combobox: 'select, [role="combobox"]',
      option: 'option, [role="option"]',
    };

    const querySel = opts.role
      ? (roleSelectors[opts.role] || '[role="' + opts.role + '"]')
      : 'button, a[href], input, select, [role="button"], [role="slider"], [role="link"], [role="dialog"], dialog[open]';

    const candidates = Array.from(scopeRoot.querySelectorAll(querySel)).filter(isVisible);
    const matched = candidates.filter((el) => {
      const name = getAccessibleName(el);
      const rawText = (el.textContent || '').replace(/\\s+/g, ' ').trim();
      if (opts.namePattern && matchesPattern(name, opts.namePattern)) return true;
      if (opts.textPattern && matchesPattern(rawText, opts.textPattern)) return true;
      if (!opts.namePattern && !opts.textPattern) return true;
      return false;
    });
    return matched[opts.index || 0] || null;
  }
`;

function serializePattern(pattern) {
  if (!pattern) return null;
  if (pattern instanceof RegExp) {
    return { source: pattern.source, flags: pattern.flags };
  }
  return String(pattern);
}

export async function findVisibleDialog(cdp) {
  return cdp.evaluate(`(() => {
    ${SHARED_DOM_HELPERS}
    const d = findVisibleDialog();
    if (!d) return null;
    const r = d.getBoundingClientRect();
    return {
      role: d.getAttribute('role') || d.tagName.toLowerCase(),
      labelledBy: d.getAttribute('aria-labelledby') || null,
      rect: { x: r.left, y: r.top, left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height },
      text: (d.textContent || '').replace(/\\s+/g, ' ').trim(),
    };
  })()`);
}

export async function hasVisibleDialog(cdp) {
  return cdp.evaluate(`(() => {
    ${SHARED_DOM_HELPERS}
    return hasVisibleDialog();
  })()`);
}

export async function waitForVisibleDialog(cdp, timeoutMs = 4000) {
  await cdp.waitFor(
    `() => {
      ${SHARED_DOM_HELPERS}
      const d = findVisibleDialog();
      if (!d) return false;
      const r = d.getBoundingClientRect();
      return r.width > 50 && r.height > 50;
    }`,
    timeoutMs
  );
}

export async function waitForNoVisibleDialog(cdp, timeoutMs = 4000) {
  await cdp.waitFor(
    `() => {
      ${SHARED_DOM_HELPERS}
      return !findVisibleDialog();
    }`,
    timeoutMs
  );
}

export async function waitForVisibleDialogIframe(cdp, timeoutMs = 5000) {
  await cdp.waitFor(
    `() => {
      ${SHARED_DOM_HELPERS}
      const d = findVisibleDialog();
      return Boolean(d && d.querySelector('iframe'));
    }`,
    timeoutMs
  );
}

/**
 * Finds an element by accessible criteria (role/name/text/testId/selector), scrolls it into view,
 * and returns its bounding rect and center coordinates.
 */
export async function locateElement(cdp, criteria) {
  const payload = {
    role: criteria.role || null,
    testId: criteria.testId || null,
    selector: criteria.selector || null,
    withinDialog: Boolean(criteria.withinDialog),
    index: criteria.index || 0,
    namePattern: serializePattern(criteria.name),
    textPattern: serializePattern(criteria.text),
  };

  const result = await cdp.evaluate(`(() => {
    ${SHARED_DOM_HELPERS}
    const opts = ${JSON.stringify(payload)};
    const el = findByCriteria(opts);
    if (!el) return null;
    el.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
    const r = el.getBoundingClientRect();
    return {
      tagName: el.tagName.toLowerCase(),
      name: getAccessibleName(el),
      disabled: Boolean(el.disabled || el.getAttribute('aria-disabled') === 'true'),
      ariaPressed: el.getAttribute('aria-pressed'),
      href: el.getAttribute('href'),
      rect: { x: r.left, y: r.top, left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height },
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
    };
  })()`);

  return result;
}

/**
 * Locates an interactive element via accessible criteria and clicks its center with CDP mouseClick.
 */
export async function clickAccessible(cdp, criteria) {
  const info = await locateElement(cdp, criteria);
  if (!info) {
    throw new Error(`Accessible element not found: ${JSON.stringify(criteria)}`);
  }
  if (info.disabled) {
    throw new Error(`Target element "${info.name}" is disabled`);
  }
  await cdp.mouseClick(info.cx, info.cy);
  return info;
}

/**
 * Finds a slider either by label/aria-label regex or data-testid, supporting both
 * native <input type="range"> and Radix [role="slider"].
 */
function sliderFinderSnippet(labelOrTestId) {
  const serialized =
    labelOrTestId instanceof RegExp
      ? { isRegex: true, source: labelOrTestId.source, flags: labelOrTestId.flags }
      : { isRegex: false, text: String(labelOrTestId) };

  return `
    ${SHARED_DOM_HELPERS}
    function findTargetSlider() {
      const target = ${JSON.stringify(serialized)};
      const scope = findVisibleDialog() || document;
      if (!target.isRegex) {
        const byTestId = Array.from(scope.querySelectorAll('[data-testid="' + target.text + '"]')).find(isVisible);
        if (byTestId) {
          if (byTestId.matches('input[type="range"], [role="slider"]')) return byTestId;
          const nested = byTestId.querySelector('input[type="range"], [role="slider"]');
          if (nested) return nested;
        }
      }

      const sliders = Array.from(scope.querySelectorAll('input[type="range"], [role="slider"]')).filter(isVisible);
      for (const s of sliders) {
        const name = getAccessibleName(s);
        // Also check parent control block text if aria-label is absent
        const containerText = s.closest('div, section, label')?.textContent?.replace(/\\s+/g, ' ').trim() || '';
        const matchTarget = target.isRegex
          ? new RegExp(target.source, target.flags)
          : new RegExp(target.text.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'), 'i');
        if (matchTarget.test(name) || (!name && matchTarget.test(containerText))) {
          return s;
        }
      }

      // Secondary pass checking container label text even if slider has partial aria-label
      for (const s of sliders) {
        const container = s.closest('[data-testid], .control-row, .setting-row, div') || s.parentElement;
        const containerText = container?.textContent?.replace(/\\s+/g, ' ').trim() || '';
        const matchTarget = target.isRegex
          ? new RegExp(target.source, target.flags)
          : new RegExp(target.text.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'), 'i');
        if (matchTarget.test(containerText)) {
          return s;
        }
      }
      return null;
    }
  `;
}

function inferOpticalStep({ attrStep, stepHint, name, containerText, min, max }) {
  if (Number.isFinite(attrStep) && attrStep > 0) return attrStep;
  if (Number.isFinite(stepHint) && stepHint > 0) return stepHint;
  const label = `${name || ''} ${containerText || ''}`;
  if (/chroma|dispersion/i.test(label) || (Math.abs(min) < 1e-6 && Math.abs(max - 0.1) < 1e-5)) {
    return 0.002;
  }
  if (/specular|gloss/i.test(label) || (Math.abs(min - 0.2) < 1e-5 && Math.abs(max - 3.5) < 1e-5)) {
    return 0.1;
  }
  if (
    /refraction|ior|bevel/i.test(label) ||
    (Math.abs(min) < 1e-6 && Math.abs(max - 0.22) < 1e-5) ||
    (Math.abs(min - 0.02) < 1e-5 && Math.abs(max - 0.18) < 1e-5)
  ) {
    return 0.005;
  }
  return 0.005;
}

export async function readSliderInfo(cdp, labelOrTestId, options = {}) {
  const stepHint = options?.stepHint ?? null;
  const info = await cdp.evaluate(`(() => {
    ${sliderFinderSnippet(labelOrTestId)}
    const el = findTargetSlider();
    if (!el) return null;
    el.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
    const r = el.getBoundingClientRect();
    const isNative = el.tagName.toLowerCase() === 'input' && el.type === 'range';
    if (isNative) {
      return {
        kind: 'native',
        min: parseFloat(el.min || '0'),
        max: parseFloat(el.max || '100'),
        step: parseFloat(el.step || '1'),
        value: parseFloat(el.value),
        disabled: Boolean(el.disabled),
        rect: { x: r.left, y: r.top, width: r.width, height: r.height },
      };
    }
    const track =
      el.parentElement?.closest('[data-orientation]') ||
      el.closest('[data-slot="slider"]') ||
      el.parentElement;
    const tr = track ? track.getBoundingClientRect() : r;
    const rawStep =
      el.getAttribute('step') ||
      el.getAttribute('data-step') ||
      track?.getAttribute('data-step') ||
      track?.getAttribute('step');
    const attrStep = rawStep !== null && rawStep !== undefined ? parseFloat(rawStep) : null;
    const min = parseFloat(el.getAttribute('aria-valuemin') ?? '0');
    const max = parseFloat(el.getAttribute('aria-valuemax') ?? '100');
    const name = getAccessibleName(el);
    const containerText = (el.closest('[data-testid], .control-row, .setting-row, div') || el.parentElement)?.textContent?.replace(/\\s+/g, ' ').trim() || '';
    return {
      kind: 'radix',
      min,
      max,
      attrStep: Number.isFinite(attrStep) && attrStep > 0 ? attrStep : null,
      name,
      containerText,
      value: parseFloat(el.getAttribute('aria-valuenow') ?? '0'),
      disabled: el.getAttribute('aria-disabled') === 'true',
      rect: { x: r.left, y: r.top, width: r.width, height: r.height },
      trackRect: { x: tr.left, y: tr.top, width: tr.width, height: tr.height },
    };
  })()`);

  if (!info) {
    throw new Error(`Slider not found: ${String(labelOrTestId)}`);
  }
  if (info.kind === 'radix') {
    info.step = inferOpticalStep({
      attrStep: info.attrStep,
      stepHint,
      name: info.name,
      containerText: info.containerText,
      min: info.min,
      max: info.max,
    });
  }
  return info;
}

export async function setSliderValue(cdp, labelOrTestId, targetValue, options = {}) {
  const info = await readSliderInfo(cdp, labelOrTestId, options);
  const clamped = Math.max(info.min, Math.min(info.max, Number(targetValue)));

  if (info.kind === 'native') {
    const updated = await cdp.evaluate(`(() => {
      ${sliderFinderSnippet(labelOrTestId)}
      const el = findTargetSlider();
      if (!el) throw new Error('Native slider disappeared');
      el.focus();
      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(el, ${JSON.stringify(String(clamped))});
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return parseFloat(el.value);
    })()`);
    await cdp.sleep(40);
    return updated;
  }

  // Radix [role="slider"]: click track proportion + keyboard fine-tuning
  const track = info.trackRect && info.trackRect.width > 10 ? info.trackRect : info.rect;
  const ratio = info.max === info.min ? 0 : (clamped - info.min) / (info.max - info.min);
  const targetX = track.x + Math.max(1, Math.min(track.width - 1, ratio * track.width));
  const targetY = track.y + track.height / 2;

  await cdp.mouseClick(targetX, targetY);
  await cdp.sleep(40);

  // Focus thumb & use Home/End or ArrowRight/ArrowLeft if needed
  await cdp.evaluate(`(() => {
    ${sliderFinderSnippet(labelOrTestId)}
    const el = findTargetSlider();
    if (el) el.focus();
  })()`);

  if (Math.abs(clamped - info.min) < 1e-6) {
    await cdp.keyPress('Home');
    await cdp.sleep(30);
    return (await readSliderInfo(cdp, labelOrTestId, options)).value;
  }
  if (Math.abs(clamped - info.max) < 1e-6) {
    await cdp.keyPress('End');
    await cdp.sleep(30);
    return (await readSliderInfo(cdp, labelOrTestId, options)).value;
  }

  let current = (await readSliderInfo(cdp, labelOrTestId, options)).value;
  const step = info.step || 0.005;
  const stepTol = Math.max(1e-6, Math.min(0.0005, step * 0.4));
  const seen = new Set([current.toFixed(6)]);
  let bestVal = current;
  let bestDist = Math.abs(current - clamped);

  for (let i = 0; i < 60 && Math.abs(current - clamped) > stepTol; i++) {
    const dir = current < clamped ? 'ArrowRight' : 'ArrowLeft';
    await cdp.keyPress(dir);
    await cdp.sleep(15);
    const nextVal = (await readSliderInfo(cdp, labelOrTestId, options)).value;
    if (Math.abs(nextVal - current) < 1e-7) break;

    const nextDist = Math.abs(nextVal - clamped);
    if (nextDist < bestDist) {
      bestDist = nextDist;
      bestVal = nextVal;
    }

    const key = nextVal.toFixed(6);
    if (seen.has(key)) {
      // Oscillation guard: non-aligned target bounced between adjacent steps
      if (nextDist > bestDist + 1e-7) {
        await cdp.keyPress(dir === 'ArrowRight' ? 'ArrowLeft' : 'ArrowRight');
        await cdp.sleep(15);
        current = (await readSliderInfo(cdp, labelOrTestId, options)).value;
      } else {
        current = nextVal;
      }
      break;
    }
    seen.add(key);
    current = nextVal;
  }

  return current;
}

/**
 * Samples getBoundingClientRect() of an element found by `findExpr` (an expression returning Element)
 * across multiple intervals (optionally sweeping pointer across it) to assert static DOM geometry.
 */
export async function sampleElementStability(
  cdp,
  findExpr,
  { samples = 5, intervalMs = 150, sweepPointer = false } = {}
) {
  const rects = [];
  for (let i = 0; i < samples; i++) {
    const rect = await cdp.evaluate(`(() => {
      ${SHARED_DOM_HELPERS}
      const el = (${findExpr});
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, width: r.width, height: r.height };
    })()`);
    if (!rect) {
      throw new Error(`Element disappeared during stability sampling: ${findExpr}`);
    }
    rects.push(rect);

    if (sweepPointer && i < samples - 1) {
      const frac = (i + 1) / samples;
      const px = rect.x + rect.width * (0.2 + 0.6 * frac);
      const py = rect.y + rect.height * (0.25 + 0.5 * ((i % 2 === 0) ? frac : 1 - frac));
      await cdp.mouseMove(px, py);
    }

    if (i < samples - 1) {
      await cdp.sleep(intervalMs);
    }
  }

  const base = rects[0];
  let maxDelta = 0;
  for (let i = 1; i < rects.length; i++) {
    const r = rects[i];
    const delta = Math.max(
      Math.abs(r.x - base.x),
      Math.abs(r.y - base.y),
      Math.abs(r.width - base.width),
      Math.abs(r.height - base.height)
    );
    if (delta > maxDelta) maxDelta = delta;
  }

  return { maxDelta, initialRect: base, rects };
}

/**
 * Checks document horizontal overflow and whether interactive controls are clipped past viewport edge.
 */
export async function checkViewportOverflow(cdp) {
  return cdp.evaluate(`(() => {
    const innerWidth = window.innerWidth;
    const innerHeight = window.innerHeight;
    const scrollWidth = document.documentElement.scrollWidth;
    const clippedControls = [];

    const controls = document.querySelectorAll('button, a[href], input, select, [role="slider"]');
    for (const el of controls) {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      // Ignore items off-screen vertically or inside horizontal scroll strip
      if (r.bottom < 0 || r.top > innerHeight) continue;
      const scroller = el.closest('.sidebar-group, [data-horizontal-scroll="true"]');
      if (scroller) {
        const sStyle = window.getComputedStyle(scroller);
        if (sStyle.overflowX === 'auto' || sStyle.overflowX === 'scroll') continue;
      }
      if (r.right > innerWidth + 2 || r.left < -2) {
        clippedControls.push({
          text: (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 40),
          left: Math.round(r.left),
          right: Math.round(r.right),
          innerWidth,
        });
      }
    }

    return {
      innerWidth,
      innerHeight,
      scrollWidth,
      overflow: scrollWidth > innerWidth + 1,
      clippedControls,
    };
  })()`);
}

/**
 * Audits foreground/background color separation (WCAG contrast / luminance delta) and
 * document.elementFromPoint hit-testing for a list of target expressions.
 */
export async function checkContrastAndHitTest(cdp, targets) {
  return cdp.evaluate(`(() => {
    ${SHARED_DOM_HELPERS}
    function parseRgb(str) {
      const m = /rgba?\\(([^)]+)\\)/.exec(str || '');
      if (!m) return null;
      const parts = m[1].split(',').map((s) => parseFloat(s.trim()));
      return { r: parts[0] || 0, g: parts[1] || 0, b: parts[2] || 0, a: parts[3] === undefined ? 1 : parts[3] };
    }
    function srgbToLinear(c) {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }
    function relLum(rgb) {
      return 0.2126 * srgbToLinear(rgb.r) + 0.7152 * srgbToLinear(rgb.g) + 0.0722 * srgbToLinear(rgb.b);
    }
    function effectiveBackground(el) {
      const layers = [];
      let cur = el;
      while (cur && cur instanceof Element) {
        const bg = parseRgb(window.getComputedStyle(cur).backgroundColor);
        if (bg && bg.a > 0.01) layers.push(bg);
        cur = cur.parentElement;
      }
      const theme = document.querySelector('[data-theme]')?.getAttribute('data-theme') || 'dark';
      let acc = theme === 'light' ? { r: 238, g: 242, b: 247, a: 1 } : { r: 10, g: 12, b: 20, a: 1 };
      for (let i = layers.length - 1; i >= 0; i--) {
        const fg = layers[i];
        acc = {
          r: fg.r * fg.a + acc.r * (1 - fg.a),
          g: fg.g * fg.a + acc.g * (1 - fg.a),
          b: fg.b * fg.a + acc.b * (1 - fg.a),
          a: 1,
        };
      }
      return acc;
    }

    const specs = ${JSON.stringify(targets)};
    const results = [];
    for (const spec of specs) {
      const el = eval(spec.findExpr);
      if (!el) {
        results.push({ name: spec.name, found: false });
        continue;
      }
      el.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
      const r = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      const fg = parseRgb(cs.color) || { r: 255, g: 255, b: 255, a: 1 };
      const bg = effectiveBackground(el);
      const l1 = relLum(fg);
      const l2 = relLum(bg);
      const contrastRatio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

      const cx = Math.min(window.innerWidth - 2, Math.max(2, r.left + r.width / 2));
      const cy = Math.min(window.innerHeight - 2, Math.max(2, r.top + r.height / 2));
      const hitEl = document.elementFromPoint(cx, cy);
      const hitOk = Boolean(hitEl && (hitEl === el || el.contains(hitEl) || hitEl.contains(el)));

      results.push({
        name: spec.name,
        found: true,
        color: cs.color,
        effectiveBg: 'rgb(' + Math.round(bg.r) + ',' + Math.round(bg.g) + ',' + Math.round(bg.b) + ')',
        contrastRatio: Number(contrastRatio.toFixed(2)),
        hitOk,
        hitTag: hitEl ? hitEl.tagName.toLowerCase() : null,
      });
    }
    return results;
  })()`);
}
