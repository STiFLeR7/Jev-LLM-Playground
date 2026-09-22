# Agent harness verification — 2026-09-22

Implemented locally on main under the owner's continuous-execution authorization. No commit, push, tag or release was performed. The published release remains v0.3.0. This record covers the bounded agent-gating milestone, not a connected autonomous LLM system.

## Delivered

- Detailed [architecture specification](../superpowers/specs/2026-09-22-agent-harness-design.md) and [execution plan](../superpowers/plans/2026-09-22-agent-harness.md) written before implementation.
- Jev route/approval/complexity request schema; shared typed-response normalization; policy precedence and explicit local execution consent.
- Pure two-operand calculator, whitespace word counter and checklist transformation. No arbitrary code, subprocess, filesystem, network or external action executor.
- Agent Lab preview/baseline UI with source labels, application trace and explicit unconnected LLM handoff. Live agent calls are CLI-only.
- CLI preview/baseline and optional live mode using the existing cumulative ledger, one reservation per call, no retries and exclusive report files.
- Twenty-case synthetic baseline syntax-conformance dataset/evaluator. All 20 match author references; this is not held-out semantic evaluation or a Jev accuracy result.

## Checks performed

- `npm test`: **49 passing tests**, zero failures.
- `node --check agent.mjs`, `node --check agent-eval.mjs`, `node --check web/app.js`: passed.
- Preview and baseline calculator CLI commands passed; explicit consent returns 15 for `calculate: 12 + 3`.
- `node agent-eval.mjs`: 20/20 baseline reference matches, 0 false local routes, human-review rate 0.55, handoff rate 0.15. Live accuracy, provider latency and provider cost are null. Dataset hash: `ee352ecbf5a5633f6fe00ea03d23cd02087bb2f4cc0f462c1326e43f46fb2936`.
- Test-first failures observed for missing recipe, CLI, evaluator, HTTP endpoint and existing-only ledger behavior, then passing after implementation.
- Mock live transport verified request shape, pinned model, redirect rejection, timeout signal, normalized response validation, confidence/approval boundaries and unsupported-operation review. No real provider request was sent.
- Real temporary-ledger integration verified settled usage, retained failure reservation after reopening, exhaustion before dispatch and missing-ledger refusal. These test ledgers do not touch the shared spending journal.
- Browser smoke passed support preview, all three saved reports, disputed filters, keyboard threshold controls, skip link, state retention, Agent Lab preview, consent-off suggestion, consent-on execution, LLM handoff and literal script-looking input. Mobile 390x844 had no document overflow; desktop 1440x1000 inspected.
- Independent source review found no Critical/Important issues. Both minor findings were fixed: timeout assertion and atomic existing-only ledger opening; scoped re-review cleared them.
- Impeccable visual review cleared all three findings after updates: four-workspace documentation, workspace-aware breadcrumb, and clean mobile recapture without stale skip-link focus.
- Configured-key scan across tracked/nonignored files passed without printing keys. Previously tracked datasets and reports remain byte-identical to HEAD.
- Cumulative shared ledger inspected read-only: USD **0.0064197** observed, **0** unsettled reservations, USD **0.05** limit. No new API spend in this milestone.

## Repeat

```sh
npm test
node agent.mjs --text "calculate: 12 + 3"
node agent.mjs --baseline --execute --text "calculate: 12 + 3"
node agent-eval.mjs
node server.mjs
```

Open http://127.0.0.1:3000/#agent. `scripts/browser-smoke.js` is a Playwright CLI run-code expression; use the PowerShell invocation in the [Decision Studio verification](2026-09-22-decision-studio.md). It never enables live mode.

Screenshots in ignored `output/playwright/agent-final-desktop.png` and `agent-final-mobile.png` are local verification artifacts, not published assets. Chromium was checked; no cross-browser or screen-reader certification is claimed.

## Deliberate limits

No actual agent live benchmark or reasoning-model integration was performed. The baseline's matching labels are syntax-conformance checks, not independent semantic evidence. General-purpose LLM handoff stops without generation; human review sends no notification. Existing support Live calls are outside the shared benchmark/agent ledger. These boundaries are visible in the UI and recipe documentation.
