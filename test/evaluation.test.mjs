import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { replayReport } from '../evaluation.mjs';
import * as evaluation from '../evaluation.mjs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('versioned config runs offline with pinned settings and rejects overrides', async () => {
  const cli = fileURLToPath(new URL('../playground.mjs', import.meta.url));
  const config = fileURLToPath(new URL('../data/support-routing-v1.json', import.meta.url));
  const run = args => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', env: { ...process.env, TYPESAFE_API_KEY: '', JEV_LLM_API: '' } });
  const result = run(['eval', '--config', config]);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.requested_model, 'jev-1.13.0');
  assert.equal(report.summary.api_calls, 0);
  assert.equal(report.diagnostics.baseline.accuracy, 0.75);
  assert.equal(report.diagnostics.model, null);
  assert.equal(replayReport(report).summary_matches_recorded, true);
  assert.equal(run(['eval', '--config', config, '--threshold', '0.9']).status, 1);
  assert.equal(run(['triage', '--config', config, '--text', 'Refund']).status, 1);
});

test('class metrics separate failed attempts from observed predictions', () => {
  assert.equal(typeof evaluation.classificationMetrics, 'function');
  const metrics = evaluation.classificationMetrics([
    { expected: 'billing', prediction: 'billing' },
    { expected: 'billing', prediction: 'technical' },
    { expected: 'technical', prediction: 'technical' },
    { expected: 'sales', prediction: null },
  ]);
  assert.equal(metrics.successful, 3);
  assert.equal(metrics.errors, 1);
  assert.equal(metrics.accuracy, 2 / 3);
  assert.equal(metrics.correct_per_attempt, 0.5);
  assert.equal(metrics.confusion_matrix.billing.technical, 1);
  assert.equal(metrics.per_class.billing.recall_successful, 0.5);
  assert.equal(metrics.per_class.technical.precision, 0.5);
  assert.equal(metrics.per_class.sales.recall_successful, null);
  assert.equal(metrics.per_class.sales.recall_per_attempt, 0);
  assert.equal(evaluation.classificationMetrics([]).accuracy, null);
  assert.equal(evaluation.classificationMetrics([{ expected: 'sales', prediction: null }]).errors, 1);
  assert.throws(() => evaluation.classificationMetrics([{ expected: 'bad', prediction: null }]));
});

test('config loader resolves relative datasets and rejects malformed or empty experiments', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'jev-config-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, 'config.json');
  const original = JSON.parse(await readFile(new URL('../data/support-routing-v1.json', import.meta.url)));
  const cases = [{ id: 'one', split: 'test', text: 'Refund please', expected: 'billing' }];
  await writeFile(join(dir, 'tickets.json'), JSON.stringify(cases));
  await writeFile(path, JSON.stringify(original));
  assert.equal((await evaluation.loadExperiment(path)).cases[0].id, 'one');
  for (const mutate of [
    c => { c.schema_version = 2; }, c => { delete c.model; },
    c => { c.threshold = '0.8'; }, c => { c.attempts_per_case = 2; },
    c => { c.policy_version = 'unknown'; }, c => { c.baseline_version = 'unknown'; },
    c => { c.split = 'dev'; }, c => { c.unrecognized = true; },
  ]) {
    const config = structuredClone(original); mutate(config);
    await writeFile(path, JSON.stringify(config));
    await assert.rejects(evaluation.loadExperiment(path));
  }
  await writeFile(path, JSON.stringify(original));
  for (const invalid of [[], [cases[0], cases[0]], [{ ...cases[0], expected: 'unknown' }], [{ ...cases[0], text: '' }]]) {
    await writeFile(join(dir, 'tickets.json'), JSON.stringify(invalid));
    await assert.rejects(evaluation.loadExperiment(path));
  }
});

test('replay rejects malformed observations and recomputes rather than trusting totals', async () => {
  const saved = JSON.parse(await readFile(new URL('../doc/results/jev-test-2026-09-21.json', import.meta.url)));
  const changed = structuredClone(saved);
  changed.summary.classification_accuracy_successful = 0;
  assert.equal(replayReport(changed).summary.classification_accuracy_successful, 1);
  assert.equal(replayReport(changed).summary_matches_recorded, false);
  for (const mutate of [
    r => { r.schema_version = 999; },
    r => { r.threshold = '0.8'; },
    r => { r.rows = []; },
    r => { r.rows[1].id = r.rows[0].id; },
    r => { r.rows[0].expected = 'unknown'; },
    r => { r.rows[0].status = 'unknown'; },
    r => { r.rows[0].result.latency_ms = -1; },
    r => { r.rows[0].result.decision.queue = 'other'; },
    r => { r.questions.department.instructions = 'Changed policy'; },
    r => { r.rows[0].result.answers.department.choice = 'unknown'; },
  ]) {
    const report = structuredClone(saved); mutate(report);
    assert.throws(() => replayReport(report));
  }
  const failed = structuredClone(saved);
  failed.rows[0] = { ...failed.rows[0], status: 'error', error: 'PRIVATE_MARKER' };
  const output = replayReport(failed);
  assert.equal(output.summary.errors, 1);
  assert.equal(output.summary.correct_classifications_per_attempt, 15 / 16);
  assert.ok(!JSON.stringify(output).includes('PRIVATE_MARKER'));
});
