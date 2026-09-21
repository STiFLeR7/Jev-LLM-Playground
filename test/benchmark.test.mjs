import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { questions, route } from '../playground.mjs';
import { openBudget } from '../budget.mjs';
const bench = await import('../benchmark.mjs').catch(e => { if (e.code === 'ERR_MODULE_NOT_FOUND') return {}; throw e; });
const configPath = fileURLToPath(new URL('../data/support-routing-v2.json', import.meta.url));
const response = (choice = 'billing', confidence = 0.9) => ({ model: 'jev-1.13.0',
  answers: { department: { type: 'choice', choice, confidence,
    probabilities: Object.fromEntries(Object.keys(questions.department.criteria).map(key => [key, key === choice ? 1 : 0])) },
  urgent: { type: 'noul', noul: 0.2 }, frustration: { type: 'score', score: 0, confidence: 1,
    probabilities: { 0: 1, 1: 0, 2: 0 }, legend: Object.fromEntries(questions.frustration.criteria.map((v, i) => [i, v])) } },
  usage: { input_tokens: 500, output_tokens: 30 } });
const row = (id, pass, choice, confidence = 0.9) => {
  const data = response(choice, confidence);
  return { id, pass, status: 'ok', result: { ...data, decision: route(data), latency_ms: 10 }, attempt_latency_ms: 11 };
};
async function setup(t) {
  assert.equal(typeof bench.loadBenchmark, 'function', 'benchmark implementation must exist');
  const dir = await mkdtemp(join(tmpdir(), 'jev-benchmark-'));
  const budgets = [];
  t.after(async () => { for (const budget of budgets) await budget.close(); await rm(dir, { recursive: true, force: true }); });
  return { dir, budgets, experiment: await bench.loadBenchmark(configPath) };
}

test('frozen dataset separates dev/test with balanced test strata and rejects label/config corruption', async t => {
  const { dir, experiment } = await setup(t);
  assert.equal(experiment.cases.length, 48);
  for (const stratum of ['clear', 'negation', 'mixed_intent', 'instruction_noise']) {
    for (const label of ['billing', 'technical', 'sales', 'other']) {
      assert.equal(experiment.cases.filter(c => c.stratum === stratum && c.expected === label).length, 3);
    }
  }
  const config = { ...experiment.config, dataset: './tickets.json' };
  const all = JSON.parse(await readFile(new URL('../data/tickets-v2.json', import.meta.url)));
  const path = join(dir, 'config.json');
  await writeFile(path, JSON.stringify(config));
  for (const mutate of [
    a => { a[0].expected_review = !a[0].expected_review; },
    a => { a[0].text = a[1].text; }, a => { a[0].id = a[1].id; },
    a => { a[0].stratum = 'unknown'; }, a => { a[0].rationale = ''; },
  ]) {
    const copy = structuredClone(all); mutate(copy);
    await writeFile(join(dir, 'tickets.json'), JSON.stringify(copy));
    await assert.rejects(bench.loadBenchmark(path));
  }
  await writeFile(join(dir, 'tickets.json'), JSON.stringify(all));
  for (const mutate of [c => { c.model = 'jev-latest'; }, c => { c.questions_sha256 = 'wrong'; }, c => { c.attempts_per_case = 0; }, c => { c.threshold = '0.8'; }, c => { c.extra = true; }]) {
    const copy = structuredClone(config); mutate(copy);
    await writeFile(path, JSON.stringify(copy));
    await assert.rejects(bench.loadBenchmark(path));
  }
});

test('metrics expose routing harm, missing attempts and incomplete repeats with hand-counted denominators', () => {
  assert.equal(typeof bench.benchmarkMetrics, 'function');
  const cases = [{ id: 'a', expected: 'billing', expected_review: false, stratum: 'clear', text: 'refund' },
    { id: 'b', expected: 'other', expected_review: true, stratum: 'mixed_intent', text: 'help' },
    { id: 'c', expected: 'sales', expected_review: false, stratum: 'negation', text: 'pricing' }];
  const rows = [row('a', 1, 'billing'), row('b', 1, 'billing', 0.95), row('c', 1, 'sales'),
    row('a', 2, 'technical'), row('b', 2, 'other', 0.99), row('c', 2, 'sales'),
    row('a', 3, 'billing', 0.6), { id: 'b', pass: 3, status: 'error', error_code: 'evaluation_failed', attempt_latency_ms: 2 }];
  const result = bench.benchmarkMetrics(cases, rows, { attempts_per_case: 3, threshold: 0.8 });
  assert.equal(result.planned_attempts, 9);
  assert.equal(result.unattempted, 1);
  assert.equal(result.classification.accuracy, 5 / 7);
  assert.equal(result.routing.wrong_auto_routes, 2);
  assert.equal(result.routing.wrong_auto_route_rate, 2 / 5);
  assert.equal(result.routing.review_precision, 0.5);
  assert.equal(result.routing.review_recall_per_attempt, 1 / 3);
  assert.equal(result.consistency.complete_cases, 1);
  assert.equal(result.consistency.category_all_equal_rate, 0);
  assert.equal(result.consistency.observed_pairs, 5);
  assert.equal(result.consistency.category_pair_agreement, 2 / 5);
  assert.equal(result.consistency.route_pair_agreement, 1 / 5);
  assert.equal(bench.benchmarkMetrics(cases, [], { attempts_per_case: 3, threshold: 0.8 }).consistency.category_pair_agreement, null);
});

test('offline benchmark and replay use no transport and reject tampered evidence', async t => {
  const { experiment } = await setup(t);
  const report = await bench.runBenchmark(experiment, { fetchImpl: () => { throw Error('must not call'); } });
  assert.equal(report.mode, 'baseline_only');
  assert.equal(report.api_calls, 0);
  assert.equal(report.metrics.classification, null);
  assert.equal(bench.replayBenchmark(report).metrics_match, true);
  const changed = structuredClone(report); changed.metrics.baseline.accuracy = -1;
  assert.equal(bench.replayBenchmark(changed).metrics_match, false);
  const altered = structuredClone(report); altered.cases[0].text += ' changed';
  assert.throws(() => bench.replayBenchmark(altered));
});

test('live runner checkpoints validated observations and accounts for usage; existing output prevents calls', async t => {
  const { dir, budgets, experiment } = await setup(t);
  const budget = await openBudget(join(dir, 'ledger.jsonl'), '0.05');
  budgets.push(budget);
  let calls = 0;
  const fetchImpl = async (_url, options) => { calls++; assert.equal(options.redirect, 'error');
    const body = JSON.parse(options.body); assert.equal(body.model, 'jev-1.13.0');
    return { ok: true, json: async () => response() }; };
  const outputPath = join(dir, 'report.json');
  const report = await bench.runBenchmark(experiment, { live: true, apiKey: 'TEST_SECRET', budget, outputPath, fetchImpl });
  assert.equal(calls, 144);
  assert.equal(report.rows.length, 144);
  assert.equal(report.stop_reason, 'completed');
  assert.equal(report.budget_after.observed_nanodollars, 3024000);
  assert.equal(bench.replayBenchmark(report).metrics_match, true);
  assert.deepEqual(JSON.parse(await readFile(outputPath)), report);
  assert.ok(!JSON.stringify(report).includes('TEST_SECRET'));
  await assert.rejects(bench.runBenchmark(experiment, { live: true, apiKey: 'TEST_SECRET', budget, outputPath, fetchImpl }));
  assert.equal(calls, 144);
  for (const mutate of [r => { r.rows[1].id = r.rows[0].id; }, r => { r.rows[0].result.decision.queue = 'wrong'; }, r => { r.rows[0].pass = 4; },
    r => { r.pricing.input_nanodollars_per_token = -1; },
    r => { r.budget_after.observed_nanodollars = 0; },
    r => { r.budget_after.accounted_nanodollars = -1; },
    r => { r.rows[0].reservation_id = 500; },
    r => { r.rows[0].requested_at = 'not-a-date'; },
    r => { r.stop_reason = 'baseline_only'; },
    r => { delete r.budget_before; },
  ]) {
    const changed = structuredClone(report); mutate(changed); assert.throws(() => bench.replayBenchmark(changed));
  }
});

test('API failure stops without retries, retains full reservation and saves safe partial evidence', async t => {
  const { dir, budgets, experiment } = await setup(t);
  const budget = await openBudget(join(dir, 'ledger.jsonl'), '0.05');
  budgets.push(budget);
  let calls = 0;
  const report = await bench.runBenchmark(experiment, { live: true, apiKey: 'PRIVATE_KEY', budget,
    outputPath: join(dir, 'report.json'), fetchImpl: async () => { calls++; throw Error('PRIVATE_KEY'); } });
  assert.equal(calls, 1);
  assert.equal(report.stop_reason, 'evaluation_failed');
  assert.equal(report.rows.length, 1);
  assert.equal(report.budget_after.held_nanodollars, 2752512);
  assert.equal(report.metrics.unattempted, 143);
  assert.ok(!JSON.stringify(report).includes('PRIVATE_KEY'));
  assert.equal(bench.replayBenchmark(report).metrics_match, true);
});

test('insufficient budget prevents dispatch entirely', async t => {
  const { dir, budgets, experiment } = await setup(t);
  const budget = await openBudget(join(dir, 'ledger.jsonl'), '0.001');
  budgets.push(budget);
  let calls = 0;
  const report = await bench.runBenchmark(experiment, { live: true, apiKey: 'test', budget, outputPath: join(dir, 'report.json'), fetchImpl: async () => { calls++; } });
  assert.equal(calls, 0);
  assert.equal(report.stop_reason, 'budget_exhausted');
  assert.equal(report.rows.length, 0);
});

test('CLI baseline works without keys and live requires explicit budget authorization', async t => {
  await setup(t);
  const cli = fileURLToPath(new URL('../benchmark.mjs', import.meta.url));
  const run = args => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', env: { ...process.env, TYPESAFE_API_KEY: '', JEV_LLM_API: '' } });
  const result = run(['--config', configPath]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).api_calls, 0);
  assert.equal(run(['--config', configPath, '--live']).status, 1);
});

test('curated live evidence replays and reconciles with its pre-run snapshot and spending journal', async () => {
  const saved = JSON.parse(await readFile(new URL('../doc/results/benchmark-v2-live-2026-09-21.json', import.meta.url)));
  const frozen = JSON.parse(await readFile(new URL('../doc/results/benchmark-v2-baseline-2026-09-21.json', import.meta.url)));
  assert.equal(bench.replayBenchmark(saved).metrics_match, true);
  assert.equal(bench.replayBenchmark(frozen).metrics_match, true);
  for (const key of ['dataset_sha256', 'cases_sha256', 'config_sha256', 'source_sha256']) assert.equal(saved.provenance[key], frozen.provenance[key]);
  const journal = (await readFile(new URL('../doc/results/benchmark-v2-budget-2026-09-21.jsonl', import.meta.url), 'utf8')).trim().split('\n').map(JSON.parse);
  const reserves = journal.filter(e => e.type === 'reserve');
  const settlements = journal.filter(e => e.type === 'settle');
  assert.equal(reserves.length, saved.api_calls);
  assert.equal(settlements.length, saved.metrics.successful);
  for (const row of saved.rows) {
    assert.equal(reserves.filter(e => e.id === row.reservation_id).length, 1);
    const settled = settlements.filter(e => e.id === row.reservation_id);
    assert.equal(settled.length, 1);
    assert.equal(settled[0].input_tokens, row.result.usage.input_tokens);
  }
  assert.equal(settlements.reduce((n, e) => n + e.input_tokens * journal[0].pricing.input_nanodollars_per_token, 0), saved.budget_after.observed_nanodollars);
  assert.ok(saved.budget_after.accounted_nanodollars <= journal[0].limit_nanodollars);
});
