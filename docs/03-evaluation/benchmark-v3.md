# Challenge benchmark protocol — v3

## Approved scope and freeze rule

The user approved a harder follow-up with the same USD 0.05 cap. Reuse the existing cumulative ledger, preserving the earlier USD 0.003198132 spend: the operational remaining allowance is USD 0.046801868, stricter than a fresh five-cent allowance. No reset, extra funding, automatic retries, new provider, UI change, or release publication.

Use unchanged questions, support-routing-v1 policy, keyword-v1 baseline, pinned jev-1.13.0, threshold 0.8, and three round-robin passes. Stop on first API/validation failure or insufficient budget. This is one planned 144-request experiment, not an adaptive search until a failure appears.

## Data and reference review

[56 synthetic cases](../../data/tickets-v3.json): eight development examples and 48 test cases, twelve each for implicit intent, context-dependent ownership, competing ownership, and underspecified requests. Test labels are not forced to balance: billing/technical/sales have ten each; other has eighteen. This is constructed, not real traffic prevalence. Do not pool v2 and v3 accuracy.

Classify the current main request. Existing payment remedies belong to billing; actual product failures to technical; pre-purchase inquiries to sales; unrelated, insufficient, or equally mixed requests to other. Missing diagnostic detail alone does not erase clear intent. Do not invent background facts needed to decide ownership.

A separate AI reviewer saw [only IDs/text](../../doc/research/benchmark-v3-blind-cases.json) and the rubric, not author labels or Jev observations. [Review record](../../doc/research/benchmark-v3-label-review.json): labels matched on 47/48; six cases had disagreement or reviewer uncertainty. Original author labels remain unchanged. Those six are disputed before any live run; the other 42 are agreed. This is blind AI review, **not independent human adjudication or objective ground truth**. Shared AI bias remains possible.

Report all-case author-label metrics, but separate agreed-reference metrics when discussing observed errors. Disputed cases investigate taxonomy ambiguity; a disagreement there is not automatically a model failure. Freeze cases, reference status, configuration, questions, and source hashes before observing Jev. No post-run edits to these inputs.

## Evaluation questions

1. Which agreed-reference cases are misclassified, and are wrong choices automatically routed?
2. Does fixed confidence gating send incorrect in-scope choices to review?
3. Which reviews come from other versus low confidence?
4. What changes at the prespecified 0.5, 0.8, 0.95, and 0.99 thresholds?
5. Are categories/routes stable across three correlated repetitions?

Expected review still means reference other only. No real actions are performed. No urgency/frustration accuracy or general calibration claim is supported. Test cases that remain perfect will be reported as such, not replaced after observation.

## Commands

```sh
# Offline, no key or calls
node benchmark.mjs --config data/support-routing-v3.json

# Authorized live evaluation after preflight
node --env-file=.env benchmark.mjs --config data/support-routing-v3.json --live --budget-usd 0.05 --out doc/results/benchmark-v3-live-2026-09-21.json

# Offline replay
node benchmark.mjs --replay doc/results/benchmark-v3-live-2026-09-21.json
```

The [v2 budget/replay contract](benchmark-v2.md) still applies. Official pricing/limits rechecked 2026-09-21: USD 0.042/M input tokens, output free, 64k context per request. The guard reserves 65,536 input tokens before dispatch, including potentially billed failures. Cost is an estimate, not an invoice. [Official source](https://docs.typesafe.ai/models)

Completion requires tests, unchanged old artifacts, a pre-live baseline snapshot, retained live/partial observations, reconciled ledger deltas, and results including ambiguity and failures. Unused allowance is not a reason to keep spending.
