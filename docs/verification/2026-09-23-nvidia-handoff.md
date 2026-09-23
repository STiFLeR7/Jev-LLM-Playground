# NVIDIA handoff verification — 2026-09-23

Implemented locally; no commit, push, tag or release performed for this change.

## Scope

One opt-in NVIDIA Nemotron 3 Super text call after the existing application
policy selects LLM. CLI supports baseline or budgeted live Jev routing.
Browser uses offline routing only, with separate NVIDIA consent. Preview,
local tools, review outcomes and missing consent do not dispatch NVIDIA.
Credentials remain server-side. Generated content is displayed as literal text.
Installed Impeccable 4.0.3 guided reuse of existing controls and consent copy.

## Checks

- TDD: new handoff and same-origin tests failed before implementation.
- 51 Node tests pass, including Jev review gates, consent, response validation,
  missing key, sanitization, single-attempt errors and real local HTTP boundary.
- Browser smoke checks cover support/evidence regressions, Agent Lab controls,
  preview, local execution, opt-in payload and literal generated markup.
- UI detector reports one existing page-wide copy-cadence warning; no new
  visual framework, dependencies or layout changes.
- Browser favicon 404 is unrelated to the workflow.

## Live evidence

Original Llama 3.3 was absent from the live catalog. Listed Nemotron 70B
returned HTTP 404. After user approval to select a current Nemotron, the
integration was pinned to `nvidia/nemotron-3-super-120b-a12b`. Three unsuccessful
inference attempts preceded two successful Super runs. No automatic retry or
runtime model fallback exists.

Ignored local reports:

- `results/nvidia-super-handoff-2026-09-23.json`: baseline route, one NVIDIA
  response, 63 prompt / 20 completion tokens, 643 ms.
- `results/jev-nemotron-e2e-2026-09-23.json`: live Jev selected LLM with 0.99
  route confidence and 0.03 approval-needed probability; policy allowed the
  explicitly consented handoff. NVIDIA used 61 prompt / 58 completion tokens,
  757 ms. Both providers returned validated responses.

The one Jev request used 538 billed input tokens. Cumulative recorded Jev spend
increased from USD 0.006419700 to USD 0.006442296, below USD 0.05, with no held
reservations. NVIDIA billing was not independently measured; reports retain
`cost_usd: null`. The selected hosted endpoint advertises free prototyping.
Do not interpret successful smoke runs as benchmark quality or reliability.
