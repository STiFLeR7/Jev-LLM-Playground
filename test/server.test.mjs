import test from 'node:test';
import assert from 'node:assert/strict';
import { get } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { questions } from '../playground.mjs';
import { createPlaygroundServer } from '../server.mjs';

const historical = JSON.parse(await readFile(new URL('../doc/results/jev-test-2026-09-21.json', import.meta.url))).rows[0].result;

function evaluatorReply(overrides = {}) {
  return { ...structuredClone(historical), ...overrides };
}

test('local UI boundaries, preview, live dispatch, and sanitized errors', async t => {
  let calls = 0;
  const server = createPlaygroundServer({ apiKey: 'secret-test-key', evaluate: async (text, options) => {
    calls++; assert.equal(options.apiKey, 'secret-test-key');
    if (text === 'fail') throw new Error('secret-test-key');
    if (text === 'malformed') return { model: 'mock' };
    if (text === 'invalid latency') return evaluatorReply({ latency_ms: Infinity });
    return evaluatorReply({ debug: 'PRIVATE_MARKER' });
  } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (body, headers = {}) => fetch(`${base}/api/triage`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  for (const path of ['/', '/app.js', '/style.css', '/api/status']) {
    const response = await fetch(base + path); assert.equal(response.status, 200);
    assert.ok(!(await response.text()).includes('secret-test-key'));
    assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  }
  assert.equal((await fetch(base + '/.env')).status, 404);
  const badHostStatus = await new Promise((resolve, reject) => get(base, { headers: { Host: 'attacker.example' } }, response => { response.resume(); resolve(response.statusCode); }).on('error', reject));
  assert.equal(badHostStatus, 403);
  const input = { text: 'Refund ₹500 please', threshold: 0.8, live: false };
  const preview = await (await post(input)).json(); assert.equal(preview.api_calls, 0); assert.equal(preview.request.state.ticket, input.text); assert.equal(calls, 0);
  assert.equal((await post(input, { Origin: 'https://attacker.example' })).status, 403);
  assert.equal((await post(input, { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await post('{')).status, 400);
  assert.equal((await post({ ...input, threshold: '0.8' })).status, 400);
  assert.equal((await post({ ...input, text: 'x'.repeat(20001) })).status, 400);
  assert.equal((await post('x'.repeat(128001))).status, 413);
  const liveResponse = await post({ ...input, live: true });
  assert.equal(liveResponse.status, 200); assert.equal(calls, 1);
  const live = await liveResponse.json();
  assert.deepEqual(Object.keys(live), ['mode', 'model', 'answers', 'usage', 'latency_ms', 'decision', 'trace', 'questions']);
  assert.equal(live.mode, 'live');
  assert.equal(live.threshold, undefined);
  assert.equal(live.trace.threshold, input.threshold);
  assert.deepEqual(live.decision, historical.decision);
  assert.deepEqual(live.trace.decision, live.decision);
  assert.deepEqual(live.questions, questions);
  assert.ok(Number.isFinite(live.latency_ms) && live.latency_ms >= 0);
  assert.ok(!JSON.stringify(live).includes('PRIVATE_MARKER'));
  assert.equal((await post({ ...input, live: true, text: 'malformed' })).status, 502);
  assert.equal((await post({ ...input, live: true, text: 'invalid latency' })).status, 502);
  const failed = await post({ ...input, live: true, text: 'fail' }); assert.equal(failed.status, 502); assert.ok(!(await failed.text()).includes('secret-test-key'));
});

test('missing credentials prevent live requests', async t => {
  const server = createPlaygroundServer({ apiKey: '', evaluate: () => assert.fail('Must not call provider') });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/triage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'Refund', threshold: 0.8, live: true }) });
  assert.equal(response.status, 503);
});

test('concurrent live requests are rejected and the lock releases after success or failure', async t => {
  let release, entered, block = true, rejectFirst = false, calls = 0;
  const server = createPlaygroundServer({ apiKey: 'fake', evaluate: async () => {
    calls++;
    if (block) { entered(); await new Promise(resolve => { release = resolve; }); }
    if (rejectFirst) throw new Error('PRIVATE_PROVIDER');
    return evaluatorReply();
  } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { release?.(); server.close(resolve); server.closeAllConnections(); }));
  const post = () => fetch(`http://127.0.0.1:${server.address().port}/api/triage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'Refund', threshold: 0.8, live: true }) });
  for (const shouldFail of [false, true]) {
    block = true; rejectFirst = shouldFail;
    const started = new Promise(resolve => { entered = resolve; });
    const first = post(); await started;
    const before = calls;
    assert.equal((await post()).status, 429); assert.equal(calls, before);
    release(); assert.equal((await first).status, shouldFail ? 502 : 200);
    block = false; rejectFirst = false;
    assert.equal((await post()).status, 200);
  }
});

test('fixed recorded report endpoint is keyless, allowlisted, and makes no evaluator calls', async t => {
  const fixtureUrl = new URL('../doc/results/jev-test-2026-09-21.json', import.meta.url);
  const before = createHash('sha256').update(await readFile(fixtureUrl)).digest('hex');
  let calls = 0;
  const server = createPlaygroundServer({ apiKey: '', evaluate: () => { calls++; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${base}/api/reports/support-routing-2026-09-21`);
  assert.equal(response.status, 200);
  const view = await response.json();
  assert.equal(view.api_calls, 0);
  assert.equal(view.cases.length, 16);
  assert.equal(calls, 0);
  for (const path of ['/api/reports/other', '/api/reports/support-routing-2026-09-21?path=.env', '/doc/results/jev-test-2026-09-21.json']) {
    assert.equal((await fetch(base + path)).status, 404);
  }
  assert.equal((await fetch(`${base}/api/reports/support-routing-2026-09-21`, { headers: { Origin: 'https://attacker.example' } })).status, 403);
  assert.equal(createHash('sha256').update(await readFile(fixtureUrl)).digest('hex'), before);
});

test('recorded report endpoint sanitizes missing and malformed report failures', async t => {
  for (const readReport of [async () => { throw new Error('D:\\private\\report.json'); }, async () => ({ secret: 'PRIVATE_MARKER' })]) {
    const server = createPlaygroundServer({ readReport });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/reports/support-routing-2026-09-21`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'Recorded report unavailable.' });
  }
});
