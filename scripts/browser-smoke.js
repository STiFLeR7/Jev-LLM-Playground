async page => {
  // Run with Playwright CLI run-code; the app must be served locally with no API key.
  const check = (value, message) => { if (!value) throw Error(message); };
  await page.goto('http://127.0.0.1:3000/');
  const nav = page.getByRole('navigation', { name: 'Workspace' });
  check(await nav.count() === 1, 'Workspace navigation missing');
  await page.getByRole('button', { name: 'Preview request', exact: true }).click();
  await page.getByText('Preview only · 0 API calls', { exact: false }).waitFor();
  check(!await page.locator('#decision').isVisible(), 'Preview fabricated a decision');
  check(await page.locator('#trace').isVisible(), 'Preview trace missing');
  await nav.getByRole('link', { name: 'Evidence', exact: true }).click();
  const load = page.getByRole('button', { name: 'Load recorded experiment' });
  const ready = () => page.getByText('Saved answers replayed locally.', { exact: false }).waitFor();
  for (const [id, count] of [['legacy', 16], ['v2', 144], ['v3', 144]]) {
    await page.getByLabel('Recorded experiment', { exact: true }).selectOption(id);
    await load.click(); await ready();
    check(await page.locator('#recorded-cases tr').count() === count, 'Incorrect attempt count: ' + id);
  }
  await page.getByLabel('Show attempts').selectOption('disputed');
  check(await page.locator('#recorded-results > .provenance-details').count() === 1, 'Provenance must be outside the scrolling table');
  check(await page.locator('#recorded-cases tr').count() === 18, 'Disputed references not separated');
  const slider = page.getByLabel('Explore routing threshold');
  await slider.focus();
  for (let i = 0; i < 2; i++) { await page.keyboard.press('ArrowLeft'); await ready(); }
  check(await slider.inputValue() === '0.78', 'Keyboard focus lost during replay');
  await page.getByRole('button', { name: 'Restore recorded threshold' }).click(); await ready();
  check(await slider.inputValue() === '0.8', 'Recorded policy not restored');
  await nav.getByRole('link', { name: 'Learn', exact: true }).click();
  check(await page.getByRole('heading', { name: 'Decisions, with context.' }).isVisible(), 'Learn is not functional');
  await nav.getByRole('link', { name: 'Playground', exact: true }).click();
  check(await page.locator('#trace').isVisible(), 'Navigation discarded the preview');
  await page.setViewportSize({ width: 390, height: 844 });
  check(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'Mobile overflow');
  await nav.getByRole('link', { name: 'Evidence', exact: true }).click();
  await page.getByRole('link', { name: 'Skip to workspace' }).focus();
  await page.keyboard.press('Enter');
  check(await page.locator('#view-evidence').isVisible(), 'Skip link changed workspace');
  check(await page.evaluate(() => document.activeElement.id === 'main'), 'Skip link did not focus workspace');
  check(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'Evidence mobile overflow');
  await nav.getByRole('link', { name: 'Agent Lab', exact: true }).click();
  const run = page.getByRole('button', { name: 'Run offline harness' });
  await run.click();
  await page.getByRole('heading', { name: 'Request prepared' }).waitFor();
  await page.getByLabel('Decision source').selectOption('baseline');
  await run.click();
  await page.getByRole('heading', { name: 'Local operation suggested' }).waitFor();
  await page.getByLabel('Allow one local operation').check();
  await run.click();
  await page.getByRole('heading', { name: 'Local operation completed' }).waitFor();
  check(await page.locator('#agent-output').textContent() === '15', 'Calculator result incorrect');
  await page.getByRole('button', { name: 'LLM handoff', exact: true }).click();
  await run.click();
  await page.getByRole('heading', { name: 'LLM handoff — not connected' }).waitFor();
  await page.getByLabel('Task', { exact: true }).fill('count words: <script>alert(1)</script>');
  await run.click();
  await page.getByRole('heading', { name: 'Local operation completed' }).waitFor();
  check(await page.locator('#agent-output').textContent() === '1', 'Untrusted text not handled literally');
  check(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'Agent mobile overflow');
  return 'Support/evidence regressions and Agent Lab preview, consent, execution, handoff, literal text and mobile checks passed.';
}
