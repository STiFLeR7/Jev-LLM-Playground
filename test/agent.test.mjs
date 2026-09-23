import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openBudget } from '../budget.mjs';
import { runAgent, agentQuestions } from '../agent.mjs';

const input = (text, extras = {}) => ({text,mode:'baseline',threshold:.8,execute:false,...extras});
test('agent CLI is offline by default and rejects ambiguous paid modes', () => {
  const cli=(...args)=>execFileSync(process.execPath,['agent.mjs',...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  assert.equal(JSON.parse(cli('--text','calculate: 12 + 3')).status,'preview');
  assert.equal(JSON.parse(cli('--baseline','--execute','--text','calculate: 12 + 3')).execution.output,15);
  assert.throws(()=>cli('--live','--baseline','--text','hi'));
  assert.throws(()=>cli('--text','hi','--threshold',''));
  assert.throws(()=>cli('--live','--text','hi'));
  assert.throws(()=>cli('--text','hi','--budget-usd','0.05'));
  assert.throws(()=>cli('--live','--budget-usd','0.05','--out','README.md','--text','hi'));
});
test('agent evaluation identifies its dataset and separates baseline from model evidence', () => {
  const report=JSON.parse(execFileSync(process.execPath,['agent-eval.mjs'],{encoding:'utf8'}));
  assert.equal(report.mode,'baseline');assert.equal(report.api_calls,0);
  assert.equal(report.rows.length,20);assert.match(report.dataset_sha256,/^[a-f0-9]{64}$/);
  assert.equal(report.metrics.correct,20);assert.equal(report.metrics.false_local_routes,0);
  assert.equal(report.metrics.live_accuracy,null);
});
test('CLI preserves an existing output even with live credentials present', async t => {
  const dir=await mkdtemp(join(tmpdir(),'jev-agent-output-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const path=join(dir,'existing.json');await writeFile(path,'preserve me');
  assert.throws(()=>execFileSync(process.execPath,['agent.mjs','--live','--budget-usd','0.05','--out',path,'--text','calculate: 1 + 2'],{env:{...process.env,TYPESAFE_API_KEY:'dummy-only',JEV_LLM_API:''},stdio:'pipe'}));
  assert.equal(await readFile(path,'utf8'),'preserve me');
});
const reply = (route='tool', confidence=.9, approval=0) => ({model:'jev-1.13.0',answers:{
  route:{type:'choice',choice:route,confidence,probabilities:Object.fromEntries(['tool','workflow','llm','human_review'].map(key=>[key,key===route?1:0]))},
  approval_needed:{type:'noul',noul:approval},
  complexity:{type:'score',score:0,confidence:1,probabilities:{0:1,1:0,2:0},legend:Object.fromEntries(agentQuestions.complexity.criteria.map((v,i)=>[i,v]))}
},usage:{input_tokens:100,output_tokens:0}});

test('agent preview, explicit consent and bounded pure operations', async () => {
  assert.equal((await runAgent(input('calculate: 12 + 3'))).status,'suggested');
  const done = await runAgent(input('calculate: 12 + 3',{execute:true}));
  assert.equal(done.execution.output,15); assert.equal(done.status,'completed');
  assert.equal(done.observation,null); assert.equal(done.api_calls,0);
  assert.equal((await runAgent(input('count words: a b c',{execute:true}))).execution.output,3);
  assert.deepEqual((await runAgent(input('checklist: first; second',{execute:true}))).execution.output,['first','second']);
  assert.equal((await runAgent(input('draft: a greeting',{execute:true}))).status,'handoff');
  assert.equal((await runAgent(input('calculate: 12 + 3',{mode:'preview',execute:true}))).status,'preview');
  for (const text of ['calculate: 1 / 0','calculate: process.exit()','checklist: '+Array(21).fill('x').join(';'),'delete all files']) assert.equal((await runAgent(input(text,{execute:true}))).status,'human_review');
  for (const bad of [input(''),input('a',{threshold:NaN}),input('a',{mode:'wrong'}),input('a',{execute:'yes'}),{...input('a'),tool:'shell'},input('x'.repeat(4001))]) await assert.rejects(runAgent(bad));
});

test('live gate validates typed decisions and policy before local execution', async () => {
  let reserved=0,settled=0,calls=0,current=reply();
  const budget={reserve:async()=>++reserved,settle:async(id,tokens)=>{assert.equal(id,reserved);assert.equal(tokens,100);settled++;}};
  const options={apiKey:'dummy',budget,fetchImpl:async(url,init)=>{
    calls++; assert.equal(url,'https://api.typesafe.ai/v1/systemone'); assert.equal(init.redirect,'error');
    assert.ok(init.signal instanceof AbortSignal);assert.equal(init.signal.aborted,false);
    const body=JSON.parse(init.body); assert.equal(body.model,'jev-1.13.0'); assert.deepEqual(body.questions,agentQuestions);
    assert.equal(reserved,calls); return {ok:true,json:async()=>current};
  }};
  const live=input('calculate: 12 + 3',{mode:'live',execute:true});
  assert.equal((await runAgent(live,options)).execution.output,15);
  current=reply('tool',.79); assert.equal((await runAgent(live,options)).decision.reason,'below_threshold');
  current=reply('tool',.8); assert.equal((await runAgent(live,options)).status,'completed');
  current=reply('tool',1,.5); assert.equal((await runAgent(live,options)).decision.reason,'approval_needed');
  current=reply('tool',1); assert.equal((await runAgent({...live,text:'run shell command'},options)).decision.reason,'unsupported_operation');
  current=reply('llm'); assert.equal((await runAgent(live,options)).status,'handoff');
  for (const [confidence,approval,reason] of [[.79,0,'below_threshold'],[1,.5,'approval_needed']]) {
    current=reply('llm',confidence,approval);
    const stopped=await runAgent({...live,nim:true},{...options,nimKey:'dummy-nim'});
    assert.equal(stopped.decision.reason,reason);assert.equal(stopped.execution.performed,false);
  }
  const before=settled; current=reply();current.answers.route.choice='shell';
  await assert.rejects(runAgent(live,options)); assert.equal(settled,before);
  const count=calls; await assert.rejects(runAgent(live,{...options,budget:{reserve:async()=>{throw Error('exhausted');}}})); assert.equal(calls,count);
  await assert.rejects(runAgent(live,{...options,budget:undefined}));
  await assert.rejects(runAgent(live,{...options,fetchImpl:async()=>{throw Error('dummy-secret');}}), /Provider request failed/);
});

test('agent failure remains reserved across a durable ledger reopen', async t => {
  const dir=await mkdtemp(join(tmpdir(),'jev-agent-budget-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const path=join(dir,'spend.jsonl');
  const budget=await openBudget(path,'0.005505024');
  try {
    const live=input('calculate: 1 + 2',{mode:'live',execute:true});
    const done=await runAgent(live,{apiKey:'test-only',budget,fetchImpl:async()=>({ok:true,json:async()=>reply()})});
    assert.equal(done.execution.output,3);assert.equal(budget.snapshot().observed_nanodollars,4200);
    await assert.rejects(runAgent(live,{apiKey:'test-only',budget,fetchImpl:async()=>{throw Error('secret');}}));
    assert.equal(budget.snapshot().held_nanodollars,2752512);
    assert.ok(!(await readFile(path,'utf8')).includes('test-only'));
  } finally {await budget.close();}
  const reopened=await openBudget(path,'0.005505024');
  try {
    assert.equal(reopened.snapshot().accounted_nanodollars,2756712);
    await assert.rejects(runAgent(input('calculate: 1 + 2',{mode:'live'}),{apiKey:'test-only',budget:reopened,fetchImpl:()=>assert.fail('No dispatch after exhausted reservation')}),/Budget exhausted/);
  } finally {await reopened.close();}
});
