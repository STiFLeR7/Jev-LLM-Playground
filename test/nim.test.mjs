import test from 'node:test';
import assert from 'node:assert/strict';
import { runAgent } from '../agent.mjs';
import { createPlaygroundServer } from '../server.mjs';

const input = {text:'draft: a greeting',mode:'baseline',threshold:.8,execute:true,nim:true};
const answer = {model:'nvidia/nemotron-3-super-120b-a12b',choices:[{message:{role:'assistant',content:'Hello!'},finish_reason:'stop'}],usage:{prompt_tokens:20,completion_tokens:3,total_tokens:23}};
test('NIM handoff requires opt-in and consent, validates text, and never retries', async () => {
  let calls=0;
  const options={nimKey:'test-secret',fetchImpl:async(url,init)=>{
    calls++; assert.equal(url,'https://integrate.api.nvidia.com/v1/chat/completions');
    assert.equal(init.redirect,'error');assert.ok(init.signal instanceof AbortSignal);
    const body=JSON.parse(init.body);assert.equal(body.max_tokens,512);assert.equal(body.stream,false);
    assert.equal(body.chat_template_kwargs.enable_thinking,false);
    assert.equal(body.messages.at(-1).content,input.text);assert.equal(body.tools,undefined);
    return {ok:true,status:200,json:async()=>answer};
  }};
  const result=await runAgent(input,options);
  assert.equal(result.execution.output,'Hello!');assert.equal(result.api_calls,1);
  assert.equal(result.llm.usage.total_tokens,23);assert.equal(result.status,'completed');
  for(const extra of [{nim:false},{execute:false},{mode:'preview'},{text:'delete files'},{text:'calculate: 1 + 2'}]) await runAgent({...input,...extra},options);
  assert.equal(calls,1);
  for(const response of [{...answer,choices:[]},{...answer,choices:[{message:{content:'x',tool_calls:[{}]},finish_reason:'tool_calls'}]},{...answer,usage:{total_tokens:-1}}]) {
    await assert.rejects(runAgent(input,{...options,fetchImpl:async()=>({ok:true,status:200,json:async()=>response})}),/NVIDIA/);
  }
  let failures=0;
  await assert.rejects(runAgent(input,{...options,fetchImpl:async()=>{failures++;throw Error('test-secret');}}),/NVIDIA request failed/);
  assert.equal(failures,1);
  await assert.rejects(runAgent(input,{nimKey:''}),/NVIDIA/);
});

test('browser NIM execution requires same origin and keeps credentials server-side', async t=>{
  const server=createPlaygroundServer({nimKey:'private-nim-key',fetchImpl:async()=>({ok:true,status:200,json:async()=>answer})});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
  const base=`http://127.0.0.1:${server.address().port}`;
  const post=origin=>fetch(base+'/api/agent',{method:'POST',headers:{'Content-Type':'application/json',...(origin?{Origin:origin}:{})},body:JSON.stringify(input)});
  assert.equal((await post()).status,403);
  const response=await post(base);assert.equal(response.status,200);
  const body=await response.text();assert.ok(!body.includes('private-nim-key'));assert.equal(JSON.parse(body).execution.output,'Hello!');
});
