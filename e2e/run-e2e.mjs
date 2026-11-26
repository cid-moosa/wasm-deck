import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { launchBrowser } from './cdp.mjs';
import { startServer } from './server.mjs';
import * as png from './png.mjs';
import * as selectors from './selectors.mjs';
import { runSelfTest } from './self-test.mjs';
import { tier1Tests } from './tiers/tier1-features.mjs';
import { tier2Tests } from './tiers/tier2-boundaries.mjs';
import { tier3Tests } from './tiers/tier3-cross-feature.mjs';
import { tier4Tests } from './tiers/tier4-scenarios.mjs';

function parseArgs(argv) {
  const opts = {
    selfTest: false,
    url: '',
    tier: 'all',
    filter: '',
    swiftshader: false,
    mode: 'dev',
    reportDir: path.join(os.tmpdir(), 'wasmdeck-e2e-report'),
    keepScreenshots: '',
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--self-test' || arg === '--dry-run') {
      opts.selfTest = true;
    } else if (arg === '--swiftshader') {
      opts.swiftshader = true;
    } else if (arg === '--url' && argv[i + 1]) {
      opts.url = argv[++i];
    } else if (arg === '--tier' && argv[i + 1]) {
      opts.tier = argv[++i];
    } else if (arg === '--filter' && argv[i + 1]) {
      opts.filter = argv[++i];
    } else if (arg === '--mode' && argv[i + 1]) {
      opts.mode = argv[++i];
    } else if (arg === '--report-dir' && argv[i + 1]) {
      opts.reportDir = argv[++i];
    } else if (arg === '--keep-screenshots' && argv[i + 1]) {
      opts.keepScreenshots = argv[++i];
    } else if (arg === '--help' || arg === '-h') {
      console.log(`WASM//DECK Opaque-Box E2E Runner

Usage:
  node e2e/run-e2e.mjs [options]

Options:
  --self-test, --dry-run   Validate 124-test registry, catalog.json (563), & CDP WebGL/PNG smoke fixture
  --url <baseUrl>          Target an already-running server (e.g. http://localhost:5173/)
  --tier <1|2|3|4|all>     Run specific tier or all tiers (default: all)
  --filter <substring>     Filter tests by ID or name substring
  --swiftshader            Force headless SwiftShader WebGL software rendering
  --mode <dev|preview>     Vite mode when auto-starting isolated server (default: dev)
  --report-dir <dir>       Output directory for e2e-report.json & e2e-report.md
  --keep-screenshots <dir> Save failure/diagnostic screenshots to <dir>
`);
      process.exit(0);
    }
  }
  return opts;
}

function selectTests(tier, filter) {
  let pool;
  if (tier === '1') pool = tier1Tests;
  else if (tier === '2') pool = tier2Tests;
  else if (tier === '3') pool = tier3Tests;
  else if (tier === '4') pool = tier4Tests;
  else if (tier === 'all') pool = [...tier1Tests, ...tier2Tests, ...tier3Tests, ...tier4Tests];
  else throw new Error(`Invalid --tier value: ${tier} (expected 1|2|3|4|all)`);

  if (!filter) return pool;
  const q = filter.toLowerCase();
  return pool.filter((t) => t.id.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || t.feature.toLowerCase().includes(q));
}

function writeReports(reportDir, summary) {
  fs.mkdirSync(reportDir, { recursive: true });
  const jsonPath = path.join(reportDir, 'e2e-report.json');
  const mdPath = path.join(reportDir, 'e2e-report.md');

  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2), 'utf8');

  const lines = [
    `# WASM//DECK E2E Test Report`,
    `- **Timestamp**: ${summary.timestamp}`,
    `- **Base URL**: ${summary.baseUrl}`,
    `- **SwiftShader**: ${summary.swiftshader}`,
    `- **Total**: ${summary.total} | **Passed**: ${summary.passed} | **Failed**: ${summary.failed}`,
    `- **Duration**: ${(summary.durationMs / 1000).toFixed(2)}s`,
    ``,
    `| ID | Tier | Feature | Req | Status | Duration (ms) | Details |`,
    `|---|---:|---|---|---|---:|---|`,
  ];

  for (const r of summary.results) {
    const safeDetails = String(r.details || r.error || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
    lines.push(`| ${r.id} | ${r.tier} | ${r.feature} | ${r.req} | ${r.status.toUpperCase()} | ${r.durationMs} | ${safeDetails} |`);
  }

  fs.writeFileSync(mdPath, lines.join('\n') + '\n', 'utf8');
  return { jsonPath, mdPath };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const startedAt = Date.now();

  if (opts.selfTest) {
    console.log(`[E2E] Running --self-test (swiftshader=${opts.swiftshader})...`);
    const res = await runSelfTest({ swiftshader: opts.swiftshader });
    console.log(`[E2E] Registry verified: ${res.registrySummary.total} tests (${res.registrySummary.tier1} T1 + ${res.registrySummary.tier2} T2 + ${res.registrySummary.tier3} T3 + ${res.registrySummary.tier4} T4)`);
    console.log(`[E2E] Catalog ground truth verified: ${res.catalogSummary.total} games, ${res.catalogSummary.popular} popular, ${res.catalogSummary.multiplayer} multiplayer, iframe=${res.catalogSummary.iframeId}`);
    console.log(`[E2E] Fixture CDP/WebGL/PNG/Stability check passed:`, JSON.stringify(res.fixtureChecks));
    console.log(`[E2E] SELF-TEST PASSED in ${Date.now() - startedAt}ms`);
    process.exit(0);
  }

  const tests = selectTests(opts.tier, opts.filter);
  if (tests.length === 0) {
    console.error('[E2E] No tests matched selection.');
    process.exit(1);
  }

  console.log(`[E2E] Starting target server (mode=${opts.mode}, url=${opts.url || 'auto'})...`);
  const server = await startServer({ url: opts.url, mode: opts.mode });
  console.log(`[E2E] Target ready at ${server.baseUrl} (managed=${server.managed})`);

  if (opts.keepScreenshots) {
    fs.mkdirSync(opts.keepScreenshots, { recursive: true });
  }

  let cdp = null;
  const results = [];
  let passed = 0;
  let failed = 0;

  try {
    cdp = await launchBrowser({ swiftshader: opts.swiftshader, baseUrl: server.baseUrl });
    const ctx = {
      cdp,
      baseUrl: server.baseUrl,
      png,
      sel: selectors,
    };

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      const tStart = Date.now();
      try {
        const out = await test.run(ctx);
        const durationMs = Date.now() - tStart;
        passed++;
        results.push({
          id: test.id,
          tier: test.tier,
          feature: test.feature,
          req: test.req,
          name: test.name,
          status: 'passed',
          durationMs,
          details: out?.details || 'passed',
          metrics: out?.metrics || {},
        });
        console.log(`[PASS] (${i + 1}/${tests.length}) ${test.id} - ${test.name} (${durationMs}ms)`);
      } catch (err) {
        const durationMs = Date.now() - tStart;
        failed++;
        let screenshotPath = null;
        if (opts.keepScreenshots && cdp) {
          try {
            const buf = await cdp.screenshot();
            screenshotPath = path.join(opts.keepScreenshots, `${test.id}.png`);
            fs.writeFileSync(screenshotPath, buf);
          } catch {
            // ignore screenshot failure
          }
        }
        results.push({
          id: test.id,
          tier: test.tier,
          feature: test.feature,
          req: test.req,
          name: test.name,
          status: 'failed',
          durationMs,
          error: err?.message || String(err),
          screenshotPath,
        });
        console.error(`[FAIL] (${i + 1}/${tests.length}) ${test.id} - ${test.name} (${durationMs}ms): ${err?.message || err}`);
      }
    }
  } finally {
    if (cdp) {
      await cdp.close();
    }
    await server.close();
  }

  const summary = {
    timestamp: new Date().toISOString(),
    baseUrl: server.baseUrl,
    swiftshader: opts.swiftshader,
    tier: opts.tier,
    filter: opts.filter || null,
    total: tests.length,
    passed,
    failed,
    durationMs: Date.now() - startedAt,
    results,
  };

  const { jsonPath, mdPath } = writeReports(opts.reportDir, summary);
  console.log(`\n[E2E] Summary: ${passed}/${tests.length} passed, ${failed} failed (${(summary.durationMs / 1000).toFixed(2)}s)`);
  console.log(`[E2E] Report JSON: ${jsonPath}`);
  console.log(`[E2E] Report MD:   ${mdPath}`);

  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('[E2E] Fatal harness error:', err);
  process.exit(1);
});
