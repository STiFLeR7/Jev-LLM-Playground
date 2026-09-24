import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadAgentExperiment, validateAgentDataset } from '../agent-bench.mjs';

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
