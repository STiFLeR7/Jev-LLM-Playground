const $ = id => document.getElementById(id);
function showWorkspace(focus = false) {
  const name = ['playground', 'evidence', 'learn', 'agent'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'playground';
  $('workspace-context').textContent={playground:'Support routing',evidence:'Recorded evidence',learn:'Learning guide',agent:'Agent routing'}[name];
  for (const view of document.querySelectorAll('.workspace-view')) view.hidden = view.id !== `view-${name}`;
  for (const link of document.querySelectorAll('nav[aria-label="Workspace"] a')) {
    if (link.hash === `#${name}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  if (focus) $({ playground: 'playground-title', evidence: 'recorded-title', learn: 'learn-title', agent: 'agent-title' }[name]).focus({ preventScroll: true });
}
window.addEventListener('hashchange', () => { showWorkspace(true); window.scrollTo(0, 0); });
document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault(); $('main').focus();
});
showWorkspace();
let pending = false;
function reset() {
  $('threshold-value').value = Number($('threshold').value).toFixed(2);
  $('submit').textContent = $('live').checked ? 'Run live decision' : 'Preview request';
  $('decision').hidden = $('trace').hidden = $('raw-details').hidden = true;
  $('trace-list').replaceChildren();
  $('raw').textContent = '';
  $('result-empty').hidden = false;
  $('output-mode').textContent = 'Awaiting input';
  $('status').dataset.state = 'ready';
  document.querySelector('.button-note').textContent = $('live').checked ? 'Live request uses your API credits.' : 'Preview builds a request. No model call.';
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
  $('result-empty').hidden = true;
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
function showConnection(configured) {
  $('connection').textContent = configured ? 'API key configured' : 'Preview only · no key';
  $('connection').dataset.configured = String(configured);
}
fetch('/api/status').then(r => r.json()).then(s => showConnection(s.configured)).catch(() => { $('connection').textContent = 'Local server unavailable'; });
let keyPending = false;
async function changeKey(clear = false) {
  if (keyPending) return;
  keyPending = true;
  const body = JSON.stringify({ apiKey: clear ? null : $('api-key').value });
  $('api-key').value = '';
  const controls = [...$('key-form').querySelectorAll('input, button')];
  controls.forEach(control => { control.disabled = true; });
  $('key-status').textContent = clear ? 'Clearing key…' : 'Saving in server memory…';
  try {
    const response = await fetch('/api/key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(10000) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Key change failed.');
    showConnection(result.configured);
    $('live').checked = false; reset();
    $('key-status').textContent = clear ? 'Key cleared. Live requests are unavailable until a key is added or the server restarts with an environment key.' : 'Key stored until server restart. Not verified with TypeSafe. Enable Live only when ready.';
  } catch {
    $('key-status').textContent = 'Could not confirm the change. Wait for any live request to finish, then re-enter the key or clear it again.';
  } finally {
    keyPending = false; controls.forEach(control => { control.disabled = false; });
  }
}
$('key-form').addEventListener('submit', event => { event.preventDefault(); changeKey(); });
$('clear-key').addEventListener('click', () => changeKey(true));
$('form').addEventListener('submit', async event => {
  event.preventDefault();
  if (pending) return;
  reset(); pending = true;
  const input = { text: $('ticket').value, threshold: Number($('threshold').value), live: $('live').checked };
  const controls = [...$('form').querySelectorAll('input, textarea, button')];
  controls.forEach(control => { control.disabled = true; });
  $('status').textContent = input.live ? 'Requesting a typed decision…' : 'Preparing request preview…';
  $('output-mode').textContent = input.live ? 'Requesting live answer' : 'Preparing preview';
  try {
    const response = await fetch('/api/triage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: AbortSignal.timeout(35000) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Request failed.');
    $('raw').textContent = JSON.stringify(result, null, 2); $('raw-details').hidden = false;
    if (result.mode === 'request_preview') {
      $('output-mode').textContent = 'Preview · no model call';
      $('status').textContent = `Preview only · 0 API calls · Keyword baseline: ${result.baseline}. This is not a Jev answer.`;
      renderTrace(input, result);
      $('raw-details').open = false; return;
    }
    $('status').textContent = 'Live response validated. Suggested action only.';
    $('status').dataset.state = 'live';
    $('output-mode').textContent = 'Live response';
    $('decision').dataset.action = result.decision.action;
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
  } catch (error) {
    $('status').textContent = error.name === 'TimeoutError' ? 'Request timed out. No decision was made.' : error.message;
    $('status').dataset.state = 'error'; $('output-mode').textContent = 'No decision';
  }
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
  if (!recordedReport) return;
  const filter = $('recorded-filter').value;
  const include = row => filter === 'all'
    || (filter === 'errors' && row.status === 'error')
    || (filter === 'review' && row.decision?.action === 'review')
    || (filter === 'wrong-route' && row.decision?.action === 'route' && row.prediction !== row.expected)
    || (filter === 'disputed' && row.reference_status === 'disputed')
    || (filter === 'misclassified' && row.status === 'ok' && row.prediction !== row.expected);
  const rows = recordedReport.cases.filter(include);
  $('recorded-filter-summary').textContent = `${rows.length ? `${rows.length} of ${recordedReport.cases.length} attempts shown (${new Set(rows.map(r => r.id)).size} unique tickets).` : 'No attempts match this filter.'} Aggregate metrics retain full-experiment denominators; agreed-reference metrics remain separate.`;
  $('recorded-cases').replaceChildren(...rows.map(item => {
    const row = document.createElement('tr');
    const decision = item.decision ? (item.decision.action === 'review' ? 'Human review' : `Route to ${item.decision.queue}`) : 'Not available';
    const input = document.createElement('td');
    input.textContent = item.id;
    if (item.text) {
      const details = document.createElement('details');
      const summary = document.createElement('summary'); summary.textContent = 'Read saved input';
      const text = document.createElement('p'); text.textContent = item.text;
      details.append(summary, text); input.append(details);
    }
    row.append(input);
    const review = { agreed: 'AI-agreed', disputed: 'Disputed', not_reviewed: 'Not independently reviewed' }[item.reference_status];
    const values = [item.pass, review, item.expected, display(item.prediction), item.baseline, item.status === 'ok' ? 'Successful' : 'Error', decision, item.confidence === null ? 'Not available' : Number(item.confidence).toFixed(2), item.latency_ms === null ? 'Not available' : `${item.latency_ms} ms`];
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
    ...definition('Dataset', metadata.dataset),
    ...definition('Recorded routing threshold', display(metadata.recorded_threshold)),
    ...definition('Sample size', `${metadata.unique_cases} unique synthetic tickets · ${metadata.attempts_per_case} retained pass(es)`),
    ...definition('Attempts', `${summary.cases} observed / ${metadata.planned_attempts} planned · ${summary.unattempted ?? 0} unattempted`),
    ...definition('Collection status', metadata.stop_reason),
    ...definition('Report', `${report.report_id} · recorded replay · ${report.api_calls} API calls`),
  );
  const warningText = {
    legacy_provenance_incomplete: 'Historical report: original provenance is incomplete. Only one pass is retained; original ticket text is not included in this artifact.',
    synthetic_author_labels: 'Synthetic tickets with author-assigned labels, not real customer traffic.',
    repeats_are_correlated: 'Repeated attempts are correlated observations, not additional independent tickets.',
    hashes_are_not_independent_authenticity: 'Hashes identify frozen inputs; they do not establish independent authenticity.',
    cost_is_pricing_based_not_invoice: 'Cost is a dated pricing estimate, not a provider invoice.',
    blind_ai_review_not_human_adjudication: 'Six references were disputed before the run. Blind AI review is not independent human adjudication.',
  };
  const notices = report.warnings.map(w => warningText[w] || w);
  notices.push(report.summary_matches_recorded ? 'Replay at the original recorded threshold matches the saved summary.' : 'Warning: replay at the original recorded threshold does not match the saved summary.');
  $('recorded-warnings').replaceChildren(...notices.map(value => { const item = document.createElement('li'); item.textContent = value; return item; }));
  const model = diagnostics.model;
  const correctSuccessful = model?.accuracy === null || model?.accuracy === undefined ? null : Math.round(model.accuracy * model.successful);
  const correctAttempts = model?.correct_per_attempt === null || model?.correct_per_attempt === undefined ? null : Math.round(model.correct_per_attempt * model.attempts);
  const baselineCorrect = diagnostics.baseline.accuracy === null ? null : Math.round(diagnostics.baseline.accuracy * diagnostics.baseline.successful);
  $('recorded-metrics').replaceChildren(
    ...definition('Model accuracy · successful responses', correctSuccessful === null ? 'Not available' : `${correctSuccessful}/${model.successful} (${percent(model.accuracy)})`),
    ...definition('Model accuracy · all attempts', correctAttempts === null ? 'Not available' : `${correctAttempts}/${model.attempts} (${percent(model.correct_per_attempt)})`),
    ...definition('Keyword baseline · unique tickets', baselineCorrect === null ? 'Not available' : `${baselineCorrect}/${diagnostics.baseline.attempts} (${percent(diagnostics.baseline.accuracy)})`),
    ...definition('Failed requests', `${summary.errors}/${summary.cases}`),
    ...definition('Human review coverage', `${summary.review_count}/${summary.cases} (${percent(summary.cases ? summary.review_count / summary.cases : null)})`),
    ...definition('Automatic routes · observed attempts', `${summary.automatically_routed}/${summary.cases}`),
    ...definition('Wrong automatic routes', display(diagnostics.wrong_auto_routes)),
    ...definition(metadata.latency_basis, summary.latency_ms.p50 === null ? 'Not available' : `p50 ${summary.latency_ms.p50} ms · p95 ${summary.latency_ms.p95} ms`),
    ...definition('Historical token estimate', summary.estimated_successful_cost_usd === null ? 'Not available' : `$${summary.estimated_successful_cost_usd.toFixed(6)} · ${summary.cost_basis}`),
  );
  $('recorded-threshold').value = metadata.threshold;
  $('recorded-threshold-value').value = metadata.threshold.toFixed(2);
  $('recorded-policy-label').textContent = `All author references. Routing uses ${metadata.threshold.toFixed(2)} ${metadata.threshold === metadata.recorded_threshold ? '(recorded policy)' : `(exploratory; recorded policy was ${metadata.recorded_threshold.toFixed(2)})`}. Predictions and classification metrics are unchanged by threshold exploration.`;
  $('recorded-agreed').hidden = !report.agreed;
  $('recorded-agreed-metrics').replaceChildren();
  if (report.agreed) {
    const a = report.agreed;
    $('recorded-agreed-metrics').append(
      ...definition('Reference set', `${a.agreed_cases} agreed tickets · ${a.disputed_case_ids.length} disputed tickets excluded`),
      ...definition('Matching attempts', `${Math.round(a.classification.correct_per_attempt * a.classification.attempts)}/${a.classification.attempts} (${percent(a.classification.correct_per_attempt)})`),
      ...definition('Automatic routes / reviews', `${a.routing.automatically_routed} / ${a.routing.review_count}`),
      ...definition('Wrong automatic routes', display(a.routing.wrong_auto_routes)),
    );
  }
  renderMatrix('recorded-model-matrix', model?.confusion_matrix ?? null);
  renderMatrix('recorded-baseline-matrix', diagnostics.baseline.confusion_matrix);
  renderRecordedCases();
  $('evidence-empty').hidden = true;
  $('recorded-results').hidden = false;
}
$('recorded-filter').addEventListener('change', renderRecordedCases);
let exploredThreshold;
async function loadRecorded() {
  const controls = ['load-recorded', 'recorded-experiment', 'recorded-threshold', 'recorded-reset', 'recorded-filter'].map($);
  const focusedControl = controls.includes(document.activeElement) ? document.activeElement : null;
  controls.forEach(c => { c.disabled = true; });
  recordedReport = null;
  $('evidence-empty').hidden = true;
  $('recorded-results').hidden = true;
  $('recorded-status').textContent = 'Loading the saved report…';
  try {
    const query = exploredThreshold === undefined ? '' : `?threshold=${exploredThreshold}`;
    const response = await fetch(`/api/evidence/${$('recorded-experiment').value}${query}`, { signal: AbortSignal.timeout(10000) });
    const report = await response.json();
    if (!response.ok) throw new Error(report.error || 'Recorded experiment unavailable.');
    renderRecorded(report);
    $('recorded-status').textContent = 'Saved answers replayed locally. No provider calls or file changes. Threshold controls affect this explorer only.';
  } catch (error) {
    $('evidence-empty').hidden = false;
    $('recorded-status').textContent = error.name === 'TimeoutError' ? 'Recorded experiment timed out. Try again.' : 'Recorded experiment unavailable. Try again.';
  } finally {
    controls.forEach(c => { c.disabled = false; });
    $('recorded-threshold').disabled = $('recorded-reset').disabled = !recordedReport;
    if (focusedControl && document.activeElement === document.body) {
      (focusedControl.disabled ? $('load-recorded') : focusedControl).focus({ preventScroll: true });
    }
  }
}
$('load-recorded').addEventListener('click', loadRecorded);
$('recorded-experiment').addEventListener('change', () => {
  recordedReport = null; exploredThreshold = undefined;
  $('evidence-empty').hidden = false;
  $('recorded-results').hidden = true;
  $('recorded-filter').value = 'all';
  $('recorded-threshold').value = 0.8; $('recorded-threshold-value').value = '0.80';
  $('recorded-threshold').disabled = $('recorded-reset').disabled = true;
  $('recorded-status').textContent = 'Experiment changed. Load its recorded answers to continue.';
});
$('recorded-threshold').addEventListener('input', () => {
  $('recorded-threshold-value').value = Number($('recorded-threshold').value).toFixed(2);
});
$('recorded-threshold').addEventListener('change', () => {
  exploredThreshold = Number($('recorded-threshold').value); loadRecorded();
});
$('recorded-reset').addEventListener('click', () => {
  exploredThreshold = undefined; loadRecorded();
});

function resetAgent() {
  $('agent-result').hidden=true;$('agent-empty').hidden=false;
  $('agent-status').textContent='Inputs changed. Run again to inspect this task.';
  $('agent-status').dataset.state='ready';
}
$('agent-form').addEventListener('input',resetAgent);
document.querySelectorAll('[data-agent-sample]').forEach(button=>button.addEventListener('click',()=>{$('agent-text').value=button.dataset.agentSample;resetAgent();}));
let agentPending=false;
$('agent-form').addEventListener('submit',async event=>{
  event.preventDefault();if(agentPending)return;
  resetAgent();agentPending=true;
  const input={text:$('agent-text').value,mode:$('agent-mode').value,threshold:.8,execute:$('agent-execute').checked,nim:$('agent-nim').checked};
  const controls=[...$('agent-form').querySelectorAll('input,textarea,select,button')];
  controls.forEach(control=>{control.disabled=true;});
  $('agent-status').textContent='Running the harness; an enabled NVIDIA handoff may take up to 30 seconds…';
  try {
    const response=await fetch('/api/agent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:AbortSignal.timeout(35000)});
    if(!response.ok)throw Error('Request failed');
    const result=await response.json();
    $('agent-status').textContent=`${result.mode==='preview'?'Request preview':'Deterministic baseline'} · ${result.api_calls} provider calls · Not a Jev observation`;
    $('agent-outcome').textContent={preview:'Request prepared',suggested:'Local operation suggested',completed:result.llm?'NVIDIA text response received':'Local operation completed',handoff:'LLM handoff — not executed',human_review:'Stopped for human review'}[result.status];
    $('agent-reason').textContent=result.decision?`${result.decision.route} · ${result.decision.reason}`:'No decision or policy applied.';
    $('agent-output').textContent=result.execution.performed?(typeof result.execution.output==='string'?result.execution.output:JSON.stringify(result.execution.output,null,2)):'No operation performed.';
    $('agent-trace').replaceChildren(...result.trace.map(item=>traceItem(item.stage,item.detail)));
    $('agent-json').textContent=JSON.stringify(result,null,2);
    $('agent-empty').hidden=true;$('agent-result').hidden=false;
  } catch {
    $('agent-status').textContent='Run failed; no automatic retry. Check the task, server-side NVIDIA key and account access. A dispatched request may have consumed quota.';
    $('agent-status').dataset.state='error';
  } finally {agentPending=false;controls.forEach(control=>{control.disabled=false;});}
});
