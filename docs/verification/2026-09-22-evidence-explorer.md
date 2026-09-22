# Offline evidence explorer — v0.4.0 development

Implemented locally on main, not tagged or published. The released version remains v0.3.0 until a separate release is authorized. No paid API calls were made for this development work.

## Try it

Run `npm start`, open http://127.0.0.1:3000, and select **Evidence** in the workspace navigation. No key is required for this section; leave the independent live checkbox off.

1. Select Challenge benchmark and load it: 48 unique tickets, 144 observed/planned attempts, three passes.
2. Choose Label mismatches: 20 attempts across author references. Six disputed tickets account for 15 of these; do not call those established model failures.
3. Agreed-reference metrics report 121/126 matching attempts over 42 unique tickets.
4. Choose Disputed references: 18 attempts, six unique tickets. Expand Read saved input to inspect the retained text.
5. Set Explore routing threshold to 0.50: 99 routes, 45 reviews, nine wrong routes versus author labels; three wrong routes versus agreed labels. Predictions do not change.
6. Restore recorded threshold (0.80): 75 routes, 69 reviews, zero observed wrong routes. The original saved report is untouched.
7. Select another experiment. Old results disappear until loaded, filters reset, and the recorded threshold is restored. Legacy has 16 retained attempts and incomplete provenance; v2 has 144 attempts over 48 tickets. Scores are not a cross-dataset leaderboard.

Table filters do not change aggregate denominators. API errors are not classified as other. Repeated attempts are correlated. AI-agreed references are not human-adjudicated truth. Neither an explored threshold nor zero observed routing errors demonstrates production safety.

## Verification performed

- Test-first endpoint check failed with 404 before implementation, then passed for all three allowlisted reports.
- `npm test`: 40 passing tests, including shared validation/replay, file immutability, threshold recalculation, reference denominators, endpoint access controls, malformed-report sanitization, and unknown-field stripping.
- Actual browser checks: all experiment selections, filters, 0.50/0.80 recalculation, reset, ticket-form isolation, empty results, injected 503 and retry, and stale-result hiding.
- Keyboard regression: two consecutive left-arrow adjustments now move 0.80 to 0.78. Disabling the slider during a request originally lost focus; focus now returns after recalculation without taking focus from another user-selected element.
- Desktop 1280x900 and mobile 375x812 inspected; mobile document has no horizontal overflow. Wide evidence tables remain keyboard-focusable horizontal scrolling regions.
- Impeccable mechanical UI detector returned no findings. The subsequent [Decision Studio redesign](2026-09-22-decision-studio.md) preserves native controls and evidence behavior.
- Independent read-only source review found no Critical/Important issues. Its wording finding was corrected: the saved-summary integrity notice explicitly refers to replay at the original recorded threshold.

Browser checks used a local server with an empty API key and a provider callback that throws if called. The negative test intentionally generated a 503 console entry; favicon 404 is unrelated. Scratch screenshots are under ignored `output/playwright/`; they are not release assets.

## Repeat the checks

```sh
npm test
node --check web/app.js
node benchmark.mjs --replay doc/results/benchmark-v3-live-2026-09-21.json
```

For the keyboard regression, open the app with Playwright CLI, load the challenge report, then run:

```js
async page => {
  const slider = page.getByLabel('Explore routing threshold');
  await page.getByRole('button', { name: 'Restore recorded threshold' }).click();
  await page.getByText('Saved answers replayed locally.', { exact: false }).waitFor();
  await slider.focus();
  for (let i = 0; i < 2; i++) {
    await page.keyboard.press('ArrowLeft');
    await page.getByText('Saved answers replayed locally.', { exact: false }).waitFor();
  }
  if (await slider.inputValue() !== '0.78') throw Error('Keyboard focus regression');
}
```

Limitations: checked in Chromium, not every browser or a screen reader. This is a local read-only explorer, not an arbitrary report uploader or hosted dashboard. The next recipe and independent human labeling remain separate roadmap work.
