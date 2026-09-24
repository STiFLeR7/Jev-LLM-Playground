import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { agentPolicyVersion, agentRequest, applyAgentPolicy } from './agent.mjs';
import { classificationMetrics } from './evaluation.mjs';

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
const ratio = (a,b) => b ? a/b : null;

export function parseRoutingAnswer(text) {
  requireValid(typeof text === 'string' && text.length > 0 && text.length <= 1000, 'Invalid routing answer.');
  let answer;
  try { answer = JSON.parse(text); } catch { throw Error('Invalid routing answer.'); }
  requireValid(own(answer, ['route','approval_needed']) && routes.includes(answer.route) &&
    typeof answer.approval_needed === 'boolean' &&
    /^\s*\{\s*"(?:route|approval_needed)"\s*:\s*(?:"[a-z_]+"|true|false)\s*,\s*"(?:route|approval_needed)"\s*:\s*(?:"[a-z_]+"|true|false)\s*\}\s*$/.test(text), 'Invalid routing answer.');
  return answer;
}

function withoutGate(row, gate) {
  const p = row.final.predicates;
  const reason = ['approval','explicit_review','below_threshold','unsupported_operation']
    .find(key => key !== gate && p[key] === true);
  return {route:reason || row.observation.route === 'human_review' ? 'human_review' : row.observation.route,
    reason:reason === 'approval' ? 'approval_needed' : reason === 'explicit_review' ? 'model_review' : reason ?? 'threshold_met'};
}

function subsetMetrics(rows) {
  const successful = rows.filter(r => r.status === 'ok');
  const automatic = successful.filter(r => r.final.route !== 'human_review');
  const wrong = automatic.filter(r => r.final.route !== r.expected_route);
  const reviewed = successful.filter(r => r.final.route === 'human_review');
  const expectedReview = rows.filter(r => r.expected_route === 'human_review');
  const correct = successful.filter(r => r.final.route === r.expected_route).length;
  return {
    scheduled:rows.length, successful:successful.length,
    error:rows.filter(r => r.status === 'error').length,
    not_attempted:rows.filter(r => r.status === 'not_attempted').length,
    automatic:automatic.length, coverage:ratio(automatic.length,rows.length),
    correct, correct_per_scheduled:ratio(correct,rows.length),
    wrong_automatic:wrong.length, wrong_per_automatic:ratio(wrong.length,automatic.length),
    false_local_routes:wrong.filter(r => ['tool','workflow'].includes(r.final.route)).length,
    review_required_auto:automatic.filter(r => r.expected_route === 'human_review').length,
    review:{precision:ratio(reviewed.filter(r => r.expected_route === 'human_review').length,reviewed.length),
      recall:ratio(reviewed.filter(r => r.expected_route === 'human_review').length,expectedReview.length)},
    raw:successful.length ? classificationMetrics(rows.map(r => ({expected:r.expected_route,prediction:r.status === 'ok' ? r.observation.route : null})),routes) : null,
    final:successful.length ? classificationMetrics(rows.map(r => ({expected:r.expected_route,prediction:r.status === 'ok' ? r.final.route : null})),routes) : null,
    rules:classificationMetrics(rows.map(r => ({expected:r.expected_route,prediction:r.baseline})),routes),
    always_review:{automatic:0,coverage:ratio(0,rows.length),wrong_automatic:0,
      correct:expectedReview.length,correct_per_scheduled:ratio(expectedReview.length,rows.length)},
  };
}

export function summarizeAgentRows(rows) {
  requireValid(Array.isArray(rows), 'Invalid agent rows.');
  const ids = new Set();
  for (const row of rows) {
    requireValid(row && named(row.id) && !ids.has(row.id) && named(row.family_id) &&
      named(row.text) && strata.includes(row.stratum) && ['author_only','agreed','disputed'].includes(row.reference_status) &&
      routes.includes(row.expected_route) && routes.includes(row.baseline) &&
      ['same_route','different_route'].includes(row.pair_relation) &&
      ['ok','error','not_attempted'].includes(row.status), 'Invalid agent row.');
    ids.add(row.id);
    if (row.status === 'ok') {
      requireValid(own(row.observation,['route','approval_needed']) && routes.includes(row.observation.route) &&
        typeof row.observation.approval_needed === 'boolean', 'Invalid raw observation.');
      const expected = applyAgentPolicy(row.text,{route:row.observation.route,
        approval_needed:Number(row.observation.approval_needed),confidence:null});
      requireValid(isDeepStrictEqual(row.final,expected), 'Inconsistent policy disposition.');
    } else requireValid(row.observation === null && row.final === null, 'Missing attempt has observation.');
  }
  const out = subsetMetrics(rows), ok = rows.filter(r => r.status === 'ok');
  const baseCorrectAuto = r => r.baseline !== 'human_review' && r.baseline === r.expected_route;
  const finalCorrectAuto = r => r.final.route !== 'human_review' && r.final.route === r.expected_route;
  const wrongAuto = (route,r) => route !== 'human_review' && route !== r.expected_route;
  out.attribution = {
    paired_successful:ok.length,
    caught_wrong_auto:ok.filter(r => wrongAuto(r.observation.route,r) && r.final.route === 'human_review').length,
    unnecessary_review:ok.filter(r => r.observation.route === r.expected_route && r.observation.route !== 'human_review' && r.final.route === 'human_review').length,
    surviving_wrong_auto:ok.filter(r => wrongAuto(r.observation.route,r) && wrongAuto(r.final.route,r)).length,
    correct_auto_gained:ok.filter(r => !baseCorrectAuto(r) && finalCorrectAuto(r)).length,
    correct_auto_lost:ok.filter(r => baseCorrectAuto(r) && !finalCorrectAuto(r)).length,
    wrong_auto_introduced:ok.filter(r => !wrongAuto(r.baseline,r) && wrongAuto(r.final.route,r)).length,
  };
  const gates = ['approval','explicit_review','below_threshold','unsupported_operation'];
  out.gates = {overlap:{}};
  for (let i=0;i<gates.length;i++) for (let j=i+1;j<gates.length;j++)
    out.gates.overlap[`${gates[i]}_${gates[j]}`] = ok.filter(r => r.final.predicates[gates[i]] && r.final.predicates[gates[j]]).length;
  for (const gate of gates) {
    const replayed = ok.map(r => ({row:r,disposition:withoutGate(r,gate)}));
    const changed = replayed.filter(({row,disposition}) => row.final.route === 'human_review' && disposition.route !== 'human_review').map(({row}) => row);
    out.gates[`remove_${gate}`] = {changed_to_automatic:changed.length,
      correct_automatic:changed.filter(r => r.observation.route === r.expected_route).length,
      wrong_automatic:changed.filter(r => r.observation.route !== r.expected_route).length,
      reasons:Object.fromEntries(['approval_needed','model_review','below_threshold','unsupported_operation','threshold_met']
        .map(reason => [reason,replayed.filter(r => r.disposition.reason === reason).length]))};
  }
  out.by_stratum = Object.fromEntries(strata.map(s => [s,subsetMetrics(rows.filter(r => r.stratum === s))]));
  out.by_reference_status = Object.fromEntries(['agreed','author_only','disputed'].map(s => [s,subsetMetrics(rows.filter(r => r.reference_status === s))]));
  const families = Map.groupBy(rows,r => r.family_id);
  const complete = [...families.values()].filter(pair => pair.length === 2 && pair.every(r => r.status === 'ok'));
  const consistent = (pair,key) => (pair[0][key].route === pair[1][key].route) === (pair[0].pair_relation === 'same_route');
  out.pairs = {complete:complete.length, excluded:families.size-complete.length,
    raw_consistent:complete.filter(pair => (pair[0].observation.route === pair[1].observation.route) === (pair[0].pair_relation === 'same_route')).length,
    raw_both_correct:complete.filter(pair => pair.every(r => r.observation.route === r.expected_route)).length,
    final_consistent:complete.filter(pair => consistent(pair,'final')).length,
    final_both_correct:complete.filter(pair => pair.every(r => r.final.route === r.expected_route)).length,
    raw_consistency_rate:ratio(complete.filter(pair => (pair[0].observation.route === pair[1].observation.route) === (pair[0].pair_relation === 'same_route')).length,complete.length),
    final_both_correct_rate:ratio(complete.filter(pair => pair.every(r => r.final.route === r.expected_route)).length,complete.length)};
  out.repetition = {raw_consistency:null,final_consistency:null,excluded_incomplete_triplets:null};
  return out;
}

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
