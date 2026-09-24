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

test('class metrics accept distinct custom route labels without changing support defaults', () => {
  const support = evaluation.classificationMetrics([{expected:'billing',prediction:'billing'}]);
  assert.deepEqual(Object.keys(support.confusion_matrix), ['billing','technical','sales','other']);
  const route = evaluation.classificationMetrics([{expected:'tool',prediction:'llm'},{expected:'llm',prediction:null}], ['tool','llm']);
  assert.equal(route.confusion_matrix.tool.llm, 1);
  assert.equal(route.per_class.llm.support, 1);
  assert.equal(route.errors, 1);
  for (const labels of [[], ['tool','tool'], ['tool',''], ['tool',2], 'tool'])
    assert.throws(() => evaluation.classificationMetrics([],labels));
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

test('recorded report view projects only validated recorded evidence', async () => {
  const report = JSON.parse(await readFile(new URL('../doc/results/jev-test-2026-09-21.json', import.meta.url)));
  report.private = 'PRIVATE_MARKER';
  report.rows[0].private = 'PRIVATE_MARKER';
  report.rows[0].result.private = 'PRIVATE_MARKER';
  assert.equal(typeof evaluation.recordedReportView, 'function');
  const view = evaluation.recordedReportView(report);
  assert.equal(view.mode, 'recorded_replay');
  assert.equal(view.api_calls, 0);
  assert.equal(view.report_id, 'support-routing-2026-09-21');
  assert.deepEqual(view.summary, replayReport(report).summary);
  assert.equal(view.cases.length, 16);
  assert.equal(view.metadata.recorded_at, report.collected_at);
  assert.equal(view.metadata.model, 'jev-1.13.0');
  assert.equal(view.metadata.requested_model, 'jev-latest');
  assert.deepEqual(view.warnings, ['legacy_provenance_incomplete']);
  assert.deepEqual(Object.keys(view.cases[0]), ['id', 'expected', 'baseline', 'status', 'prediction', 'confidence', 'decision', 'latency_ms', 'error']);
  assert.ok(!JSON.stringify(view).includes('PRIVATE_MARKER'));
});

test('recorded report view makes errors and summary mismatch explicit', async () => {
  const saved = JSON.parse(await readFile(new URL('../doc/results/jev-test-2026-09-21.json', import.meta.url)));
  const report = structuredClone(saved);
  report.rows = report.rows.map(row => ({ id: row.id, expected: row.expected, baseline: row.baseline, status: 'error', error: 'PRIVATE_MARKER' }));
  report.summary = { private: 'PRIVATE_MARKER' };
  const view = evaluation.recordedReportView(report);
  assert.equal(view.metadata.model, null);
  assert.equal(view.summary_matches_recorded, false);
  assert.equal(view.diagnostics.model.successful, 0);
  assert.ok(view.cases.every(row => row.prediction === null && row.confidence === null && row.decision === null && row.latency_ms === null && row.error === 'evaluation_failed'));
  assert.ok(!JSON.stringify(view).includes('PRIVATE_MARKER'));
});

test('recorded report view rejects invalid saved data with one generic error', async () => {
  const saved = JSON.parse(await readFile(new URL('../doc/results/jev-test-2026-09-21.json', import.meta.url)));
  for (const mutate of [
    r => { r.collected_at = 'not a timestamp'; },
    r => { r.collected_at = '2026-02-31T04:40:30.267Z'; },
    r => { r.rows[0].result.decision.queue = 'other'; },
    r => { r.rows[0].result.latency_ms = Infinity; },
    r => { r.rows[0].result.answers.department.choice = 'PRIVATE_MARKER'; },
  ]) {
    const report = structuredClone(saved); mutate(report);
    assert.throws(() => evaluation.recordedReportView(report), error => error.message === 'Invalid or unsupported recorded report.');
  }
  const missingTimestamp = structuredClone(saved);
  delete missingTimestamp.collected_at;
  assert.equal(evaluation.recordedReportView(missingTimestamp).metadata.recorded_at, null);
});
