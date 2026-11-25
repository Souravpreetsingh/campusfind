#!/usr/bin/env node
/**
 * Minimal runtime smoke test for a running CampusFind instance.
 * No secrets or credentials are read or printed.
 */

const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3001').replace(/\/$/, '');

const checks = [
  { path: '/api/health', label: 'GET /api/health', expected: 200 },
  { path: '/api/ready', label: 'GET /api/ready', expected: 200 },
  { path: '/', label: 'GET /', expected: 200 },
  { path: '/campus-lost-found', label: 'GET /campus-lost-found', expected: 200 },
  { path: '/advanced-search', label: 'GET /advanced-search', expected: 200 },
  { path: '/login', label: 'GET /login', expected: 200 },
];

async function run() {
  const results = [];
  for (const check of checks) {
    try {
      const response = await fetch(`${BASE_URL}${check.path}`, {
        method: 'GET',
        headers: { Accept: 'text/html,application/json' },
        redirect: 'manual',
      });
      results.push({
        label: check.label,
        status: response.status,
        expected: check.expected,
        ok: response.status === check.expected,
      });
      await response.body?.cancel();
    } catch (error) {
      results.push({
        label: check.label,
        status: 'ERROR',
        expected: check.expected,
        ok: false,
        message: error instanceof Error ? error.message : 'request failed',
      });
    }
  }

  console.log(`CampusFind smoke test — ${BASE_URL}`);
  console.log('');
  console.log('| Check | Expected | Actual | Result |');
  console.log('|---|---|---|---|');
  for (const result of results) {
    const detail = result.ok ? 'PASS' : `FAIL${result.message ? `: ${result.message}` : ''}`;
    console.log(
      `| ${result.label} | ${result.expected} | ${result.status} | ${detail} |`,
    );
  }
  console.log('');

  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) {
    console.error(`Smoke test failed: ${failed.length}/${results.length} checks failed.`);
    process.exit(1);
  }
  console.log(`Smoke test passed: ${results.length}/${results.length} checks.`);
}

run().catch((error) => {
  console.error(`Smoke test could not run: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
