import test from 'node:test';
import assert from 'node:assert/strict';
import { get } from 'node:http';
import { createPlaygroundServer } from '../server.mjs';

test('local UI boundaries, preview, live dispatch, and sanitized errors', async t => {
  let calls = 0;
  const server = createPlaygroundServer({ apiKey: 'secret-test-key', evaluate: async (text, options) => {
    calls++; assert.equal(options.apiKey, 'secret-test-key');
    if (text === 'fail') throw new Error('secret-test-key');
    return { model: 'mock', decision: { queue: 'billing' } };
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
  assert.equal((await post({ ...input, live: true })).status, 200); assert.equal(calls, 1);
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
    return { model: 'mock', decision: { queue: 'billing' } };
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
