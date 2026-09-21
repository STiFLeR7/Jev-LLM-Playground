const $ = id => document.getElementById(id);
let pending = false;
function reset() {
  $('threshold-value').value = Number($('threshold').value).toFixed(2);
  $('submit').textContent = $('live').checked ? 'Run live decision' : 'Preview request';
  $('decision').hidden = $('raw-details').hidden = true;
  $('raw').textContent = '';
  $('status').textContent = 'Ready. Run again to inspect these inputs.';
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
  } catch (error) { $('status').textContent = error.name === 'TimeoutError' ? 'Request timed out. No decision was made.' : error.message; }
  finally { pending = false; controls.forEach(control => { control.disabled = false; }); }
});
