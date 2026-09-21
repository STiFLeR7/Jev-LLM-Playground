const $ = id => document.getElementById(id);
let pending = false;
function reset() {
  $('threshold-value').value = Number($('threshold').value).toFixed(2);
  $('submit').textContent = $('live').checked ? 'Run live decision' : 'Preview request';
  $('decision').hidden = $('trace').hidden = $('raw-details').hidden = true;
  $('trace-list').replaceChildren();
  $('raw').textContent = '';
  $('status').textContent = 'Ready. Run again to inspect these inputs.';
}
function traceItem(headingText, contentText) {
  const item = document.createElement('li');
  const heading = document.createElement('strong'); heading.textContent = headingText;
  const content = document.createElement('p'); content.textContent = contentText;
  item.append(heading, content);
  return item;
}
function questionSummary(questions) {
  const names = { department: 'Department', urgent: 'Urgent', frustration: 'Frustration' };
  return Object.entries(questions).map(([name, question]) => {
    const type = question.type[0].toUpperCase() + question.type.slice(1);
    const criteria = Array.isArray(question.criteria)
      ? question.criteria.map((value, index) => `${index}: ${value}`)
      : Object.entries(question.criteria || {}).map(([key, value]) => `${key}: ${value}`);
    return `${names[name] || name} (${type}): ${question.instructions}${criteria.length ? ` Criteria: ${criteria.join('; ')}` : ''}`;
  }).join(' ');
}
function renderTrace(input, result) {
  const preview = result.mode === 'request_preview';
  const questions = preview ? result.request.questions : result.questions;
  const items = [
    traceItem('Input state', input.text),
    traceItem('Questions', questionSummary(questions)),
  ];
  $('trace-mode').textContent = preview ? 'Preview · no API call or model observation' : 'Live response · application trace';
  if (preview) {
    items.push(
      traceItem('Validation', 'Pending. Preview contains no model answer to validate.'),
      traceItem('Policy', 'Pending. No category, confidence, or routing policy was applied.'),
      traceItem('Suggested route', 'Pending. Suggested only; no action executed.'),
    );
  } else {
    const { trace } = result;
    const reason = {
      threshold_met: 'Threshold met: confidence is at or above the threshold.',
      below_threshold: 'Below threshold: application policy sends this result to human review.',
      other_category: 'Other category: application policy sends this result to human review regardless of confidence.',
    }[trace.reason];
    items.push(
      traceItem('Validation', `Passed. Normalized answers accepted: department ${trace.category}; urgent ${Math.round(result.answers.urgent.noul * 100)}%; frustration ${result.answers.frustration.score.toFixed(2)} / 2.`),
      traceItem('Policy', `Category ${trace.category}; confidence ${trace.confidence.toFixed(2)}; threshold ${trace.threshold.toFixed(2)}. ${reason}`),
      traceItem('Suggested route', `${trace.decision.action === 'review' ? 'Human review' : trace.decision.queue}. Suggested only; no action executed.`),
    );
  }
  $('trace-list').replaceChildren(...items);
  $('trace').hidden = false;
}
$('form').addEventListener('input', reset);
document.querySelectorAll('[data-sample]').forEach(button => button.addEventListener('click', () => { $('ticket').value = button.dataset.sample; reset(); }));
fetch('/api/status').then(r => r.json()).then(s => { $('connection').textContent = s.configured ? 'Local server / key configured' : 'Local server / preview only — no key'; }).catch(() => { $('connection').textContent = 'Local server unavailable'; });
$('form').addEventListener('submit', async event => {
  event.preventDefault();
  if (pending) return;
  reset(); pending = true;
  const input = { text: $('ticket').value, threshold: Number($('threshold').value), live: $('live').checked };
  const controls = [...$('form').querySelectorAll('input, textarea, button')];
  controls.forEach(control => { control.disabled = true; });
  $('status').textContent = input.live ? 'Requesting a typed decision…' : 'Preparing request preview…';
  try {
    const response = await fetch('/api/triage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: AbortSignal.timeout(35000) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Request failed.');
    $('raw').textContent = JSON.stringify(result, null, 2); $('raw-details').hidden = false;
    if (result.mode === 'request_preview') {
      $('status').textContent = `Preview only · 0 API calls · Keyword baseline: ${result.baseline}. This is not a Jev answer.`;
      renderTrace(input, result);
      $('raw-details').open = true; return;
    }
    $('status').textContent = 'Live response validated. Suggested action only.';
    $('decision').hidden = false; $('raw-details').open = false;
    $('queue').textContent = result.decision.action === 'review' ? 'Send to human review' : `Route to ${result.decision.queue}`;
    $('meta').textContent = `${result.model} · ${result.latency_ms} ms · ${result.usage.input_tokens} input / ${result.usage.output_tokens} output tokens · confidence ${result.answers.department.confidence.toFixed(2)}`;
    $('probabilities').replaceChildren();
    for (const [name, probability] of Object.entries(result.answers.department.probabilities)) {
      const row = document.createElement('div'); row.className = 'probability';
      const label = document.createElement('span'); label.textContent = name;
      const meter = document.createElement('meter'); meter.min = 0; meter.max = 1; meter.value = probability; meter.setAttribute('aria-label', `${name} probability`);
      const value = document.createElement('span'); value.textContent = `${Math.round(probability * 100)}%`;
      row.append(label, meter, value); $('probabilities').append(row);
    }
    $('signals').textContent = `Urgency: ${Math.round(result.decision.urgency_probability * 100)}% · Frustration: ${result.decision.frustration_score.toFixed(2)} / 2`;
    renderTrace(input, result);
  } catch (error) { $('status').textContent = error.name === 'TimeoutError' ? 'Request timed out. No decision was made.' : error.message; }
  finally { pending = false; controls.forEach(control => { control.disabled = false; }); }
});

let recordedReport = null;
const display = value => value === null || value === undefined ? 'Not available' : String(value);
const percent = value => value === null || value === undefined ? 'Not available' : `${(value * 100).toFixed(1)}%`;
function definition(term, description) {
  const dt = document.createElement('dt'); dt.textContent = term;
  const dd = document.createElement('dd'); dd.textContent = description;
  return [dt, dd];
}
function renderMatrix(target, matrix) {
  if (!matrix) {
    const row = document.createElement('tr');
    const cell = document.createElement('td'); cell.textContent = 'Not available';
    row.append(cell); $(target).replaceChildren(row); return;
  }
  const labels = Object.keys(matrix);
  const heading = document.createElement('tr');
  const corner = document.createElement('th'); corner.scope = 'col'; corner.textContent = 'Expected ↓ / Predicted →';
  heading.append(corner, ...labels.map(label => { const cell = document.createElement('th'); cell.scope = 'col'; cell.textContent = label; return cell; }));
  const rows = labels.map(expected => {
    const row = document.createElement('tr');
    const label = document.createElement('th'); label.scope = 'row'; label.textContent = expected;
    row.append(label, ...labels.map(predicted => { const cell = document.createElement('td'); cell.textContent = display(matrix[expected][predicted]); return cell; }));
    return row;
  });
  $(target).replaceChildren(heading, ...rows);
}
function renderRecordedCases() {
  const filter = $('recorded-filter').value;
  const include = row => filter === 'all'
    || (filter === 'errors' && row.status === 'error')
    || (filter === 'review' && row.decision?.action === 'review')
    || (filter === 'misclassified' && row.status === 'ok' && row.prediction !== row.expected);
  const rows = recordedReport.cases.filter(include);
  $('recorded-filter-summary').textContent = rows.length ? `${rows.length} of ${recordedReport.cases.length} cases shown. Aggregate metrics retain full-report denominators.` : `No cases match this filter. Aggregate metrics still use all ${recordedReport.cases.length} attempts.`;
  $('recorded-cases').replaceChildren(...rows.map(item => {
    const row = document.createElement('tr');
    const decision = item.decision ? (item.decision.action === 'review' ? 'Human review' : `Route to ${item.decision.queue}`) : 'Not available';
    const values = [item.id, item.expected, display(item.prediction), item.baseline, item.status === 'ok' ? 'Successful' : 'Error', decision, item.confidence === null ? 'Not available' : Number(item.confidence).toFixed(2), item.latency_ms === null ? 'Not available' : `${item.latency_ms} ms`];
    row.append(...values.map(value => { const cell = document.createElement('td'); cell.textContent = value; return cell; }));
    return row;
  }));
}
function renderRecorded(report) {
  recordedReport = report;
  const { metadata, summary, diagnostics } = report;
  const recordedAt = metadata.recorded_at === null ? 'Not available' : new Date(metadata.recorded_at).toLocaleString();
  $('recorded-metadata').replaceChildren(
    ...definition('Requested model', metadata.requested_model),
    ...definition('Resolved model', display(metadata.model)),
    ...definition('Recorded date', recordedAt),
    ...definition('Evaluation split', metadata.split),
    ...definition('Routing threshold', display(metadata.threshold)),
    ...definition('Sample size', `${summary.cases} synthetic cases`),
    ...definition('Report', `${report.report_id} · recorded replay · ${report.api_calls} API calls`),
  );
  const notices = [...report.warnings];
  notices.push(report.summary_matches_recorded ? 'Recomputed summary matches the recorded summary.' : 'Warning: recomputed summary does not match the recorded summary.');
  $('recorded-warnings').replaceChildren(...notices.map(value => { const item = document.createElement('li'); item.textContent = value; return item; }));
  const model = diagnostics.model;
  const correctSuccessful = model?.accuracy === null || model?.accuracy === undefined ? null : Math.round(model.accuracy * model.successful);
  const correctAttempts = model?.correct_per_attempt === null || model?.correct_per_attempt === undefined ? null : Math.round(model.correct_per_attempt * model.attempts);
  const baselineCorrect = diagnostics.baseline.accuracy === null ? null : Math.round(diagnostics.baseline.accuracy * diagnostics.baseline.successful);
  $('recorded-metrics').replaceChildren(
    ...definition('Model accuracy · successful responses', correctSuccessful === null ? 'Not available' : `${correctSuccessful}/${model.successful} (${percent(model.accuracy)})`),
    ...definition('Model accuracy · all attempts', correctAttempts === null ? 'Not available' : `${correctAttempts}/${model.attempts} (${percent(model.correct_per_attempt)})`),
    ...definition('Keyword baseline accuracy', baselineCorrect === null ? 'Not available' : `${baselineCorrect}/${diagnostics.baseline.attempts} (${percent(diagnostics.baseline.accuracy)})`),
    ...definition('Failed requests', `${summary.errors}/${summary.cases}`),
    ...definition('Human review coverage', `${summary.review_count}/${summary.cases} (${percent(summary.cases ? summary.review_count / summary.cases : null)})`),
    ...definition('Wrong automatic routes', display(diagnostics.wrong_auto_routes)),
    ...definition('Successful-call latency', summary.latency_ms.p50 === null ? 'Not available' : `p50 ${summary.latency_ms.p50} ms · p95 ${summary.latency_ms.p95} ms`),
    ...definition('Historical token estimate', summary.estimated_successful_cost_usd === null ? 'Not available' : `$${summary.estimated_successful_cost_usd.toFixed(6)} · ${summary.cost_basis}`),
  );
  renderMatrix('recorded-model-matrix', model?.confusion_matrix ?? null);
  renderMatrix('recorded-baseline-matrix', diagnostics.baseline.confusion_matrix);
  renderRecordedCases();
  $('recorded-results').hidden = false;
}
$('recorded-filter').addEventListener('change', renderRecordedCases);
$('load-recorded').addEventListener('click', async () => {
  const button = $('load-recorded'); button.disabled = true;
  $('recorded-results').hidden = true;
  $('recorded-status').textContent = 'Loading the saved report…';
  try {
    const response = await fetch('/api/reports/support-routing-2026-09-21', { signal: AbortSignal.timeout(10000) });
    const report = await response.json();
    if (!response.ok) throw new Error(report.error || 'Recorded experiment unavailable.');
    renderRecorded(report);
    $('recorded-status').textContent = 'Recorded experiment loaded locally. No provider calls were made.';
  } catch (error) {
    $('recorded-status').textContent = error.name === 'TimeoutError' ? 'Recorded experiment timed out. Try again.' : 'Recorded experiment unavailable. Try again.';
  } finally { button.disabled = false; }
});
