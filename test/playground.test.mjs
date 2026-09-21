import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { questions, requestBody, route, evaluateTicket, summarize, validateResponse } from '../playground.mjs';

function reply() {
  return { model: 'test-model', usage: { input_tokens: 1000, output_tokens: 50 }, answers: {
    department: { type: 'choice', choice: 'billing', confidence: 0.9, probabilities: { billing: 0.9, technical: 0.05, sales: 0.03, other: 0.02 } },
    urgent: { type: 'noul', noul: 0.7 },
    frustration: { type: 'score', score: 1, confidence: 0.8, probabilities: { 0: 0.1, 1: 0.8, 2: 0.1 }, legend: { ...questions.frustration.criteria } },
  } };
}

test('normalizes provider data and rejects contradictory scores', async () => {
  const bad = reply();
  bad.answers.frustration.score = 2;
  assert.throws(() => validateResponse(bad), /Invalid API response/);
  bad.answers.frustration.score = 1.02;
  assert.doesNotThrow(() => validateResponse(bad));
  const data = reply();
  data.answers.extra = { debug: 'PRIVATE_MARKER' };
  data.usage.debug = 'PRIVATE_MARKER';
  data.answers.department.debug = 'PRIVATE_MARKER';
  data.answers.urgent.debug = 'PRIVATE_MARKER';
  data.answers.frustration.legend.extra = 'PRIVATE_MARKER';
  const normalized = validateResponse(data);
  assert.ok(!JSON.stringify(normalized).includes('PRIVATE_MARKER'));
  normalized.answers.department.probabilities.billing = 0;
  assert.equal(data.answers.department.probabilities.billing, 0.9);
  const result = await evaluateTicket('Refund', { apiKey: 'fake', fetchImpl: async () => new Response(JSON.stringify(data)) });
  assert.ok(!JSON.stringify(result).includes('PRIVATE_MARKER'));
  const report = JSON.parse(await readFile(new URL('../doc/results/jev-test-2026-09-21.json', import.meta.url)));
  for (const row of report.rows) assert.doesNotThrow(() => validateResponse(row.result));
});

test('routes only valid, sufficiently confident, in-scope decisions', () => {
  assert.equal(route(reply(), 0.9).action, 'route');
  assert.equal(route(reply(), 0.9001).action, 'review');
  assert.equal(route(reply()).queue, 'billing');
  assert.equal(route(reply(), 0.95).action, 'review');
  const other = reply();
  other.answers.department.choice = 'other';
  other.answers.department.probabilities = { billing: 0.02, technical: 0.05, sales: 0.03, other: 0.9 };
  assert.equal(route(other).queue, 'human_review');
  for (const mutate of [
    d => { delete d.answers.urgent; },
    d => { d.answers.urgent.noul = '0.8'; },
    d => { d.answers.department.confidence = NaN; },
    d => { d.answers.department.choice = 'unknown'; },
    d => { d.answers.department.probabilities.billing = 2; },
    d => { d.answers.frustration.score = 3; },
    d => { d.usage.input_tokens = -1; },
  ]) { const data = reply(); mutate(data); assert.throws(() => route(data), /Invalid API response/); }
  assert.throws(() => requestBody(' '), /Ticket/);
  assert.throws(() => route(reply(), 2), /Threshold/);
});

test('HTTP request contract and error handling never substitute a decision or expose response bodies', async () => {
  const result = await evaluateTicket('Refund please', { apiKey: 'test-key', fetchImpl: async (url, init) => {
    assert.equal(url, 'https://api.typesafe.ai/v1/systemone');
    assert.equal(init.redirect, 'error');
    assert.equal(init.headers.Authorization, 'Bearer test-key');
    assert.deepEqual(JSON.parse(init.body), requestBody('Refund please'));
    return new Response(JSON.stringify(reply()));
  } });
  assert.equal(result.decision.queue, 'billing');
  for (const status of [401, 422, 429, 529]) {
    await assert.rejects(evaluateTicket('Refund', { apiKey: 'test-key', fetchImpl: async () => new Response('PRIVATE CONTENT', { status }) }), new RegExp(`^Error: API returned HTTP ${status};`));
  }
  await assert.rejects(evaluateTicket('Refund', { apiKey: 'test-key', fetchImpl: async () => { throw new Error('PRIVATE CONTENT'); } }), /API connection failed/);
  await assert.rejects(evaluateTicket('Refund', { apiKey: 'test-key', fetchImpl: async () => new Response('not json') }), /invalid JSON/);
  await assert.rejects(evaluateTicket('Refund', { fetchImpl: () => { assert.fail('Must not call network'); } }), /TYPESAFE_API_KEY/);
});

test('timeout aborts the provider request once without exposing its error', async () => {
  let calls = 0, observedSignal;
  await assert.rejects(evaluateTicket('Refund', { apiKey: 'fake', timeoutMs: 10, fetchImpl: async (url, init) => {
    calls++; observedSignal = init.signal;
    return new Promise((resolve, reject) => {
      const guard = setTimeout(() => reject(new Error('PRIVATE_GUARD')), 200);
      init.signal.addEventListener('abort', () => { clearTimeout(guard); reject(init.signal.reason); }, { once: true });
    });
  } }), /API connection failed or timed out/);
  assert.equal(calls, 1);
  assert.equal(observedSignal.aborted, true);
  for (const timeoutMs of [0, -1, NaN, 1.5, 4294967296]) {
    await assert.rejects(evaluateTicket('Refund', { apiKey: 'fake', timeoutMs, fetchImpl: () => assert.fail('Invalid timeout must not call provider') }), /Timeout/);
  }
  let bodyCalls = 0;
  await assert.rejects(evaluateTicket('Refund', { apiKey: 'fake', fetchImpl: async () => {
    bodyCalls++; return { ok: true, json: async () => { throw new Error('PRIVATE_BODY'); } };
  } }), /invalid JSON/);
  assert.equal(bodyCalls, 1);
});

test('metrics keep failed attempts and confidently wrong out-of-scope cases visible', () => {
  const result = { ...reply(), decision: route(reply()), latency_ms: 100 };
  const metrics = summarize([
    { status: 'ok', expected: 'billing', baseline: 'billing', result },
    { status: 'ok', expected: 'other', baseline: 'other', result },
    { status: 'error', expected: 'sales', baseline: 'other' },
  ]);
  assert.equal(metrics.errors, 1);
  assert.equal(metrics.automatic_accuracy, 0.5);
  assert.equal(metrics.automatic_coverage, 2 / 3);
  assert.equal(metrics.out_of_scope_automatically_routed, 1);
  assert.equal(metrics.correct_classifications_per_attempt, 1 / 3);
  assert.equal(metrics.estimated_successful_cost_usd, 0.000084);
  assert.equal(summarize([]).automatic_accuracy, null);
  assert.equal(summarize([]).latency_ms.p95, null);
});

test('synthetic splits and offline CLI work without credentials', async () => {
  const cases = JSON.parse(await readFile(new URL('../data/tickets.json', import.meta.url), 'utf8'));
  assert.equal(cases.length, 32);
  assert.equal(new Set(cases.map(c => c.id)).size, 32);
  for (const split of ['dev', 'test']) assert.equal(cases.filter(c => c.split === split).length, 16);
  const cli = new URL('../playground.mjs', import.meta.url);
  const { fileURLToPath } = await import('node:url');
  for (const args of [['triage', '--text', 'Refund please'], ['eval']]) {
    const run = spawnSync(process.execPath, [fileURLToPath(cli), ...args], { encoding: 'utf8', env: { ...process.env, TYPESAFE_API_KEY: '', JEV_LLM_API: '' } });
    assert.equal(run.status, 0, run.stderr);
    const output = JSON.parse(run.stdout);
    assert.equal(output.api_calls ?? output.summary.api_calls, 0);
  }
});

test('CLI replay is offline and new evaluations identify their inputs and source', async () => {
  const { fileURLToPath } = await import('node:url');
  const cli = fileURLToPath(new URL('../playground.mjs', import.meta.url));
  const run = args => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', env: { ...process.env, TYPESAFE_API_KEY: '', JEV_LLM_API: '' } });
  const replay = run(['replay', '--report', fileURLToPath(new URL('../doc/results/jev-test-2026-09-21.json', import.meta.url))]);
  assert.equal(replay.status, 0, replay.stderr);
  const result = JSON.parse(replay.stdout);
  assert.equal(result.api_calls, 0);
  assert.equal(result.summary.classification_accuracy_successful, 1);
  assert.deepEqual(result.warnings, ['legacy_provenance_incomplete']);
  const first = JSON.parse(run(['eval']).stdout);
  const second = JSON.parse(run(['eval']).stdout);
  assert.equal(first.schema_version, 1);
  assert.match(first.provenance.dataset_sha256, /^[a-f0-9]{64}$/);
  assert.match(first.provenance.source_sha256, /^[a-f0-9]{64}$/);
  assert.equal(first.provenance.dataset_sha256, second.provenance.dataset_sha256);
  assert.equal(first.provenance.configuration_sha256, second.provenance.configuration_sha256);
  const changed = JSON.parse(run(['eval', '--threshold', '0.9']).stdout);
  assert.notEqual(first.provenance.configuration_sha256, changed.provenance.configuration_sha256);
});
