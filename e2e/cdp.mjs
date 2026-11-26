import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { getFreePort, killProcessTree } from './server.mjs';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function findEdgeExecutable() {
  const candidates = [
    process.env.EDGE_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(
      process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)',
      'Microsoft',
      'Edge',
      'Application',
      'msedge.exe'
    ),
    path.join(process.env.LocalAppData || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {
      // continue
    }
  }
  throw new Error(`Microsoft Edge binary (msedge.exe) not found. Checked: ${candidates.join(', ')}`);
}

const KEY_DEFS = {
  Escape: { key: 'Escape', code: 'Escape', keyCode: 27 },
  Tab: { key: 'Tab', code: 'Tab', keyCode: 9 },
  Enter: { key: 'Enter', code: 'Enter', keyCode: 13 },
  Backspace: { key: 'Backspace', code: 'Backspace', keyCode: 8 },
  Space: { key: ' ', code: 'Space', keyCode: 32 },
  ' ': { key: ' ', code: 'Space', keyCode: 32 },
  ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
  ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
  ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
  Home: { key: 'Home', code: 'Home', keyCode: 36 },
  End: { key: 'End', code: 'End', keyCode: 35 },
  Delete: { key: 'Delete', code: 'Delete', keyCode: 46 },
};

function resolveKeyDef(key) {
  if (KEY_DEFS[key]) return KEY_DEFS[key];
  if (key.length === 1) {
    const upper = key.toUpperCase();
    const code = /[A-Z]/.test(upper)
      ? `Key${upper}`
      : /[0-9]/.test(key)
        ? `Digit${key}`
        : key;
    return { key, code, keyCode: upper.charCodeAt(0) };
  }
  return { key, code: key, keyCode: 0 };
}

function normalizeModifiers(modifiers) {
  if (typeof modifiers === 'number') return modifiers;
  if (!modifiers || typeof modifiers !== 'object') return 0;
  let mask = 0;
  if (modifiers.altKey || modifiers.alt) mask |= 1;
  if (modifiers.ctrlKey || modifiers.ctrl) mask |= 2;
  if (modifiers.metaKey || modifiers.meta) mask |= 4;
  if (modifiers.shiftKey || modifiers.shift) mask |= 8;
  return mask;
}

function isLocalUrl(targetUrl, baseUrl) {
  if (!targetUrl) return false;
  try {
    const u = new URL(targetUrl);
    if (baseUrl) {
      const b = new URL(baseUrl);
      if (u.origin === b.origin) return true;
    }
    return u.hostname === '127.0.0.1' || u.hostname === 'localhost';
  } catch {
    return false;
  }
}

function matchRule(rule, url) {
  if (typeof rule.match === 'function') return rule.match(url);
  if (rule.match instanceof RegExp) return rule.match.test(url);
  if (typeof rule.match === 'string') return url.includes(rule.match);
  return false;
}

export async function launchBrowser({
  swiftshader = false,
  baseUrl = '',
  timeoutMs = 15000,
  executablePath = findEdgeExecutable(),
} = {}) {
  const debugPort = await getFreePort('127.0.0.1');
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wasmdeck_e2e_edge_'));

  const args = [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-extensions',
    '--mute-audio',
    '--window-size=1440,900',
  ];

  if (swiftshader) {
    args.push('--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader');
  }

  args.push('about:blank');

  const proc = spawn(executablePath, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  const stderrLines = [];
  proc.stderr?.on('data', (chunk) => {
    stderrLines.push(chunk.toString('utf8'));
    if (stderrLines.length > 30) stderrLines.shift();
  });

  // Poll /json/list for a page target
  let wsUrl = null;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) {
      fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 });
      throw new Error(`Edge exited early (${proc.exitCode}): ${stderrLines.join('')}`);
    }
    try {
      const res = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      if (res.ok) {
        const targets = await res.json();
        const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl) || targets[0];
        if (page?.webSocketDebuggerUrl) {
          wsUrl = page.webSocketDebuggerUrl;
          break;
        }
      }
    } catch {
      // retry
    }
    await sleep(100);
  }

  if (!wsUrl) {
    await killProcessTree(proc);
    fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 15, retryDelay: 200 });
    throw new Error(`Timed out waiting for Edge CDP /json/list on port ${debugPort}`);
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WebSocket CDP connection timeout')), 8000);
    ws.addEventListener('open', () => {
      clearTimeout(timer);
      resolve();
    });
    ws.addEventListener('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`WebSocket CDP error: ${err?.message || 'connection failed'}`));
    });
  });

  let nextId = 1;
  const pending = new Map();
  const eventListeners = new Map();

  const consoleErrors = [];
  const consoleWarnings = [];
  const pageErrors = [];
  const localHttpFailures = [];
  const externalHttpFailures = [];
  const requestMeta = new Map();

  let activeRules = [];
  let fetchEnabled = false;
  let currentBaseUrl = baseUrl;
  let currentViewport = {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
    touch: false,
  };

  function send(method, params = {}, callTimeoutMs = 15000) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`CDP timeout calling ${method}`));
      }, callTimeoutMs);

      pending.set(id, { resolve, reject, timer, method });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  function on(method, fn) {
    if (!eventListeners.has(method)) eventListeners.set(method, new Set());
    eventListeners.get(method).add(fn);
    return () => eventListeners.get(method)?.delete(fn);
  }

  ws.addEventListener('message', (event) => {
    let msg;
    try {
      msg = JSON.parse(typeof event.data === 'string' ? event.data : event.data.toString());
    } catch {
      return;
    }

    if (msg.id !== undefined) {
      const entry = pending.get(msg.id);
      if (entry) {
        clearTimeout(entry.timer);
        pending.delete(msg.id);
        if (msg.error) {
          entry.reject(new Error(`CDP ${entry.method} error (${msg.error.code}): ${msg.error.message}`));
        } else {
          entry.resolve(msg.result);
        }
      }
      return;
    }

    if (msg.method) {
      const listeners = eventListeners.get(msg.method);
      if (listeners) {
        for (const fn of listeners) {
          try {
            fn(msg.params);
          } catch {
            // keep event loop alive
          }
        }
      }
    }
  });

  ws.addEventListener('close', () => {
    for (const [id, entry] of pending.entries()) {
      clearTimeout(entry.timer);
      entry.reject(new Error(`CDP WebSocket closed before ${entry.method} completed`));
      pending.delete(id);
    }
  });

  // Wire diagnostics listeners
  on('Runtime.consoleAPICalled', (params) => {
    const text = (params.args || [])
      .map((a) => (a.value !== undefined ? String(a.value) : a.description || a.type || ''))
      .join(' ');
    if (params.type === 'error') {
      consoleErrors.push({ text, timestamp: params.timestamp });
    } else if (params.type === 'warning') {
      consoleWarnings.push({ text, timestamp: params.timestamp });
    }
  });

  on('Runtime.exceptionThrown', (params) => {
    const det = params.exceptionDetails || {};
    const text = det.exception?.description || det.text || 'Uncaught exception';
    pageErrors.push({ text, details: det, timestamp: params.timestamp });
  });

  on('Log.entryAdded', (params) => {
    const entry = params.entry || {};
    if (entry.level === 'error') {
      if (entry.source === 'network' && entry.url && !isLocalUrl(entry.url, currentBaseUrl)) {
        // External third-party network error (e.g., Unsplash or cover art offline) tracked separately
        return;
      }
      consoleErrors.push({
        text: `[${entry.source || 'log'}] ${entry.text || ''}${entry.url ? ` (${entry.url})` : ''}`,
        timestamp: entry.timestamp,
      });
    }
  });

  on('Network.requestWillBeSent', (params) => {
    requestMeta.set(params.requestId, {
      url: params.request?.url || '',
      method: params.request?.method || 'GET',
      type: params.type || 'Other',
    });
  });

  on('Network.responseReceived', (params) => {
    const url = params.response?.url || '';
    const status = params.response?.status || 0;
    if (status >= 400) {
      const record = {
        url,
        status,
        method: requestMeta.get(params.requestId)?.method || 'GET',
        resourceType: params.type || 'Other',
      };
      if (isLocalUrl(url, currentBaseUrl)) {
        localHttpFailures.push(record);
      } else {
        externalHttpFailures.push(record);
      }
    }
  });

  on('Network.loadingFailed', (params) => {
    if (params.canceled) return;
    const meta = requestMeta.get(params.requestId) || { url: '', method: 'GET', type: 'Other' };
    const record = {
      url: meta.url,
      status: 0,
      errorText: params.errorText || 'loadingFailed',
      method: meta.method,
      resourceType: meta.type,
    };
    if (isLocalUrl(meta.url, currentBaseUrl)) {
      localHttpFailures.push(record);
    } else {
      externalHttpFailures.push(record);
    }
  });

  on('Fetch.requestPaused', async (params) => {
    const { requestId, request } = params;
    const reqUrl = request?.url || '';
    let matchedIndex = -1;
    for (let i = 0; i < activeRules.length; i++) {
      if (matchRule(activeRules[i], reqUrl)) {
        matchedIndex = i;
        break;
      }
    }

    if (matchedIndex === -1) {
      await send('Fetch.continueRequest', { requestId }).catch(() => {});
      return;
    }

    const rule = activeRules[matchedIndex];
    if (rule.once) {
      activeRules.splice(matchedIndex, 1);
    }

    if (rule.delayMs && rule.delayMs > 0) {
      await sleep(rule.delayMs);
    }

    if (rule.abort) {
      await send('Fetch.failRequest', {
        requestId,
        errorReason: rule.errorReason || 'Failed',
      }).catch(() => {});
      return;
    }

    const responseHeaders = [];
    const headersObj = {
      'Content-Type': rule.contentType || 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      ...(rule.headers || {}),
    };
    for (const [name, value] of Object.entries(headersObj)) {
      responseHeaders.push({ name, value: String(value) });
    }

    const bodyText = typeof rule.body === 'string' ? rule.body : JSON.stringify(rule.body ?? '');
    await send('Fetch.fulfillRequest', {
      requestId,
      responseCode: rule.status ?? 200,
      responseHeaders,
      body: Buffer.from(bodyText, 'utf8').toString('base64'),
    }).catch(() => {});
  });

  // Enable required CDP domains
  await Promise.all([
    send('Page.enable'),
    send('Runtime.enable'),
    send('Log.enable'),
    send('DOM.enable'),
    send('Network.enable'),
  ]);

  async function evaluate(expression, { awaitPromise = true } = {}) {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise,
    });
    if (res?.exceptionDetails) {
      const desc =
        res.exceptionDetails.exception?.description ||
        res.exceptionDetails.text ||
        'Evaluation exception';
      throw new Error(`Runtime.evaluate failed: ${desc}`);
    }
    return res?.result?.value;
  }

  async function waitFor(fnExpr, timeout = 10000, intervalMs = 50) {
    const waitDeadline = Date.now() + timeout;
    let lastError = null;
    while (Date.now() < waitDeadline) {
      try {
        const ok = await evaluate(`Boolean((${fnExpr})())`);
        if (ok) return true;
        lastError = null;
      } catch (err) {
        lastError = err;
      }
      await sleep(intervalMs);
    }
    throw new Error(
      `waitFor timed out after ${timeout}ms for expression: ${fnExpr}${lastError ? ` (last error: ${lastError.message})` : ''}`
    );
  }

  async function waitDocumentComplete(timeout = 15000) {
    await waitFor(`() => document.readyState === 'complete'`, timeout, 40);
  }

  async function navigate(targetUrl) {
    if (!currentBaseUrl) {
      try {
        currentBaseUrl = new URL(targetUrl).origin;
      } catch {
        // ignore
      }
    }
    await send('Page.navigate', { url: targetUrl });
    await waitDocumentComplete(15000);
  }

  async function reload() {
    await send('Page.reload', { ignoreCache: false });
    await sleep(50);
    await waitDocumentComplete(15000);
  }

  async function screenshot() {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    return Buffer.from(res.data, 'base64');
  }

  async function setViewport({
    width = 1440,
    height = 900,
    deviceScaleFactor = 1,
    mobile = false,
    touch = false,
  } = {}) {
    currentViewport = { width, height, deviceScaleFactor, mobile, touch };
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor,
      mobile,
      screenWidth: width,
      screenHeight: height,
    });
    await send('Emulation.setTouchEmulationEnabled', { enabled: Boolean(touch) });
  }

  async function mouseMove(x, y) {
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: Math.round(x),
      y: Math.round(y),
      button: 'none',
    });
  }

  async function mouseClick(x, y, { button = 'left', clickCount = 1 } = {}) {
    const cx = Math.round(x);
    const cy = Math.round(y);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx, y: cy, button: 'none' });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button, clickCount });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx, y: cy, button, clickCount });
  }

  async function keyPress(key, modifiers = 0) {
    const def = resolveKeyDef(key);
    const modMask = normalizeModifiers(modifiers);
    const base = {
      key: def.key,
      code: def.code,
      windowsVirtualKeyCode: def.keyCode,
      nativeVirtualKeyCode: def.keyCode,
      modifiers: modMask,
    };
    await send('Input.dispatchKeyEvent', { ...base, type: 'keyDown' });
    await send('Input.dispatchKeyEvent', { ...base, type: 'keyUp' });
  }

  async function typeText(text) {
    await send('Input.insertText', { text: String(text) });
  }

  async function setPrefersReducedMotion(enabled) {
    await send('Emulation.setEmulatedMedia', {
      features: [
        {
          name: 'prefers-reduced-motion',
          value: enabled ? 'reduce' : 'no-preference',
        },
      ],
    });
  }

  async function interceptRoutes(rules = []) {
    activeRules = [...rules];
    if (!fetchEnabled) {
      await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
      fetchEnabled = true;
    }
  }

  async function clearInterceptions() {
    activeRules = [];
    if (fetchEnabled) {
      fetchEnabled = false;
      await send('Fetch.disable').catch(() => {});
    }
  }

  async function spyWindowOpen() {
    await evaluate(`(() => {
      window.__e2eWindowOpenCalls = [];
      window.open = function(url, target, features) {
        window.__e2eWindowOpenCalls.push({ url: String(url || ''), target: target || '', features: features || '' });
        return { closed: false, focus() {}, close() {} };
      };
      return true;
    })()`);
  }

  async function getWindowOpenCalls() {
    return (await evaluate(`window.__e2eWindowOpenCalls || []`)) || [];
  }

  function clearDiagnostics() {
    consoleErrors.length = 0;
    consoleWarnings.length = 0;
    pageErrors.length = 0;
    localHttpFailures.length = 0;
    externalHttpFailures.length = 0;
  }

  let closed = false;
  async function close() {
    if (closed) return;
    closed = true;
    try {
      await clearInterceptions();
    } catch {
      // ignore
    }
    try {
      await Promise.race([send('Browser.close', {}, 1500), sleep(1500)]);
    } catch {
      // fallback to process kill
    }
    try {
      ws.close();
    } catch {
      // ignore
    }
    await killProcessTree(proc);
    fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 15, retryDelay: 200 });
  }

  // Apply initial desktop viewport
  await setViewport(currentViewport);

  return {
    executablePath,
    profileDir,
    debugPort,
    pid: proc.pid,
    send,
    on,
    evaluate,
    waitFor,
    sleep,
    navigate,
    reload,
    screenshot,
    setViewport,
    getViewport: () => ({ ...currentViewport }),
    mouseMove,
    mouseClick,
    keyPress,
    typeText,
    setPrefersReducedMotion,
    interceptRoutes,
    clearInterceptions,
    spyWindowOpen,
    getWindowOpenCalls,
    consoleErrors,
    consoleWarnings,
    pageErrors,
    localHttpFailures,
    externalHttpFailures,
    clearDiagnostics,
    setBaseUrl: (u) => {
      currentBaseUrl = u;
    },
    close,
  };
}
