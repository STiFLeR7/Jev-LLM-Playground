import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { dirname, resolve } from 'node:path';
import { questions, route, validateResponse, summarize, requestBody } from './playground.mjs';

export async function loadExperiment(configPath) {
  let config, datasetBytes, allCases;
  const check = condition => { if (!condition) throw new Error('Invalid experiment configuration or dataset.'); };
  try { config = JSON.parse(await readFile(configPath, 'utf8')); }
  catch { throw new Error('Cannot read experiment configuration.'); }
  const fields = ['schema_version', 'task', 'dataset', 'dataset_version', 'split', 'model', 'threshold', 'policy_version', 'baseline_version', 'attempts_per_case'];
  check(config && !Array.isArray(config) && Object.keys(config).length === fields.length && fields.every(key => Object.hasOwn(config, key)));
  check(config.schema_version === 1 && config.task === 'support-routing' && config.policy_version === 'support-routing-v1' && config.baseline_version === 'keyword-v1');
  check(config.attempts_per_case === 1 && ['dev', 'test'].includes(config.split));
  check(typeof config.dataset === 'string' && config.dataset.trim() && config.dataset_version === 'synthetic-tickets-v1');
  check(typeof config.threshold === 'number' && Number.isFinite(config.threshold) && config.threshold >= 0 && config.threshold <= 1);
  requestBody('Configuration check', config.model);
  try {
    datasetBytes = await readFile(resolve(dirname(resolve(configPath)), config.dataset));
    allCases = JSON.parse(datasetBytes.toString('utf8'));
  } catch { throw new Error('Cannot read experiment dataset.'); }
  check(Array.isArray(allCases) && allCases.length > 0);
  const ids = new Set();
  for (const item of allCases) {
    check(item && typeof item.id === 'string' && item.id.trim() && !ids.has(item.id)); ids.add(item.id);
    check(['dev', 'test'].includes(item.split) && Object.hasOwn(questions.department.criteria, item.expected));
    requestBody(item.text, config.model);
  }
  const cases = allCases.filter(item => item.split === config.split);
  check(cases.length > 0);
  return { config, cases, datasetBytes };
}

export function classificationMetrics(rows) {
  const labels = Object.keys(questions.department.criteria);
  const confusion_matrix = Object.fromEntries(labels.map(label => [label, Object.fromEntries(labels.map(key => [key, 0]))]));
  const support = Object.fromEntries(labels.map(label => [label, 0]));
  let successful = 0, correct = 0;
  for (const row of rows) {
    if (!labels.includes(row.expected) || !(row.prediction === null || labels.includes(row.prediction))) throw new Error('Invalid classification observation.');
    support[row.expected]++;
    if (row.prediction === null) continue;
    successful++;
    confusion_matrix[row.expected][row.prediction]++;
    if (row.expected === row.prediction) correct++;
  }
  const ratio = (a, b) => b ? a / b : null;
  const per_class = Object.fromEntries(labels.map(label => {
    const tp = confusion_matrix[label][label];
    const observed = labels.reduce((sum, key) => sum + confusion_matrix[label][key], 0);
    const predicted = labels.reduce((sum, key) => sum + confusion_matrix[key][label], 0);
    return [label, { support: support[label], successful_support: observed,
      precision: ratio(tp, predicted), recall_successful: ratio(tp, observed),
      recall_per_attempt: ratio(tp, support[label]), f1_successful: ratio(2 * tp, observed + predicted) }];
  }));
  return { attempts: rows.length, successful, errors: rows.length - successful,
    accuracy: ratio(correct, successful), correct_per_attempt: ratio(correct, rows.length), confusion_matrix, per_class };
}

export function diagnosticMetrics(rows, live) {
  return { baseline: classificationMetrics(rows.map(row => ({ expected: row.expected, prediction: row.baseline }))),
    model: live ? classificationMetrics(rows.map(row => ({ expected: row.expected, prediction: row.status === 'ok' ? row.result.answers.department.choice : null }))) : null,
    wrong_auto_routes: live ? rows.filter(row => row.status === 'ok' && row.result.decision.action === 'route' && row.result.decision.queue !== row.expected).length : null };
}

const hash = value => createHash('sha256').update(value).digest('hex');
const configuration = report => ({ dataset: report.dataset, split: report.split, model: report.requested_model,
  threshold: report.threshold, questions: report.questions, policy_version: 'support-routing-v1',
  baseline_version: 'keyword-v1', attempts_per_case: 1 });

export async function buildProvenance(datasetBytes, report) {
  let revision = null;
  let dirty = null;
  const cwd = fileURLToPath(new URL('.', import.meta.url));
  try {
    revision = execFileSync('git', ['rev-parse', '--verify', 'HEAD'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    dirty = Boolean(execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim());
  } catch { /* An unborn or unavailable Git repository cannot supply a revision. */ }
  const source = await Promise.all(['playground.mjs', 'evaluation.mjs'].map(async file => [file, await readFile(new URL(file, import.meta.url), 'utf8')]));
  return { dataset_sha256: hash(datasetBytes), configuration_sha256: hash(JSON.stringify(configuration(report))),
    source_sha256: hash(JSON.stringify(source)), configuration: configuration(report),
    code_revision: revision, working_tree_dirty: dirty, node: process.version, platform: process.platform,
    warnings: revision === null ? ['code_revision_unavailable'] : dirty ? ['uncommitted_working_tree'] : [] };
}

export function replayReport(report) {
  const check = condition => { if (!condition) throw new Error('Invalid or unsupported evaluation report.'); };
  check(report && [undefined, 1].includes(report.schema_version));
  check(['live_evaluation', 'baseline_only'].includes(report.mode));
  check(report.dataset === 'synthetic-tickets-v1' && ['dev', 'test'].includes(report.split));
  check(typeof report.requested_model === 'string' && report.requested_model.trim());
  check(typeof report.threshold === 'number' && Number.isFinite(report.threshold) && report.threshold >= 0 && report.threshold <= 1);
  // ponytail: replay supports the current question/policy contract only; version dispatch when a second contract exists.
  check(isDeepStrictEqual(report.questions, questions));
  check(Array.isArray(report.rows) && report.rows.length > 0);
  if (report.schema_version === 1) {
    check(report.provenance && isDeepStrictEqual(report.provenance.configuration, configuration(report)));
    check(report.provenance.configuration_sha256 === hash(JSON.stringify(configuration(report))));
    check(['dataset_sha256', 'source_sha256'].every(key => /^[a-f0-9]{64}$/.test(report.provenance[key])));
  }
  const ids = new Set();
  const labels = Object.keys(questions.department.criteria);
  const rows = report.rows.map(row => {
    check(row && typeof row.id === 'string' && row.id.trim() && !ids.has(row.id)); ids.add(row.id);
    check(labels.includes(row.expected) && labels.includes(row.baseline));
    const clean = { id: row.id, expected: row.expected, baseline: row.baseline };
    if (report.mode === 'baseline_only') { check(row.status === undefined); return clean; }
    check(['ok', 'error'].includes(row.status)); clean.status = row.status;
    if (row.status === 'ok') {
      const result = validateResponse(row.result);
      const decision = route(result, report.threshold);
      check(isDeepStrictEqual(row.result.decision, decision));
      check(typeof row.result.latency_ms === 'number' && Number.isFinite(row.result.latency_ms) && row.result.latency_ms >= 0);
      clean.result = { ...result, decision, latency_ms: row.result.latency_ms };
    }
    return clean;
  });
  const summary = report.mode === 'live_evaluation' ? summarize(rows) : {
    cases: rows.length, baseline_accuracy: rows.filter(row => row.baseline === row.expected).length / rows.length, api_calls: 0,
  };
  return { mode: 'offline_replay', api_calls: 0, summary, diagnostics: diagnosticMetrics(rows, report.mode === 'live_evaluation'),
    warnings: report.schema_version === undefined ? ['legacy_provenance_incomplete'] : ['hashes_identify_inputs_not_independent_authenticity'],
    summary_matches_recorded: isDeepStrictEqual(summary, report.summary) };
}
