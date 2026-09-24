import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadAgentExperiment, validateAgentDataset, parseRoutingAnswer, summarizeAgentRows } from '../agent-bench.mjs';
import { applyAgentPolicy } from '../agent.mjs';

test('routing answer is bounded exact JSON with boolean approval and no invented confidence', () => {
  assert.deepEqual(parseRoutingAnswer('{"route":"llm","approval_needed":false}'), {route:'llm',approval_needed:false});
  for (const text of ['```json\n{"route":"llm","approval_needed":false}\n```',
    '{"route":"llm","approval_needed":"false"}',
    '{"route":"llm","approval_needed":false,"confidence":1}',
    '{"route":"shell","approval_needed":false}', '{"route":"llm","approval_needed":false,"route":"tool"}',
    '{"route":"llm","approval_needed":false,"\\u0072oute":"tool"}',
    '', 'x'.repeat(1001)]) assert.throws(() => parseRoutingAnswer(text));
  assert.deepEqual(parseRoutingAnswer('{"route":"tool","approval_needed":true}'), {route:'tool',approval_needed:true});
});

const row = (id, family_id, text, expected_route, baseline, observation, status='ok', pair_relation='different_route') => ({
  id,family_id,text,expected_route,baseline,observation,status,pair_relation,
  stratum:'clear',reference_status:'author_only',
  final:status==='ok' ? applyAgentPolicy(text,{route:observation.route,approval_needed:Number(observation.approval_needed),confidence:null}) : null,
});
const five = () => [
  row('one','pair-a','Please draft a greeting','llm','human_review',{route:'llm',approval_needed:false}),
  row('two','pair-a','calculate: 2 / 0','human_review','human_review',{route:'tool',approval_needed:false}),
  row('three','pair-b','draft: a greeting','llm','llm',{route:'llm',approval_needed:true},'ok','same_route'),
  row('four','pair-b','draft: a farewell','llm','llm',null,'error','same_route'),
  row('five','pair-c','calculate: 2 + 2','tool','tool',null,'not_attempted','same_route'),
];

test('metrics keep scheduled errors, capability catches, avoidable reviews and baseline gain distinct', () => {
  const rows=five(), m=summarizeAgentRows(rows);
  assert.equal(m.scheduled,5);assert.equal(m.successful,3);assert.equal(m.error,1);assert.equal(m.not_attempted,1);
  assert.equal(m.automatic,1);assert.equal(m.coverage,.2);
  assert.equal(m.attribution.caught_wrong_auto,1);assert.equal(m.attribution.unnecessary_review,1);
  assert.equal(m.wrong_automatic,0);assert.equal(m.attribution.surviving_wrong_auto,0);
  assert.equal(m.attribution.correct_auto_gained,1);assert.equal(m.attribution.correct_auto_lost,1);
  assert.equal(m.raw.confusion_matrix.human_review.tool,1);
  assert.equal(m.final.confusion_matrix.llm.human_review,1);
  assert.equal(m.correct_per_scheduled,2/5);
  assert.equal(m.review.precision,.5);assert.equal(m.review.recall,1);
  assert.equal(m.always_review.coverage,0);assert.equal(m.always_review.wrong_automatic,0);
  assert.equal(m.by_reference_status.agreed.scheduled,0);
  assert.equal(m.by_reference_status.agreed.correct_per_scheduled,null);
  assert.equal(m.by_stratum.clear.scheduled,5);
  assert.equal(m.pairs.complete,1);assert.equal(m.pairs.excluded,2);
  assert.equal(m.repetition.raw_consistency,null);
  rows.push(row('six','pair-c','calculate: 3 + 3','tool','tool',{route:'llm',approval_needed:false},'ok','same_route'));
  const six=summarizeAgentRows(rows);
  assert.equal(six.wrong_automatic,1);
  assert.equal(six.attribution.surviving_wrong_auto,1);
  assert.equal(six.attribution.wrong_auto_introduced,1);
  assert.equal(six.false_local_routes,0);
});

test('counterfactual gates replay in precedence order and pair correctness is separate from consistency', () => {
  const rows=[
    row('a','same','calculate: 1 / 0','human_review','human_review',{route:'tool',approval_needed:true},'ok','same_route'),
    row('b','same','calculate: 2 / 0','human_review','human_review',{route:'tool',approval_needed:false},'ok','same_route'),
    row('c','missing','draft: hi','llm','llm',null,'error','same_route'),
    row('d','missing','draft: bye','llm','llm',{route:'llm',approval_needed:false},'ok','same_route'),
  ];
  const m=summarizeAgentRows(rows);
  assert.equal(m.pairs.complete,1);assert.equal(m.pairs.excluded,1);
  assert.equal(m.pairs.raw_consistent,1);assert.equal(m.pairs.raw_both_correct,0);
  assert.equal(m.pairs.final_consistent,1);assert.equal(m.pairs.final_both_correct,1);
  assert.equal(m.gates.overlap.approval_unsupported_operation,1);
  assert.equal(m.gates.remove_approval.changed_to_automatic,0);
  assert.equal(m.gates.remove_approval.reasons.unsupported_operation,2);
  assert.equal(m.gates.remove_unsupported_operation.changed_to_automatic,1);
  assert.equal(m.gates.remove_unsupported_operation.wrong_automatic,1);
  const explicit=row('e','other','explain: hi','human_review','llm',{route:'human_review',approval_needed:false});
  assert.equal(summarizeAgentRows([explicit]).gates.remove_explicit_review.changed_to_automatic,0);
  assert.equal(summarizeAgentRows([]).coverage,null);
  const baselineOnly=summarizeAgentRows([row('z','unattempted','draft: hi','llm','llm',null,'not_attempted')]);
  assert.equal(baselineOnly.rules.accuracy,1);
  assert.equal(baselineOnly.raw,null);assert.equal(baselineOnly.final,null);
  assert.equal(baselineOnly.always_review.coverage,0);
});

test('versioned routing fixture has balanced paired splits', async () => {
  const { dataset, cases, config, hashes, datasetBytes, configBytes } = await loadAgentExperiment('experiments/agent-routing-v2.json');
  assert.equal(dataset.cases.length, 64);
  assert.equal(cases.length, 48);
  assert.equal(dataset.cases.filter(c => c.split === 'development').length, 16);
  assert.equal(new Set(dataset.cases.map(c => c.family_id)).size, 32);
  for (const stratum of ['clear', 'paraphrase_negation', 'mixed_intent_ambiguous', 'instruction_noise_permission_claim'])
    assert.equal(cases.filter(c => c.stratum === stratum).length, 12);
  for (const route of ['tool', 'workflow', 'llm', 'human_review'])
    assert.ok(cases.filter(c => c.expected_route === route).length >= 6);
  assert.equal(config.dataset_version, dataset.id);
  assert.equal(hashes.dataset.length, 64);
  assert.equal(hashes.config.length, 64);
  assert.equal(hashes.dataset, createHash('sha256').update(datasetBytes).digest('hex'));
  assert.equal(hashes.config, createHash('sha256').update(configBytes).digest('hex'));
  assert.ok(datasetBytes.length > 0 && configBytes.length > 0);
});

test('invalid case boundaries and provenance are rejected', async () => {
  const { dataset } = await loadAgentExperiment('experiments/agent-routing-v2.json');
  const invalid = change => { const copy = structuredClone(dataset); change(copy); assert.throws(() => validateAgentDataset(copy)); };
  invalid(d => { d.extra = true; });
  invalid(d => { d.cases[0].extra = true; });
  invalid(d => { d.cases[0].id = '!'; });
  invalid(d => { d.cases[1].id = d.cases[0].id; });
  invalid(d => { d.cases[0].expected_route = 'shell'; });
  invalid(d => { d.cases[0].split = 'training'; });
  invalid(d => { d.cases[0].stratum = 'other'; });
  invalid(d => { d.cases[0].text = '  '; });
  invalid(d => { d.cases[0].text = 'x'.repeat(4001); });
  invalid(d => { d.cases[1].text = `  ${d.cases[0].text.toUpperCase()}  `; });
  invalid(d => { d.cases[0].split = 'test'; });
  invalid(d => { d.cases[0].family_id = 'orphan'; });
  invalid(d => { d.cases[0].pair_relation = 'similar'; });
  invalid(d => { d.cases[0].pair_relation = 'different_route'; });
  invalid(d => { d.cases[0].expected_route = 'llm'; });
  invalid(d => { d.cases[0].review_required = !d.cases[0].review_required; });
  invalid(d => { d.cases[0].reference_status = 'agreed'; });
  invalid(d => { d.cases[0].reference_status = 'disputed'; });
  const long = structuredClone(dataset);
  long.cases[0].text = 'x'.repeat(4000);
  assert.equal(validateAgentDataset(long), long);
});

test('agreed labels need two distinct independent human reviewers', async () => {
  const { dataset } = await loadAgentExperiment('experiments/agent-routing-v2.json');
  const withReviews = () => {
    const copy = structuredClone(dataset);
    const item = copy.cases[0];
    item.reference_status = 'agreed';
    item.reviews = ['reviewer-a','reviewer-b'].map(reviewer => ({reviewer,kind:'human',independent:true,expected_route:item.expected_route,review_required:item.review_required,rationale:'Independent label.'}));
    return copy;
  };
  assert.equal(validateAgentDataset(withReviews()).cases[0].reference_status, 'agreed');
  const bad = change => { const copy = withReviews(); change(copy.cases[0]); assert.throws(() => validateAgentDataset(copy)); };
  bad(item => { item.reviews[1].reviewer = 'reviewer-a'; });
  bad(item => { item.reviews[1].kind = 'ai'; });
  bad(item => { item.reviews[1].independent = false; });
  bad(item => { item.reviews[1].expected_route = 'llm'; });
  bad(item => { item.reviews[1].extra = true; });
  const disputed = withReviews();
  disputed.cases[0].reference_status = 'disputed';
  disputed.cases[0].reviews[1].expected_route = 'human_review';
  disputed.cases[0].reviews[1].review_required = true;
  assert.equal(validateAgentDataset(disputed).cases[0].reference_status, 'disputed');
});

test('config is strict and dataset resolves beside config', async t => {
  const { config, datasetBytes } = await loadAgentExperiment('experiments/agent-routing-v2.json');
  const root = await mkdtemp(join(tmpdir(), 'agent-experiment-'));
  t.after(async () => { const { rm } = await import('node:fs/promises'); await rm(root, {recursive:true,force:true}); });
  await mkdir(join(root, 'data'));
  await mkdir(join(root, 'experiments'));
  await writeFile(join(root, 'data', 'agent-routing-v2.json'), datasetBytes);
  const path = join(root, 'experiments', 'config.json');
  await writeFile(path, JSON.stringify(config));
  assert.equal((await loadAgentExperiment(path)).cases.length, 48);
  for (const change of [c => { c.extra = true; }, c => { c.threshold = 2; }, c => { c.dataset = '../../other.json'; }, c => { c.requested_model = 'other'; }]) {
    const bad = structuredClone(config); change(bad); await writeFile(path, JSON.stringify(bad));
    await assert.rejects(loadAgentExperiment(path));
  }
});
