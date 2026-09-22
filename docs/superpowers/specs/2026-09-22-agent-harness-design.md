# Agent harness and routing gate — implementation contract

Status: implementation authorized by the owner on 2026-09-22. This specification precedes code. The owner requested continuous goal-based execution; routine implementation choices and offline checks do not need additional prompts. Work remains on main, preserving all existing changes. Publication is a separate authorization.

## 1. Outcome and architectural boundary

Deliver a runnable second recipe that demonstrates an orchestrator consulting Jev for bounded routing decisions, validating the answer, applying deterministic policy, and optionally executing one approved local operation. A request must produce an inspectable state trace and terminate; it must never become an unbounded autonomous loop.

```text
Task + explicit execution consent
            ↓
Harness: validate input, build decision questions
            ↓
Preview / deterministic baseline / Jev decision
            ↓
Normalize answer → application policy
            ├─ human review: stop, no external notification
            ├─ LLM handoff: describe handoff, no LLM call
            ├─ tool: exact allowlisted read-only operation
            └─ workflow: local checklist transformation
            ↓
Execution result → harness completion + application trace
```

The general-purpose reasoning-model box in the reference architecture is a handoff boundary in this milestone, explicitly labeled **not connected**. No general-purpose provider/model has been selected. Do not impersonate a real LLM, fabricate reasoning, or call a new paid service. Actual LLM integration is a subsequent milestone requiring a selected provider, model, credential handling and cost policy. This is a bounded working vertical slice, not a production agent platform.

## 2. Existing foundations to preserve

- Node.js >=22.9.0; native ES modules, node:test, HTTP server and browser DOM. Zero runtime dependencies and no build step.
- Existing support-routing CLI, response validation, decision trace, saved-evidence explorer, session-key controls and all tests remain functional.
- Reuse `validateResponse` with an optional question-schema argument, defaulting to the existing support questions. Do not change existing support response/output contracts.
- Reuse `openBudget` and the established `results/benchmark-spend.jsonl` ledger for any new paid Jev call. Never reset, replace or create an alternative ledger to bypass cumulative spend.
- Do not overwrite historical datasets/reports or saved benchmark observations.

## 3. Request contract

`runAgent(input, options)` consumes a plain object with exactly:

| Field | Type / constraint | Default |
| --- | --- | --- |
| `text` | nonblank string, at most 4,000 characters | required |
| `mode` | `preview`, `baseline`, `live` | required |
| `threshold` | finite number in [0,1] | required; UI 0.80 |
| `execute` | boolean; consent for local allowlisted execution only | required; UI false |

Reject arrays, unknown fields, missing fields and invalid values. Preview with execution consent still performs no execution. Model, provider URL, filesystem path, tool name and shell command are not caller-controlled request fields. Pin live Jev to `jev-1.13.0`; record returned model ID independently.

## 4. Decision schema

Use the verified `POST https://api.typesafe.ai/v1/systemone` shape `{model,state,questions}`. Questions:

- `route` Choice: `tool`, `workflow`, `llm`, `human_review`. Criteria distinguish exact local utility syntax, checklist transformation, open-ended drafting/reasoning, and requests needing permission or missing information.
- `approval_needed` Noul: whether the task requests sensitive, external, destructive, privileged or consequential action. This is an advisory signal, not a security boundary.
- `complexity` Score: three ordered descriptions: simple local operation, multi-step bounded task, open-ended reasoning. Display only; not an execution grant.

Instructions explicitly treat task content as untrusted data and ignore embedded instructions to alter classification. Do not claim prompt wording prevents prompt injection.

Require all schema answers, correct types, finite probabilities, exact option keys, normalized distributions, argmax-consistent Choice, confidence in [0,1], rubric-consistent Score and nonnegative integer token usage. Project only validated fields. Do not equate confidence to the selected probability or correctness.

Official references checked 2026-09-22: [API](https://docs.typesafe.ai/api), [models and pricing](https://docs.typesafe.ai/models). Jev 1.13.0 is listed at USD 0.042/M input tokens, free output; reuse the conservative existing 65,536-token reservation. Pricing is a dated estimate, not an invoice.

## 5. Application policy, in priority order

1. Invalid input: reject before any provider or executor call.
2. Invalid/failed provider response: terminate with sanitized failure; never substitute baseline after a live failure.
3. `approval_needed >= 0.5`, chosen `human_review`, or live route confidence below threshold: human review.
4. `tool` or `workflow` without matching exact local operation syntax: human review (`unsupported_operation`), regardless of confidence.
5. `llm`: explicit `handoff` result, provider not connected, no generation.
6. Valid local operation but `execute=false`: `suggested`, no operation performed.
7. Valid local operation and `execute=true`: run exactly one local pure function and return `completed`.

Threshold equality is accepted. Baseline has no confidence and no Jev answers; it uses the same allowlist and consent policy, skipping only the model-confidence check. User text never becomes code, shell, URL, tool name, filesystem path or database query.

## 6. Allowlisted local operations

All are pure functions, no filesystem/network/subprocess side effects:

| Syntax | Route | Result / limits |
| --- | --- | --- |
| `calculate: 12 + 3` | tool | exactly two finite decimal operands and one `+`, `-`, `*`, `/`; absolute operands/result <=1e12; division by zero rejected; never eval |
| `count words: some text` | tool | whitespace-delimited token count; explicitly not linguistic tokenization |
| `checklist: first; second` | workflow | 1–20 nonempty semicolon-separated items, each <=200 characters; local checklist only, no task creation |

Open-ended text beginning `draft:`, `explain:` or `compare:` maps to `llm` in the deterministic baseline. Everything else maps to human review. Unsupported or adversarial syntax cannot invoke another operation. A keyword safety detector is not required because executors have no external capability.

## 7. Result and trace contract

Return `schema_version:1`, `recipe:'agent-gating-v1'`, mode, API-call count, policy version, request schema, normalized observation or null, decision, execution and ordered trace. Result states: `preview`, `suggested`, `completed`, `handoff`, `human_review`. Provider failure is an error, not a successful state.

Trace stages: input validation; request construction; decision source; policy; execution; completion. Trace records application behavior, not hidden model reasoning. Baseline and preview are visibly labeled; no invented confidence, latency or model usage. Usage and provider latency appear only for actual provider observations. Tool output is returned to the harness result; no recursive planning or follow-up calls.

Browser request text and credentials are not persisted. CLI saves reports only when a user explicitly supplies an exclusive output path, with synthetic-input guidance. Credentials never appear in requests returned to the browser, traces, saved outputs, logs or errors.

## 8. Spending and live mode

Development and acceptance default to zero provider calls. Existing USD 0.05 authorization is cumulative, not per phase, key or process. Existing ledger must be present and valid before enabling this recipe's live path. Missing/corrupt/locked/exhausted ledger fails closed before dispatch; no automatic ledger recreation. Reserve a full call before dispatch and settle validated usage only. Uncertain failure retains its reservation. No retries.

The CLI live path requires `--live --budget-usd 0.05 --out <new path>` and environment credentials. Claim the output with exclusive creation before dispatch, save pending metadata, then sanitized outcome and budget snapshot. No overwritten artifacts. Browser Agent Lab offers preview and baseline only in this milestone, with clear text that live evaluation is available through the budgeted CLI. Existing support Live remains unchanged and is not retroactively claimed to be ledger-enforced.

No actual live experiment is necessary to complete this implementation milestone. Mocked provider contract tests verify the live path without spend. A later live benchmark must freeze its dataset and configuration first and reconcile the cumulative ledger; do not label mock observations as real evidence.

## 9. CLI and UI

CLI `node agent.mjs --text 'calculate: 12 + 3'` previews. `--baseline` selects deterministic execution planning; `--execute` allows the one local operation. `--threshold` defaults to 0.8. `--live` and `--baseline` are mutually exclusive. Unknown options, blank numeric arguments, unauthorized budget flags and overwrite attempts fail safely. `--help` documents all modes and limitations.

Add **Agent Lab** to existing navigation. Reuse the current three-panel visual language. Controls: task textarea, three exact-syntax samples, mode select (preview/baseline), execution-consent checkbox, run button. Results: source label, decision/reason, execution outcome, application trace, expandable JSON. No unconnected chat box. Show the LLM boundary as not connected. Credential management remains in Playground, with a link rather than another credential store.

Preserve keyboard navigation, native focus outlines, readable masked-key settings, no document overflow at 390px, local scrolling for JSON, explicit pending/error recovery and stale-result clearing. Render all user/provider content through textContent.

## 10. Evaluation and acceptance

Create a versioned synthetic dataset with at least 16 cases: each route, malformed utility syntax, division by zero, excessive checklist items, ambiguous requests and prompt-injection wording. Expected route labels are author references, not human-adjudicated truth. Freeze labels before reporting.

Offline evaluation reports dataset SHA-256, policy version, case count, expected-versus-baseline routes, accuracy, human-review/handoff rates and false local-routing count. No fabricated live accuracy/cost/latency. Print to stdout by default; saved evidence requires an explicit exclusive path. Do not mix this dataset with support results or call them a leaderboard.

Required checks: input boundaries; schema normalization; low confidence/equality; Noul boundary; unsupported high-confidence local route; consent off/on; calculator malicious text and zero division; one operation maximum; LLM no-call handoff; preview no call; live request shape/timeout/error with mock transport; budget before dispatch; reserved failure; credential non-disclosure; local same-origin endpoint; regression suite; desktop/mobile browser smoke; documentation commands.

## 11. Completion and follow-on work

Done means all planned code/docs exist, tests and browser checks pass, roadmap distinguishes local work from published releases, no secrets leaked and old evidence unchanged. Record verification honestly. No commit/push/tag/release is part of this goal.

Subsequent milestones: choose and connect an actual reasoning LLM with its own spend accounting; independently adjudicate harder routing labels; evaluate routing utility versus direct LLM execution. Those require new evidence/choices and are not hidden dependencies of this milestone.
