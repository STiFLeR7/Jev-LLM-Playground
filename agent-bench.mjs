import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { agentPolicyVersion, agentRequest } from './agent.mjs';

const routes = ['tool', 'workflow', 'llm', 'human_review'];
const splits = ['development', 'test'];
const strata = ['clear', 'paraphrase_negation', 'mixed_intent_ambiguous', 'instruction_noise_permission_claim'];
const own = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).sort().join(',') === [...keys].sort().join(',');
const requireValid = (condition, message) => { if (!condition) throw Error(message); };
const named = value => typeof value === 'string' && value.trim().length > 0;
const id = value => typeof value === 'string' && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value);
const normalized = value => value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function validateAgentDataset(dataset) {
  requireValid(own(dataset, ['schema_version','id','rubric','author_provenance','cases']) && dataset.schema_version === 1 && dataset.id === 'agent-routing-v2', 'Invalid dataset header.');
  requireValid(own(dataset.rubric, ['tool','workflow','llm','human_review','review_required']) && Object.values(dataset.rubric).every(named), 'Invalid rubric.');
  requireValid(own(dataset.author_provenance, ['kind','description']) && dataset.author_provenance.kind === 'ai_author' && named(dataset.author_provenance.description), 'Invalid author provenance.');
  requireValid(Array.isArray(dataset.cases) && dataset.cases.length === 64, 'Expected 64 cases.');
  const ids = new Set(), texts = new Set(), families = new Map();
  const counts = Object.fromEntries(strata.map(s => [s, 0]));
  let development = 0, test = 0;
  for (const item of dataset.cases) {
    requireValid(own(item, ['id','family_id','split','stratum','text','expected_route','review_required','rationale','reference_status','reviews','pair_relation']), 'Invalid case fields.');
    requireValid(id(item.id) && !ids.has(item.id) && id(item.family_id), 'Invalid or duplicate case ID.');
    ids.add(item.id);
    requireValid(splits.includes(item.split) && strata.includes(item.stratum) && routes.includes(item.expected_route), 'Invalid case label.');
    requireValid(typeof item.text === 'string' && item.text.trim().length > 0 && item.text.length <= 4000, 'Invalid case text.');
    agentRequest(item.text);
    const key = normalized(item.text);
    requireValid(!texts.has(key), 'Duplicate normalized text.');
    texts.add(key);
    requireValid(typeof item.review_required === 'boolean' && item.review_required === (item.expected_route === 'human_review'), 'Inconsistent review label.');
    requireValid(named(item.rationale) && ['author_only','agreed','disputed'].includes(item.reference_status) && Array.isArray(item.reviews), 'Invalid provenance.');
    requireValid(['same_route','different_route'].includes(item.pair_relation), 'Invalid pair relation.');
    if (item.reference_status === 'author_only') requireValid(item.reviews.length === 0, 'Author-only case has reviews.');
    else {
      requireValid(item.reviews.length >= 2, 'Human reviews required.');
      const reviewers = new Set();
      for (const review of item.reviews) {
        requireValid(own(review, ['reviewer','kind','independent','expected_route','review_required','rationale']) &&
          id(review.reviewer) && !reviewers.has(review.reviewer) && ['human','ai'].includes(review.kind) &&
          typeof review.independent === 'boolean' && routes.includes(review.expected_route) &&
          review.review_required === (review.expected_route === 'human_review') && named(review.rationale), 'Invalid review.');
        reviewers.add(review.reviewer);
      }
      const humans = item.reviews.filter(r => r.kind === 'human' && r.independent);
      requireValid(humans.length >= 2, 'Two independent human reviewers required.');
      const unanimous = humans.every(r => r.expected_route === humans[0].expected_route && r.review_required === humans[0].review_required);
      requireValid(item.reference_status === (unanimous ? 'agreed' : 'disputed'), 'Review status conflicts with human labels.');
      if (unanimous) requireValid(item.expected_route === humans[0].expected_route, 'Reference differs from agreed review.');
    }
    if (item.split === 'development') development++; else { test++; counts[item.stratum]++; }
    const family = families.get(item.family_id) ?? [];
    family.push(item); families.set(item.family_id, family);
  }
  requireValid(development === 16 && test === 48 && families.size === 32, 'Invalid split or family counts.');
  requireValid(strata.every(s => counts[s] === 12), 'Invalid test strata.');
  requireValid(routes.every(r => dataset.cases.filter(c => c.split === 'test' && c.expected_route === r).length >= 6), 'Test route underrepresented.');
  for (const pair of families.values()) requireValid(pair.length === 2 && pair[0].split === pair[1].split &&
    pair[0].pair_relation === pair[1].pair_relation &&
    (pair[0].expected_route === pair[1].expected_route) === (pair[0].pair_relation === 'same_route'), 'Invalid pair or split leakage.');
  return dataset;
}

export async function loadAgentExperiment(configPath) {
  const path = resolve(configPath);
  const configBytes = await readFile(path);
  const config = JSON.parse(configBytes);
  requireValid(own(config, ['schema_version','dataset','dataset_version','split','policy_version','threshold','requested_model','attempts_per_case']) &&
    config.schema_version === 1 && config.dataset_version === 'agent-routing-v2' && splits.includes(config.split) &&
    config.policy_version === agentPolicyVersion && config.threshold === .8 && config.requested_model === 'gpt-6-luna' &&
    config.attempts_per_case === 1 && typeof config.dataset === 'string' && config.dataset === '../data/agent-routing-v2.json', 'Invalid experiment config.');
  const datasetPath = resolve(dirname(path), config.dataset);
  const datasetBytes = await readFile(datasetPath);
  const dataset = validateAgentDataset(JSON.parse(datasetBytes));
  return { config, dataset, cases:dataset.cases.filter(c => c.split === config.split), hashes:{config:sha256(configBytes),dataset:sha256(datasetBytes)}, configBytes, datasetBytes };
}
