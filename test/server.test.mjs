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

test('session key lifecycle is local, validated, non-disclosing and cleared without fallback', async t => {
  let calls = 0;
  const server = createPlaygroundServer({ apiKey: 'environment-test-key', evaluate: async (_text, options) => {
    calls++; assert.equal(options.apiKey, 'session-test-key'); return evaluatorReply();
  } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const key = (body, headers = {}) => fetch(base + '/api/key', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, ...headers }, body: JSON.stringify(body) });
  assert.equal((await key({ apiKey: 'session-test-key' })).status, 200);
  assert.equal(calls, 0);
  for (const bad of ['', 'a b', 'a\nb', 'x'.repeat(4097), 12, null]) {
    const response = await key({ apiKey: bad });
    assert.equal(response.status, bad === null ? 200 : 400);
  }
  assert.equal((await key({ apiKey: 'session-test-key' }, { Origin: 'https://attacker.example' })).status, 403);
  assert.equal((await key({ apiKey: 'session-test-key' }, { Origin: '' })).status, 403);
  assert.equal((await key({ apiKey: 'session-test-key' }, { 'Content-Type': 'text/plain' })).status, 415);
  const saved = await key({ apiKey: 'session-test-key' });
  assert.ok(!(await saved.text()).includes('session-test-key'));
  const triage = () => fetch(base + '/api/triage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'Refund', threshold: 0.8, live: true }) });
  assert.equal((await triage()).status, 200); assert.equal(calls, 1);
  for (const path of ['/', '/app.js', '/api/status']) assert.ok(!(await (await fetch(base + path)).text()).includes('session-test-key'));
  assert.equal((await key({ apiKey: null })).status, 200);
  assert.equal((await (await fetch(base + '/api/status')).json()).configured, false);
  assert.equal((await triage()).status, 503); assert.equal(calls, 1);
});

test('agent endpoint stays offline and preserves execution consent and local boundaries', async t => {
  const server=createPlaygroundServer({apiKey:'',evaluate:()=>assert.fail('No provider call')});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
  const base=`http://127.0.0.1:${server.address().port}`;
  const body={text:'calculate: 12 + 3',mode:'baseline',threshold:.8,execute:false};
  const post=(data,headers={})=>fetch(base+'/api/agent',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(data)});
  const response=await post(body);assert.equal(response.status,200);assert.equal((await response.json()).status,'suggested');
  assert.equal((await (await post({...body,execute:true})).json()).execution.output,15);
  assert.equal((await post({...body,mode:'live'})).status,400);
  assert.equal((await post({...body,tool:'shell'})).status,400);
  assert.equal((await post(body,{Origin:'https://attacker.example'})).status,403);
  assert.equal((await post(body,{'Content-Type':'text/plain'})).status,415);
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
    const base = `http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(base + '/api/key', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: null }) })).status, 409);
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

test('evidence explorer selects frozen reports and recalculates policy without changing predictions or files', async t => {
  const server = createPlaygroundServer({ apiKey: '', evaluate: () => assert.fail('Recorded exploration must not dispatch') });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}/api/evidence/`;
  for (const [id, unique, attempts, correct] of [['legacy', 16, 16, 16], ['v2', 48, 144, 144], ['v3', 48, 144, 124]]) {
    const file = new URL(`../doc/results/${id === 'legacy' ? 'jev-test' : `benchmark-${id}-live`}-2026-09-21.json`, import.meta.url);
    const before = await readFile(file);
    const response = await fetch(base + id);
    assert.equal(response.status, 200);
    const view = await response.json();
    assert.equal(view.api_calls, 0);
    assert.equal(view.metadata.unique_cases, unique);
    assert.equal(view.metadata.planned_attempts, attempts);
    assert.equal(view.cases.length, attempts);
    assert.equal(Math.round(view.diagnostics.model.accuracy * attempts), correct);
    assert.equal(view.summary_matches_recorded, true);
    assert.equal(view.metadata.threshold, 0.8);
    assert.deepEqual(await readFile(file), before);
  }
  const frozen = await (await fetch(base + 'v3')).json();
  const lower = await (await fetch(base + 'v3?threshold=0.5')).json();
  assert.equal(lower.metadata.recorded_threshold, 0.8);
  assert.equal(lower.metadata.threshold, 0.5);
  assert.equal(lower.summary.automatically_routed, 99);
  assert.equal(lower.diagnostics.wrong_auto_routes, 9);
  assert.equal(lower.agreed.routing.wrong_auto_routes, 3);
  assert.equal(frozen.agreed.classification.attempts, 126);
  assert.equal(frozen.agreed.agreed_cases, 42);
  assert.equal(frozen.cases.filter(c => c.reference_status === 'disputed').length, 18);
  assert.deepEqual(lower.cases.map(c => [c.id, c.pass, c.prediction]), frozen.cases.map(c => [c.id, c.pass, c.prediction]));
  assert.equal(frozen.cases.find(c => c.id === 'v3-test-24').decision.action, 'review');
  assert.equal(lower.cases.find(c => c.id === 'v3-test-24').decision.action, 'route');
  assert.deepEqual(await (await fetch(base + 'v3')).json(), frozen);
});

test('evidence projection strips unknown response fields and sanitizes corrupt artifacts', async t => {
  const original = JSON.parse(await readFile(new URL('../doc/results/benchmark-v3-live-2026-09-21.json', import.meta.url)));
  let report = structuredClone(original);
  report.private = report.rows[0].private = report.rows[0].result.private = 'PRIVATE_MARKER';
  const server = createPlaygroundServer({ apiKey: '', readReport: async () => report });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const url = `http://127.0.0.1:${server.address().port}/api/evidence/v3`;
  const clean = await fetch(url);
  assert.equal(clean.status, 200);
  assert.ok(!(await clean.text()).includes('PRIVATE_MARKER'));
  report.metrics = { private: 'PRIVATE_MARKER' };
  const mismatch = await (await fetch(url)).json();
  assert.equal(mismatch.summary_matches_recorded, false);
  assert.equal(mismatch.cases.length, 144);
  report.rows[0].result.answers.department.choice = 'PRIVATE_MARKER';
  const invalid = await fetch(url);
  assert.equal(invalid.status, 503);
  assert.deepEqual(await invalid.json(), { error: 'Recorded report unavailable.' });
});

test('evidence endpoint rejects unapproved paths and malformed thresholds before loading data', async t => {
  const server = createPlaygroundServer({ readReport: () => assert.fail('Invalid requests must not load reports') });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}/api/evidence/`;
  for (const path of ['unknown', 'v3?path=.env', 'v3?threshold=0.5&threshold=0.8', 'v3?threshold=', 'v3?threshold=NaN', 'v3?threshold=-1', 'v3?threshold=1.1', '%2e%2e%2f.env', '__proto__']) {
    assert.ok([400, 404].includes((await fetch(base + path)).status), path);
  }
});
