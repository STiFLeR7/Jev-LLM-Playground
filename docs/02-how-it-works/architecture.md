# Current architecture

The project uses Node built-ins and native browser assets. No SDK package, database, queue, or monorepo is required.

```text
CLI ─────────────────┐
Browser → server.mjs ├→ playground.mjs → TypeSafe HTTP API
                     │       └→ validateResponse → route
                     └→ evaluation.mjs → diagnostic metrics / replay
```

`playground.mjs` defines questions, builds requests, validates and normalizes responses, applies routing, and dispatches commands. `evaluation.mjs` loads experiment configurations, records provenance, and computes metrics. It reuses the current policy for replay; it is not yet independent across task versions.

The separate `benchmark.mjs` CLI reuses those request/validation/routing functions and classification metrics for the frozen v2 dataset, repeated passes, checkpointed observations, and offline evidence replay. `budget.mjs` reserves the maximum request cost in a synchronized local journal before dispatch and settles reported usage afterward. One shared ledger/lock covers benchmark and agent CLI runs, not browser or legacy support CLI spending. See the [benchmark protocol](../03-evaluation/benchmark-v2.md).

`server.mjs` binds to loopback, serves an explicit asset allowlist, validates JSON input, and limits live requests to one at a time. The key is loaded in the Node process, never embedded in the browser scripts. The browser renders external values using text content.

Successful live responses include shared question definitions and a versioned application trace derived from the same validated response and routing function as the decision. Preview renders pending model/policy stages and makes no provider call. This trace explains observable application processing; it does not expose or infer model reasoning.

`evidence.mjs` adapts the existing legacy and benchmark replay functions for the browser. `GET /api/evidence/legacy`, `/api/evidence/v2`, and `/api/evidence/v3` read only three curated reports; an optional validated `threshold` query recalculates policy with the shared routing function. No client filesystem paths are accepted. The historical `/api/reports/support-routing-2026-09-21` endpoint remains compatible.

The explorer loads on demand and filters its projected attempts locally. A threshold change rereads the saved report through the local server, not the provider; source validation occurs at the original recorded threshold before recalculation. Stored predictions, reports, and the live ticket form remain unchanged. Agreed-reference metrics are separate from all-author-reference metrics. Loading and errors hide stale evidence; disabled controls regain keyboard focus after recalculation.

Live calls have a 30-second default timeout, reject redirects, and make one attempt. Provider failures do not become a default department. Error bodies are not forwarded. Normalized successful output is not a universal sensitive-data sanitizer.

Fixtures and reports are separate from runtime actions. Historical reports remain immutable. New hashes identify the files/settings used, not their authenticity.

`agent.mjs` is the second recipe: a bounded harness builds route/approval/complexity questions and reuses `validateResponse(data, schema)`. After policy checks and explicit consent, it may invoke one pure local calculator, word-count or checklist function. LLM handoffs terminate without a connected provider. `POST /api/agent` exposes preview/baseline only; no browser agent request can reach TypeSafe. Its live CLI requires an existing shared budget ledger and a new exclusive output file before dispatch. Existing-only ledger opening cannot recreate missing accounting history.

`agent-eval.mjs` evaluates 20 versioned synthetic syntax-conformance cases offline. It reports source hashes and author-label comparisons, not model quality. See the [agent-gating recipe](../04-recipes/agent-gating.md).

The strategic plan's larger directory structure is deferred. The two recipes share validation without introducing a general framework or package migration.

[Security boundaries](../../SECURITY.md) · [Decision Bench](../../doc/decision-bench.md) · [Browser verification](../verification/2026-09-21-education-experience.md)
