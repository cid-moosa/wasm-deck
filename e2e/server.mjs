import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import fs from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getFreePort(host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, host, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close((err) => {
        if (err) reject(err);
        else resolve(port);
      });
    });
  });
}

async function pollHttpReady(url, timeoutMs = 15000, childRef = null) {
  const deadline = Date.now() + timeoutMs;
  let lastErr = null;
  while (Date.now() < deadline) {
    if (childRef && childRef.exitCode !== null) {
      throw new Error(`Server process exited prematurely with code ${childRef.exitCode}`);
    }
    try {
      const res = await fetch(url, { method: 'GET', redirect: 'manual' });
      if (res.status >= 200 && res.status < 400) {
        return res.status;
      }
      lastErr = new Error(`HTTP ${res.status} from ${url}`);
    } catch (err) {
      lastErr = err;
    }
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${url} after ${timeoutMs}ms: ${lastErr?.message || 'unreachable'}`);
}

export async function killProcessTree(proc) {
  if (!proc || proc.pid == null) return;
  if (proc.exitCode !== null || proc.signalCode !== null) return;

  const exitPromise = new Promise((resolve) => {
    proc.once('exit', resolve);
  });

  if (process.platform === 'win32') {
    try {
      spawnSync('taskkill', ['/T', '/F', '/PID', String(proc.pid)], {
        stdio: 'ignore',
        windowsHide: true,
      });
    } catch {
      try {
        proc.kill('SIGKILL');
      } catch {
        // ignore
      }
    }
  } else {
    try {
      proc.kill('SIGTERM');
    } catch {
      // ignore
    }
  }

  await Promise.race([exitPromise, sleep(2000)]);
}

/**
 * Starts an isolated Vite dev or preview server on 127.0.0.1:<ephemeralPort>,
 * or validates reachability of an externally provided --url / E2E_BASE_URL.
 */
export async function startServer({
  url = process.env.E2E_BASE_URL || '',
  mode = 'dev',
  cwd = process.cwd(),
  timeoutMs = 15000,
} = {}) {
  const normalizedUrl = url ? url.replace(/\/+$/, '') : '';
  if (normalizedUrl) {
    await pollHttpReady(`${normalizedUrl}/`, timeoutMs);
    return {
      baseUrl: normalizedUrl,
      managed: false,
      mode: 'external',
      close: async () => {},
    };
  }

  const viteBin = path.join(cwd, 'node_modules', 'vite', 'bin', 'vite.js');
  if (!fs.existsSync(viteBin)) {
    throw new Error(`Vite CLI not found at ${viteBin}`);
  }

  const port = await getFreePort('127.0.0.1');
  const args =
    mode === 'preview'
      ? [viteBin, 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1']
      : [viteBin, '--port', String(port), '--strictPort', '--host', '127.0.0.1'];

  const logs = [];
  const child = spawn(process.execPath, args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    env: {
      ...process.env,
      NODE_ENV: mode === 'preview' ? 'production' : process.env.NODE_ENV || 'development',
    },
  });

  const pushLog = (chunk) => {
    logs.push(chunk.toString('utf8'));
    if (logs.length > 40) logs.shift();
  };
  child.stdout?.on('data', pushLog);
  child.stderr?.on('data', pushLog);

  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await pollHttpReady(`${baseUrl}/`, timeoutMs, child);
  } catch (err) {
    await killProcessTree(child);
    throw new Error(`${err.message}\nVite output:\n${logs.join('')}`);
  }

  return {
    baseUrl,
    port,
    managed: true,
    mode,
    pid: child.pid,
    getLogs: () => logs.join(''),
    close: async () => {
      await killProcessTree(child);
    },
  };
}

/**
 * Starts an ephemeral local HTTP fixture server for --self-test.
 */
export async function startFixtureServer(htmlOrHandler) {
  const server = http.createServer((req, res) => {
    if (typeof htmlOrHandler === 'function') {
      htmlOrHandler(req, res);
      return;
    }
    const urlPath = (req.url || '/').split('?')[0];
    if (urlPath === '/' || urlPath === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(htmlOrHandler);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    baseUrl,
    port,
    close: async () => {
      await new Promise((resolve) => {
        server.close(() => resolve());
      });
    },
  };
}
