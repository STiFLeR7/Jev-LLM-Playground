import { readFile, open, rename, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual, parseArgs } from 'node:util';
import { questions, baseline, requestBody, evaluateTicket, validateResponse, route } from './playground.mjs';
import { classificationMetrics } from './evaluation.mjs';
import { openBudget, pricing } from './budget.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const ratio = (a, b) => b ? a / b : null;
const check = (value, message = 'Invalid benchmark configuration, dataset, or report.') => { if (!value) throw new Error(message); };
const strata = ['clear', 'negation', 'mixed_intent', 'instruction_noise'];
const labels = Object.keys(questions.department.criteria);
const fields = (object, keys) => object && isDeepStrictEqual(Object.keys(object).sort(), [...keys].sort());

function validateConfig(config) {
  check(fields(config, ['schema_version', 'task', 'dataset', 'dataset_version', 'split', 'model', 'threshold', 'policy_version', 'baseline_version', 'attempts_per_case', 'questions_sha256']));
  check(config.schema_version === 1 && config.task === 'support-routing-v2' && config.dataset_version === 'synthetic-tickets-v2');
  check(config.split === 'test' && config.model === pricing.model && config.policy_version === 'support-routing-v1' && config.baseline_version === 'keyword-v1');
  check(typeof config.dataset === 'string' && config.dataset.trim());
  check(typeof config.threshold === 'number' && Number.isFinite(config.threshold) && config.threshold >= 0 && config.threshold <= 1);
  check(Number.isSafeInteger(config.attempts_per_case) && config.attempts_per_case >= 2 && config.attempts_per_case <= 5);
  check(config.questions_sha256 === hash(JSON.stringify(questions)));
}

function validateCases(cases, onlyTest = false) {
  check(Array.isArray(cases) && cases.length === (onlyTest ? 48 : 56));
  const ids = new Set(), texts = new Set();
  for (const item of cases) {
    check(fields(item, ['id', 'split', 'stratum', 'text', 'expected', 'expected_review', 'rationale']));
    check(typeof item.id === 'string' && item.id.trim() && !ids.has(item.id)); ids.add(item.id);
    check((onlyTest ? ['test'] : ['dev', 'test']).includes(item.split));
    check(strata.includes(item.stratum) && labels.includes(item.expected));
    check(item.expected_review === (item.expected === 'other'));
    check(typeof item.rationale === 'string' && item.rationale.trim());
    requestBody(item.text, pricing.model);
    const text = item.text.trim().toLowerCase(); check(!texts.has(text)); texts.add(text);
  }
  const tests = cases.filter(c => c.split === 'test');
  check(tests.length === 48);
  for (const stratum of strata) for (const label of labels) check(tests.filter(c => c.stratum === stratum && c.expected === label).length === 3);
}

export async function loadBenchmark(path) {
  const config = JSON.parse(await readFile(path, 'utf8'));
  validateConfig(config);
  const bytes = await readFile(resolve(dirname(resolve(path)), config.dataset));
  const all = JSON.parse(bytes.toString('utf8'));
  validateCases(all);
  return { config, cases: all.filter(c => c.split === 'test'), dataset_sha256: hash(bytes) };
}

function routingMetrics(cases, rows, threshold, repeats) {
  const expected = new Map(cases.map(c => [c.id, c]));
  const ok = rows.filter(r => r.status === 'ok').map(r => ({ ...r, decision: route(r.result, threshold) }));
  const accepted = ok.filter(r => r.decision.action === 'route');
  const reviewed = ok.filter(r => r.decision.action === 'review');
  const wrong = accepted.filter(r => r.decision.queue !== expected.get(r.id).expected).length;
  const required = cases.filter(c => c.expected_review).length * repeats;
  const trueReviews = reviewed.filter(r => expected.get(r.id).expected_review).length;
  const observedRequired = ok.filter(r => expected.get(r.id).expected_review).length;
  return { threshold, automatically_routed: accepted.length, review_count: reviewed.length,
    wrong_auto_routes: wrong, wrong_auto_route_rate: ratio(wrong, accepted.length),
    automatic_coverage_per_planned_attempt: ratio(accepted.length, cases.length * repeats),
    wrong_auto_routes_per_planned_attempt: ratio(wrong, cases.length * repeats),
    expected_review_attempts: required, expected_review_successful: observedRequired, correct_reviews: trueReviews,
    review_precision: ratio(trueReviews, reviewed.length), review_recall_per_attempt: ratio(trueReviews, required),
    review_recall_successful: ratio(trueReviews, observedRequired) };
}

export function benchmarkMetrics(cases, rows, config, live = true) {
  const expected = new Map(cases.map(c => [c.id, c]));
  const baselineMetrics = classificationMetrics(cases.map(c => ({ expected: c.expected, prediction: baseline(c.text) })));
  if (!live) return { unique_cases: cases.length, baseline: baselineMetrics, classification: null, api_calls: 0 };
  const ok = rows.filter(r => r.status === 'ok');
  const classification = selected => classificationMetrics(selected.map(r => ({ expected: expected.get(r.id).expected,
    prediction: r.status === 'ok' ? r.result.answers.department.choice : null })));
  let complete = 0, sameCategory = 0, sameRoute = 0, pairs = 0, categoryPairs = 0, routePairs = 0;
  const routingKey = r => { const d = route(r.result, config.threshold); return d.action + ':' + d.queue; };
  for (const item of cases) {
    const observations = ok.filter(r => r.id === item.id);
    if (observations.length === config.attempts_per_case) {
      complete++;
      if (new Set(observations.map(r => r.result.answers.department.choice)).size === 1) sameCategory++;
      if (new Set(observations.map(routingKey)).size === 1) sameRoute++;
    }
    for (let i = 0; i < observations.length; i++) for (let j = i + 1; j < observations.length; j++) {
      pairs++;
      if (observations[i].result.answers.department.choice === observations[j].result.answers.department.choice) categoryPairs++;
      if (routingKey(observations[i]) === routingKey(observations[j])) routePairs++;
    }
  }
  const latencies = rows.map(r => r.attempt_latency_ms).sort((a, b) => a - b);
  const tokens = ok.reduce((sum, r) => sum + r.result.usage.input_tokens, 0);
  const planned = cases.length * config.attempts_per_case;
  return { unique_cases: cases.length, planned_attempts: planned, attempted: rows.length, unattempted: planned - rows.length,
    successful: ok.length, errors: rows.length - ok.length, baseline: baselineMetrics, classification: classification(rows),
    correct_per_planned_attempt: ratio(ok.filter(r => r.result.answers.department.choice === expected.get(r.id).expected).length, planned),
    per_stratum: Object.fromEntries([...new Set(cases.map(c => c.stratum))].map(s => [s, classification(rows.filter(r => expected.get(r.id).stratum === s))])),
    routing: routingMetrics(cases, rows, config.threshold, config.attempts_per_case),
    threshold_sensitivity: [0.5, 0.8, 0.95, 0.99].map(t => routingMetrics(cases, rows, t, config.attempts_per_case)),
    consistency: { complete_cases: complete, incomplete_cases: cases.length - complete,
      category_all_equal_rate: ratio(sameCategory, complete), route_all_equal_rate: ratio(sameRoute, complete),
      planned_pairs: cases.length * config.attempts_per_case * (config.attempts_per_case - 1) / 2,
      observed_pairs: pairs, category_pair_agreement: ratio(categoryPairs, pairs), route_pair_agreement: ratio(routePairs, pairs) },
    confidence_bins: [[0, 0.5], [0.5, 0.8], [0.8, 0.95], [0.95, 1]].map(([lo, hi]) => {
      const selected = ok.filter(r => { const c = r.result.answers.department.confidence; return c >= lo && (hi === 1 ? c <= hi : c < hi); });
      return { lower_inclusive: lo, upper: hi, upper_inclusive: hi === 1, count: selected.length,
        accuracy: ratio(selected.filter(r => r.result.answers.department.choice === expected.get(r.id).expected).length, selected.length) };
    }),
    attempt_latency_ms: { p50: latencies.length ? latencies[Math.ceil(latencies.length * 0.5) - 1] : null,
      p95: latencies.length ? latencies[Math.ceil(latencies.length * 0.95) - 1] : null },
    successful_input_tokens: tokens, estimated_successful_cost_usd: tokens * pricing.input_nanodollars_per_token / 1e9 };
}

export function replayBenchmark(report) {
  check(report?.schema_version === 'benchmark-v1');
  check(['baseline_only', 'live_benchmark'].includes(report.mode));
  validateConfig(report.config); validateCases(report.cases, true);
  check(isDeepStrictEqual(report.questions, questions));
  check(report.provenance?.cases_sha256 === hash(JSON.stringify(report.cases)));
  check(report.provenance.config_sha256 === hash(JSON.stringify(report.config)));
  check(['dataset_sha256', 'source_sha256'].every(k => /^[a-f0-9]{64}$/.test(report.provenance[k])));
  check(Array.isArray(report.rows));
  const live = report.mode === 'live_benchmark';
  check(live || report.rows.length === 0);
  check(isDeepStrictEqual(report.pricing, pricing));
  const validTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
  check(validTime(report.started_at) && validTime(report.collected_at));
  for (const [i, row] of report.rows.entries()) {
    check(row.id === report.cases[i % report.cases.length].id && row.pass === Math.floor(i / report.cases.length) + 1 && row.pass <= report.config.attempts_per_case);
    check(['ok', 'error'].includes(row.status) && typeof row.attempt_latency_ms === 'number' && Number.isFinite(row.attempt_latency_ms) && row.attempt_latency_ms >= 0);
    check(validTime(row.requested_at));
    if (row.status === 'ok') {
      const clean = validateResponse(row.result);
      check(clean.model === report.config.model && clean.usage.input_tokens <= pricing.max_input_tokens);
      check(isDeepStrictEqual(row.result.decision, route(clean, report.config.threshold)));
      check(typeof row.result.latency_ms === 'number' && Number.isFinite(row.result.latency_ms) && row.result.latency_ms >= 0);
    } else check(row.error_code === 'evaluation_failed');
  }
  check(report.api_calls === (live ? report.rows.length : 0));
  const metrics = benchmarkMetrics(report.cases, report.rows, report.config, live);
  if (live) {
    const reserve = pricing.max_input_tokens * pricing.input_nanodollars_per_token;
    for (const snapshot of [report.budget_before, report.budget_after]) {
      check(fields(snapshot, ['limit_nanodollars', 'observed_nanodollars', 'held_nanodollars', 'accounted_nanodollars', 'requests_reserved', 'unsettled_requests']));
      check(Object.values(snapshot).every(v => Number.isSafeInteger(v) && v >= 0));
      check(snapshot.limit_nanodollars > 0 && snapshot.limit_nanodollars <= 50000000);
      check(snapshot.accounted_nanodollars === snapshot.observed_nanodollars + snapshot.held_nanodollars && snapshot.accounted_nanodollars <= snapshot.limit_nanodollars);
      check(snapshot.held_nanodollars === snapshot.unsettled_requests * reserve && snapshot.unsettled_requests <= snapshot.requests_reserved);
    }
    const before = report.budget_before, after = report.budget_after;
    check(before.limit_nanodollars === after.limit_nanodollars);
    check(after.requests_reserved === before.requests_reserved + report.rows.length);
    check(after.observed_nanodollars === before.observed_nanodollars + metrics.successful_input_tokens * pricing.input_nanodollars_per_token);
    check(after.unsettled_requests === before.unsettled_requests + metrics.errors);
    report.rows.forEach((row, i) => check(row.reservation_id === before.requests_reserved + i + 1));
    check(['running', 'completed', 'budget_exhausted', 'evaluation_failed'].includes(report.stop_reason));
    if (report.stop_reason === 'evaluation_failed') check(metrics.errors === 1 && report.rows.at(-1)?.status === 'error');
    else check(metrics.errors === 0);
    if (report.stop_reason === 'completed') check(metrics.unattempted === 0);
    if (report.stop_reason === 'budget_exhausted') check(metrics.unattempted > 0 && after.accounted_nanodollars + reserve > after.limit_nanodollars);
  } else check(report.budget_before === null && report.budget_after === null && report.stop_reason === 'baseline_only');
  return { mode: 'offline_replay', api_calls: 0, metrics, metrics_match: isDeepStrictEqual(metrics, report.metrics),
    warnings: ['synthetic_author_labels', 'repeats_are_correlated', 'hashes_are_not_independent_authenticity', 'cost_is_pricing_based_not_invoice'] };
}

async function provenance(experiment) {
  const source = await Promise.all(['benchmark.mjs', 'budget.mjs', 'playground.mjs', 'evaluation.mjs'].map(async name => [name, await readFile(new URL(name, import.meta.url), 'utf8')]));
  const cwd = fileURLToPath(new URL('.', import.meta.url));
  let revision = null, dirty = null;
  try {
    const git = args => execFileSync('git', ['-c', 'safe.directory=' + cwd.replaceAll('\\', '/').replace(/\/$/, ''), ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    revision = git(['rev-parse', 'HEAD']); dirty = Boolean(git(['status', '--porcelain', '--untracked-files=all']));
  } catch { /* Source hashes remain available without Git. */ }
  return { dataset_sha256: experiment.dataset_sha256, cases_sha256: hash(JSON.stringify(experiment.cases)),
    config_sha256: hash(JSON.stringify(experiment.config)), source_sha256: hash(JSON.stringify(source)),
    code_revision: revision, working_tree_dirty: dirty, node: process.version, platform: process.platform };
}

export async function runBenchmark(experiment, { live = false, apiKey, budget, outputPath, fetchImpl = fetch } = {}) {
  validateConfig(experiment.config); validateCases(experiment.cases, true);
  check(/^[a-f0-9]{64}$/.test(experiment.dataset_sha256));
  if (live) check(typeof apiKey === 'string' && apiKey.trim() && apiKey !== 'replace_with_your_typesafe_key' && budget && outputPath,
    'Live benchmark requires an API key, durable budget and exclusive output path.');
  const report = { schema_version: 'benchmark-v1', mode: live ? 'live_benchmark' : 'baseline_only',
    started_at: new Date().toISOString(), config: experiment.config, questions, cases: experiment.cases,
    provenance: await provenance(experiment), pricing, rows: [], api_calls: 0, stop_reason: live ? 'running' : 'baseline_only',
    budget_before: live ? budget.snapshot() : null };
  let first = true;
  const checkpoint = async () => {
    report.collected_at = new Date().toISOString(); report.api_calls = report.rows.length;
    report.budget_after = live ? budget.snapshot() : null;
    report.metrics = benchmarkMetrics(report.cases, report.rows, report.config, live);
    if (!outputPath) return;
    const target = first ? outputPath : outputPath + '.tmp';
    const file = await open(target, 'wx', 0o600);
    try { await file.writeFile(JSON.stringify(report, null, 2) + '\n'); await file.sync(); }
    finally { await file.close(); }
    if (!first) await rename(target, outputPath);
    first = false;
  };
  await checkpoint(); // Reject existing evidence paths before reserving or sending any request.
  if (!live) return report;
  outer: for (let pass = 1; pass <= experiment.config.attempts_per_case; pass++) {
    for (const item of experiment.cases) {
      let reservation;
      try { reservation = await budget.reserve(); }
      catch (error) { if (!error.message.startsWith('Budget exhausted')) throw error; report.stop_reason = 'budget_exhausted'; break outer; }
      const start = performance.now();
      const row = { id: item.id, pass, requested_at: new Date().toISOString(), reservation_id: reservation };
      try {
        const result = await evaluateTicket(item.text, { apiKey, model: experiment.config.model, threshold: experiment.config.threshold, fetchImpl });
        check(result.model === experiment.config.model, 'Unexpected model.');
        await budget.settle(reservation, result.usage.input_tokens);
        row.status = 'ok'; row.result = result;
      } catch {
        row.status = 'error'; row.error_code = 'evaluation_failed'; report.stop_reason = 'evaluation_failed';
      }
      row.attempt_latency_ms = Math.round((performance.now() - start) * 100) / 100;
      report.rows.push(row);
      await checkpoint(); // Do not dispatch the next request until current evidence is durable.
      if (row.status === 'error') break outer;
    }
  }
  if (report.stop_reason === 'running') report.stop_reason = 'completed';
  await checkpoint();
  return report;
}

async function main() {
  const { values, positionals } = parseArgs({ options: { config: { type: 'string' }, live: { type: 'boolean' },
    'budget-usd': { type: 'string' }, out: { type: 'string' }, replay: { type: 'string' }, help: { type: 'boolean' } } });
  check(positionals.length === 0);
  if (values.help) {
    console.log('Offline: node benchmark.mjs --config data/support-routing-v2.json\nLive: node --env-file=.env benchmark.mjs --config data/support-routing-v2.json --live --budget-usd 0.05 --out results/benchmark-v2.json\nReplay: node benchmark.mjs --replay PATH\nLive runs share results/benchmark-spend.jsonl; never reset it to bypass the cap.'); return;
  }
  if (values.replay) {
    check(Object.keys(values).length === 1);
    console.log(JSON.stringify(replayBenchmark(JSON.parse(await readFile(values.replay, 'utf8'))), null, 2)); return;
  }
  check(values.config && (values.live || !values['budget-usd']));
  const experiment = await loadBenchmark(values.config);
  let budget;
  try {
    if (values.live) {
      check(values['budget-usd'] && values.out, 'Live mode requires --budget-usd and --out.');
      // ponytail: one local shared ledger; use provider/account enforcement for multi-machine spending.
      const ledger = new URL('./results/benchmark-spend.jsonl', import.meta.url);
      await mkdir(new URL('./results/', import.meta.url), { recursive: true });
      budget = await openBudget(fileURLToPath(ledger), values['budget-usd']);
    }
    const report = await runBenchmark(experiment, { live: Boolean(values.live), budget, outputPath: values.out,
      apiKey: process.env.TYPESAFE_API_KEY || process.env.JEV_LLM_API });
    console.log(JSON.stringify(report, null, 2));
    if (values.live && report.stop_reason !== 'completed') process.exitCode = 1;
  } finally { if (budget) await budget.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { console.error('Benchmark failed; inspect inputs, output path and budget ledger. No automatic retry.'); process.exitCode = 1; });
}
