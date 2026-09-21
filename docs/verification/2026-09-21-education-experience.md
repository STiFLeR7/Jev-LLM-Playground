# Education and evidence experience verification

Status: trace and recorded explorer implemented and verified locally. This records pre-release checks; subsequent publication is described in the [release notes](../releases/v0.1.0.md). No new live evaluation was performed.

Final independent review approved spec compliance and local readiness after the null-model correction and publication-status clarification. The final controller suite passed 20/20, diff formatting passed, and the historical report hash remained unchanged. The temporary keyless server and isolated verification browser were stopped after checks.

## Baseline and safety

- Baseline commit: `80e99b7`; `npm test` passed 14 tests before changes.
- Browser server started with `node server.mjs`, without loading `.env`; UI confirmed preview-only, no key.
- Playwright CLI uses an isolated `jev-milestone` browser session, not the owner's Chrome profiles.
- No real live evaluation is authorized. Live-shaped browser checks must intercept responses and use synthetic data.

## Test-first browser evidence

Before UI implementation, browser assertions produced:

```text
RED: application decision trace is missing after preview
RED: recorded experiment loader is missing
```

The first check submitted the actual keyless preview form then searched for the trace heading. The second searched for the recorded-experiment load button. Both features were absent as expected.

Initial console output contained only the existing `/favicon.ico` 404. Final verification must distinguish browser errors from application behavior.

## Trace browser verification

Playwright CLI `run-code --filename output/playwright/trace-check.js` completed successfully against the local server. Verified: five stages; pending preview; shared question definitions; submitted text rendered literally (HTML injection string creates no image); stale clearing; synthetic threshold-equality, low-confidence and other-category responses; disabled pending controls; sanitized failure clears trace and restores controls; keyboard Tab reaches sample button; no page overflow at 390 × 844; zero external browser requests.

Live-shaped responses were intercepted synthetic fixtures, not Jev observations. The script blocked nonlocal browser requests. Real preview requests went only to the local server. The deliberate 502 test appears in browser console as an expected failed resource; it is not an unexpected application error.

Captured and visually inspected [desktop preview](../images/trace-preview-desktop.png) at 1440 × 1100 and [mobile preview](../images/trace-preview-mobile.png) at 390 × 844. Both show synthetic input and an explicit no-model-observation preview label. These are full-page captures, so image height exceeds viewport height.

Original historical report SHA256: `2c58e7b234b6a97544f69ec001ea7d6817041e3cc028ce52f04e926b5d876a05`.

## Recorded explorer browser verification

Playwright `output/playwright/explorer-check.js` completed successfully. The real fixed endpoint loaded 16 rows and showed requested/resolved model and legacy-provenance labels. Local filters produced 4 review rows, 0 misclassifications, 0 errors, and 16 all rows without another fetch. Preview and recorded panels remained independent.

Synthetic intercepted fixtures verified loading, a 503 failure and retry, null metrics, failed rows, empty filters, a summary mismatch, and generic unavailable behavior. These fixtures were labeled simulated evidence. No ticket text was joined into the legacy report and zero external requests occurred. The initial `/favicon.ico` 404 is existing behavior; deliberate 502/503 responses were test cases, not application crashes.

Captured and visually inspected [desktop recorded explorer](../images/recorded-explorer-desktop.png) at 1440 × 1100 and [mobile recorded explorer](../images/recorded-explorer-mobile.png) at 390 × 844.

## Keyboard and responsive checks

Headless Chrome 153.0.8010.48 on Windows was used at 1440 × 1100 and 390 × 844. Tab navigation reached the ticket field, Outage/Sales/Other samples, threshold, live checkbox, submit button, recorded loader, and table scroll region. Enter toggled the Inspect JSON disclosure. ArrowRight adjusted the threshold, cleared stale trace output, and scrolled the focused table region when applicable. Pending controls were disabled, focus remained visible, and the 390px page had no horizontal overflow.

These keyboard and responsive checks do not establish full WCAG conformance. No screen-reader test was performed.

## Final local command evidence

Final review found and corrected an all-failed-report metadata edge case: the requested alias must not stand in for an unobserved resolved model. The regression test failed with `jev-latest` instead of null before the fix, then passed. A browser null-metadata fixture first rendered an empty label; after the fix it renders `Not available`, while requested model remains separately labeled. Focused evaluation tests (7/7) and the full suite (20/20) passed after this correction. No provider request was used.

| Check | Result |
| --- | --- |
| `npm test` | 20/20 passed |
| `npm run demo` | Preview completed; 0 API calls |
| `npm run eval -- --config data/support-routing-v1.json` | 16 cases; keyword baseline 12/16 (75%); 0 API calls |
| `node playground.mjs replay --report doc/results/jev-test-2026-09-21.json` | 16 cases; `summary_matches_recorded: true` |
| Historical report SHA-256 | Unchanged: `2c58e7b234b6a97544f69ec001ea7d6817041e3cc028ce52f04e926b5d876a05` |
| Markdown local links | 0 broken after documentation edits |
| Publishable-file exact-key precaution | 55 files scanned; configured keys checked; no findings; `.env` untracked |
| `git diff --check` | Passed; line-ending warnings only |

The exact-key scan is a targeted precaution, not an exhaustive security audit. The final controller rerun also found zero broken local links, passed 20/20 tests, and passed `git diff --check`. Hosted CI passed for published commit [`80e99b7`](https://github.com/STiFLeR7/Jev-LLM-Playground/actions/runs/35565321063); it predates milestone 2. Check the release commit's workflow run for hosted verification of the released version.
