import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { runAgent, agentPolicyVersion, agentRequest } from './agent.mjs';

async function main() {
  const {values}=parseArgs({options:{out:{type:'string'}}});
  const bytes=await readFile(new URL('./data/agent-gating-v1.json',import.meta.url));
  const dataset=JSON.parse(bytes);
  if(dataset.schema_version!==1||dataset.id!=='agent-gating-v1'||!Array.isArray(dataset.cases)||!dataset.cases.length)throw Error('Invalid dataset.');
  const ids=new Set(),rows=[];
  for(const item of dataset.cases) {
    if(typeof item.id!=='string'||!item.id||ids.has(item.id)||!['tool','workflow','llm','human_review'].includes(item.expected))throw Error('Invalid dataset case.');
    ids.add(item.id);agentRequest(item.text);
    const result=await runAgent({text:item.text,mode:'baseline',threshold:.8,execute:false});
    rows.push({id:item.id,expected:item.expected,predicted:result.decision.route,status:result.status});
  }
  const count=rows.length,correct=rows.filter(row=>row.expected===row.predicted).length;
  const report={schema_version:1,dataset:dataset.id,dataset_sha256:createHash('sha256').update(bytes).digest('hex'),reference_basis:dataset.reference_basis,policy_version:agentPolicyVersion,mode:'baseline',api_calls:0,
    metrics:{cases:count,correct,accuracy:correct/count,human_review_rate:rows.filter(r=>r.predicted==='human_review').length/count,handoff_rate:rows.filter(r=>r.predicted==='llm').length/count,false_local_routes:rows.filter(r=>['tool','workflow'].includes(r.predicted)&&r.predicted!==r.expected).length,live_accuracy:null,provider_latency_ms:null,provider_cost_usd:null},rows};
  const json=JSON.stringify(report,null,2)+'\n';
  if(values.out)await writeFile(values.out,json,{flag:'wx',mode:0o600});
  console.log(json);
}
main().catch(()=>{console.error('Agent evaluation failed. Check the dataset and use a new output path.');process.exitCode=1;});
