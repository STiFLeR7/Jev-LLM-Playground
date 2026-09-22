import { recordedReportView, diagnosticMetrics } from './evaluation.mjs';
import { replayBenchmark, benchmarkMetrics } from './benchmark.mjs';
import { baseline, route, summarize, validateResponse } from './playground.mjs';

// Only these curated public reports are exposed; IDs are never filesystem paths.
export const evidenceFiles = Object.freeze({
  legacy: 'jev-test-2026-09-21.json',
  v2: 'benchmark-v2-live-2026-09-21.json',
  v3: 'benchmark-v3-live-2026-09-21.json',
});

export function evidenceView(report, id, threshold) {
  if (!Object.hasOwn(evidenceFiles, id) || (threshold !== undefined &&
    (typeof threshold !== 'number' || !Number.isFinite(threshold) || threshold < 0 || threshold > 1))) throw new Error('Invalid evidence request.');
  if (id === 'legacy') {
    const view = recordedReportView(report);
    const selected = threshold ?? report.threshold;
    const rows = report.rows.map(r => ({ id: r.id, expected: r.expected, baseline: r.baseline, status: r.status,
      ...(r.status === 'ok' ? { result: { ...validateResponse(r.result), decision: route(r.result, selected), latency_ms: r.result.latency_ms } } : {}) }));
    return { ...view, report_id: id,
      metadata: { ...view.metadata, dataset: report.dataset, recorded_threshold: report.threshold, threshold: selected,
        unique_cases: rows.length, planned_attempts: rows.length, attempts_per_case: 1, stop_reason: 'legacy_run', latency_basis: 'Successful-call latency' },
      summary: summarize(rows), diagnostics: diagnosticMetrics(rows, true), agreed: null,
      cases: view.cases.map((c, i) => ({ ...c, pass: 1, text: null, reference_status: 'not_reviewed', decision: rows[i].result?.decision ?? null })) };
  }
  const replay = replayBenchmark(report);
  if (report.mode !== 'live_benchmark' || report.config.task !== `support-routing-${id}`) throw new Error('Invalid evidence report.');
  const selected = threshold ?? report.config.threshold;
  const metrics = benchmarkMetrics(report.cases, report.rows, { ...report.config, threshold: selected });
  const references = new Map(report.cases.map(c => [c.id, c]));
  const cases = report.rows.map(row => {
    const reference = references.get(row.id);
    const clean = row.status === 'ok' ? validateResponse(row.result) : null;
    return { id: row.id, pass: row.pass, text: reference.text, expected: reference.expected,
      baseline: baseline(reference.text), reference_status: reference.reference_status ?? 'not_reviewed',
      status: row.status, prediction: clean?.answers.department.choice ?? null,
      confidence: clean?.answers.department.confidence ?? null, decision: clean ? route(clean, selected) : null,
      latency_ms: row.attempt_latency_ms, error: clean ? null : 'evaluation_failed' };
  });
  return { mode: 'recorded_replay', api_calls: 0, report_id: id,
    metadata: { recorded_at: report.collected_at, model: report.config.model, requested_model: report.config.model,
      dataset: report.config.dataset_version, split: report.config.split, recorded_threshold: report.config.threshold, threshold: selected,
      unique_cases: metrics.unique_cases, planned_attempts: metrics.planned_attempts, attempts_per_case: report.config.attempts_per_case,
      stop_reason: report.stop_reason, latency_basis: 'Attempt latency (includes failures)' },
    summary: { cases: metrics.attempted, errors: metrics.errors, unattempted: metrics.unattempted,
      review_count: metrics.routing.review_count, automatically_routed: metrics.routing.automatically_routed,
      latency_ms: metrics.attempt_latency_ms, estimated_successful_cost_usd: metrics.estimated_successful_cost_usd,
      cost_basis: 'Dated pricing estimate for this recorded run, not an invoice or cumulative ledger total.' },
    diagnostics: { model: metrics.classification, baseline: metrics.baseline, wrong_auto_routes: metrics.routing.wrong_auto_routes },
    agreed: metrics.reference_agreement ?? null,
    warnings: [...replay.warnings, ...(id === 'v3' ? ['blind_ai_review_not_human_adjudication'] : [])],
    summary_matches_recorded: replay.metrics_match, cases };
}
