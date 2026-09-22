# Agent Harness Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Owner authorized continuous execution on main; do not pause for routine choices or create a separate worktree. Do not commit or publish.

**Goal:** Deliver a bounded, inspectable agent-routing recipe with local execution, offline evaluation and a budgeted Jev CLI path.

**Architecture:** Reuse the existing typed-response validator and durable budget. One recipe module owns request construction, routing policy and pure local executors; the existing server/browser expose its offline modes. No autonomous loop or second provider.

**Tech Stack:** Node.js >=22.9.0, native ES modules, node:test, native HTTP/DOM/CSS; zero runtime dependencies.

**Spec:** [Agent harness contract](../specs/2026-09-22-agent-harness-design.md)

## Global constraints

- Work on main, preserve existing uncommitted changes and historical evidence.
- Cumulative API authorization is USD 0.05; implementation/tests use no paid calls.
- No runtime dependencies, arbitrary tools, external execution, hidden retries or fabricated LLM output.
- Browser Agent Lab is offline only. Live CLI requires existing shared ledger, explicit budget and exclusive output.
- Invalid state fails closed. Credentials remain server-side and out of artifacts.
- Keep support-routing outputs backward compatible.

## Task 1 — Recipe, policy and pure execution

Files: modify `playground.mjs`; create `agent.mjs`, `test/agent.test.mjs`.

Interfaces: `validateResponse(data, schema=questions)`; `agentQuestions`; `agentRequest(text)`; `baselineRoute(text)`; `runAgent(input,{apiKey,budget,fetchImpl})` returning the spec result. The live branch consumes a durable budget with snapshot/reserve/settle and native fetch-compatible transport. CLI lives in agent.mjs behind the same import-meta main guard as existing commands.

- [x] Write failing schema and policy tests before implementation. Representative cases:

```js
assert.equal((await runAgent({text:'calculate: 12 + 3',mode:'baseline',threshold:.8,execute:false})).status,'suggested');
assert.equal((await runAgent({text:'calculate: 12 + 3',mode:'baseline',threshold:.8,execute:true})).execution.output,15);
assert.equal((await runAgent({text:'draft: a greeting',mode:'baseline',threshold:.8,execute:true})).status,'handoff');
await assert.rejects(runAgent({text:'',mode:'preview',threshold:.8,execute:false}));
```

- [x] Run `node --test test/agent.test.mjs`; confirm missing implementation failure.
- [x] Parameterize only the existing validator's schema iteration. Preserve every existing default and validation rule.
- [x] Implement strict input validation, three question definitions, exact utility parser and fixed-function dispatch. Never use eval/Function or interpolate commands. Revalidate observations before policy. Apply policy precedence from spec §5.
- [x] Add preview, baseline and one-attempt live path. Reserve before fetch; settle only valid usage; retain failed reservation. Return only normalized observation fields and structured application trace.
- [x] Run focused tests then `npm test`; record results below.

## Task 2 — CLI and offline evaluation

Files: extend `agent.mjs`; create `data/agent-gating-v1.json`, `agent-eval.mjs`; extend `test/agent.test.mjs`.

Interfaces: CLI options exactly spec §9; evaluator consumes versioned rows `{id,text,expected}` and prints `{dataset_sha256,policy_version,mode,metrics,rows}`. Routes are four exact schema labels. Ratio with zero denominator is null.

- [x] Write failing CLI tests using `execFileSync(process.execPath,...)`: default preview has api_calls 0; baseline execute yields 15; unknown/live+baseline flags fail; existing output never triggers provider.
- [x] Create at least 16 frozen synthetic cases and validate unique IDs, nonblank bounded text and allowed expected labels.
- [x] Implement offline evaluation using baselineRoute and runAgent with execute false. Compute literal observed counts rather than inferring successful live metrics.
- [x] Implement explicit CLI output creation using `open(path,'wx')`; reserve/dispatch only after successful exclusive output claim. Require preexisting `results/benchmark-spend.jsonl`; reuse openBudget without changing ledger limit.
- [x] Run `node agent.mjs --text 'calculate: 12 + 3'`, `node agent.mjs --baseline --execute --text 'calculate: 12 + 3'`, `node agent-eval.mjs` and full tests. No `--live` command against real credentials.

## Task 3 — Local endpoint and Agent Lab

Files: modify `server.mjs`, `web/index.html`, `web/app.js`, `web/style.css`, `test/server.test.mjs`, `scripts/browser-smoke.js`.

Interfaces: POST `/api/agent` JSON input as spec; only preview/baseline accepted, live rejected before transport. Existing Host/Origin, content-type and body-size guards apply. Return normalized recipe result or sanitized error.

- [x] Write failing endpoint assertions: preview and baseline work without key; live is rejected; cross-origin rejected; malformed body rejected; unsupported operations never execute.
- [x] Add endpoint using existing JSON body parsing, preserving /api/key and /api/triage behavior.
- [x] Add Agent Lab view and hash navigation using current workspace pattern. Reuse CSS panels and controls. Consent is off initially. Clear stale results on edits, disable controls while pending, render with textContent, return to operable state after errors.
- [x] Browser smoke: sample arithmetic without consent -> suggested; with consent ->15; draft -> no-call handoff; preview -> no execution; switch workspaces; mobile width390; keyboard controls; injection text displays literally.
- [x] Run all previous smoke assertions too. Inspect desktop/mobile together; fix only identified defects.

## Task 4 — Verification, documentation and goal handoff

Files: README.md, docs/04-recipes/agent-gating.md, docs/02-how-it-works/architecture.md, doc/roadmap.md, docs/verification/2026-09-22-agent-harness.md; update design artifacts only to record actual new navigation/components.

- [x] Document exact syntax, policy, consent, shared-budget requirement and simulated LLM boundary. Link official schema references. No cost/latency improvement claims without measurements.
- [x] Run `npm test`, `node --check agent.mjs`, `node --check agent-eval.mjs`, `node --check web/app.js`, offline CLI/evaluator and browser smoke.
- [x] Inspect cumulative ledger read-only; no mutation from offline checks. Check configured secrets against changed/untracked nonignored files without printing keys. Compare existing tracked data/reports with HEAD; only the new agent dataset may differ.
- [x] Record test counts and browser limitations. Update roadmap local status; leave publication unchecked.
- [x] Mark goal complete only when all requirements and checks pass. No commit/push/tag/release.

## Progress and decisions

- 2026-09-22: Spec and plan written before implementation. Owner authorized uninterrupted implementation; inline execution selected to preserve the shared dirty worktree.
- Graphify is unavailable and no graph exists; direct source inspection used without installing unrelated tooling.
- Actual reasoning-provider integration is deferred explicitly; handoff is not a real LLM response.
- Existing support UI Live is not part of the benchmark ledger. New Agent Lab cannot call live; new CLI must use existing cumulative ledger.

## Self-review

Spec sections1–7 map to Task1;8–10 to Tasks2–3;11 to Task4. The result contract, four route labels and runAgent signature are shared across tasks. No general SDK, package migration or tool registry is needed.

- Completion: 49 tests pass; offline CLI/evaluator and browser smoke pass; source and visual reviews cleared. No paid requests or publication. See docs/verification/2026-09-22-agent-harness.md.
