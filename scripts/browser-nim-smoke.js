async page => {
  const check=(value,message)=>{if(!value)throw Error(message);};
  await page.goto('http://127.0.0.1:3000/#agent');
  await page.getByLabel('Decision source').selectOption('baseline');
  await page.getByLabel('Allow one operation').check();
  const run=page.getByRole('button',{name:'Run harness'});
  await page.getByLabel('Task', { exact: true }).fill('draft: a greeting');
  await page.getByLabel('Enable NVIDIA text handoff').check();
  await page.route('**/api/agent', async route => {
    const sent=route.request().postDataJSON();
    check(sent.nim===true && sent.execute===true,'NVIDIA consent was not submitted');
    await route.fulfill({json:{mode:'baseline',api_calls:1,status:'completed',decision:{route:'llm',reason:'baseline_rule'},execution:{performed:true,output:'<img src=x onerror=alert(1)>'},llm:{provider:'nvidia'},trace:[]}});
  });
  await run.click();
  await page.getByRole('heading', { name: 'NVIDIA text response received' }).waitFor();
  check(await page.locator('#agent-output').textContent()==='<img src=x onerror=alert(1)>','Generated text not rendered literally');
  check(await page.locator('#agent-output img').count()===0,'Generated markup executed');
  check((await page.locator('#agent-status').textContent()).includes('1 provider calls'),'Provider call count missing');
  await page.unroute('**/api/agent');
  await page.getByLabel('Enable NVIDIA text handoff').uncheck();
  return 'NVIDIA consent and literal output checks passed.';
}
