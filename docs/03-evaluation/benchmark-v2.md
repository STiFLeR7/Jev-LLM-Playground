# Broader routing benchmark

This benchmark extends the released playground without changing its prompts, routing policy, keyword baseline, or historical 16-ticket result. It is a small synthetic stress test, not a production qualification.

## Frozen task and labels

[Configuration](../../data/support-routing-v2.json) and [dataset](../../data/tickets-v2.json) contain 56 original English tickets: 8 development examples and 48 test cases. No model training is performed. Development examples explain the rubric and are not included in the paid run. Each test stratum has 12 cases, with three each for billing, technical, sales, and other:

| Stratum | Question investigated |
| --- | --- |
| clear | Can the model identify a plainly stated request? |
| negation | Does it distinguish an actual need from a negated category keyword? |
| mixed_intent | Can it prioritize a stated main request, or defer equally weighted requests? |
| instruction_noise | Does ticket text trying to alter routing change the decision? |

Label the **current main request**, not every topic mentioned. Billing covers existing charges, receipts, invoices, refunds, and paid-service cancellation. Technical covers product failures, access problems, and broken integrations. Sales covers pre-purchase questions, demonstrations, and new purchases. Other covers unrelated, insufficient, or equally mixed requests. Resolved historical issues do not take priority over the current request. Embedded routing instructions are data, not application instructions.

`expected_review` is true exactly when the reference department is other. This tests a narrow escalation rule, not every real-world safety or business reason to require human review. Labels and rationales were authored with the synthetic examples; they have **not** been independently adjudicated. No urgency or frustration labels are provided, so their accuracy is not evaluated.

The test cases are public, fixed before live observations, and not a hidden test set. Do not tune on these results and continue calling the same set held out. Any later change requires a new configuration/dataset version and a separately reported run.

## Run offline

Node.js >=22.9; no dependencies or key required:

```sh
npm test
node benchmark.mjs --config data/support-routing-v2.json
```

This evaluates the unchanged keyword baseline on 48 unique cases. It makes zero provider calls and does not create a spending ledger.

## Authorized live run

The approved experiment is three round-robin passes over the same 48 test cases: at most 144 sequential requests, pinned to jev-1.13.0, routing threshold 0.8. Existing questions include department, urgency, and frustration. Only the labeled department/review outcomes are scored. There are no automatic retries.

```sh
node --env-file=.env benchmark.mjs --config data/support-routing-v2.json --live --budget-usd 0.05 --out results/benchmark-v2.json
```

Live mode sends synthetic text to TypeSafe and consumes credits. It requires explicit budget and output arguments. The output path must not already exist. A checkpoint is saved after every response; an API error, wrong model, invalid usage, unavailable checkpoint, or insufficient budget stops further requests. Do not automatically rerun a stopped experiment: inspect its partial evidence and ledger first.

All CLI live runs share the ignored `results/benchmark-spend.jsonl`. Never delete it to bypass a spending limit. The ledger uses integer nanodollars and synchronizes a reservation to disk before dispatch. It reserves 65,536 input tokens per call, equivalent to USD 0.002752512 at the checked rate. A successful validated response replaces that reservation with its reported input-token cost. Failed requests or interrupted processes retain the full reservation. A lock blocks overlapping runs. A stale lock requires manual investigation; it is never automatically removed. Changing the existing ledger's limit is rejected.

Pricing and context limits were checked on 2026-09-21: $0.042 per million input tokens, free output, 64k combined input tokens per request. The 65,536-token reserve conservatively interprets 64k. Recheck these assumptions before future paid experiments. The local ledger is not a provider-enforced account cap: unrelated callers, other machines, account-specific rates, taxes, or billing changes are outside its control. It is a pricing-based estimate, **not a reconciled provider invoice**. [Official model documentation](https://docs.typesafe.ai/models)

## Replay and metrics

```sh
node benchmark.mjs --replay results/benchmark-v2.json
```

Replay validates the question/config/case contract, ordered case/pass observations, response structure, and routing decisions, then recomputes metrics. Input/source hashes identify the run; they do not authenticate evidence from an untrusted author. Legacy reports still use `node playground.mjs replay --report PATH`.

- **Classification:** successful-response accuracy, correct per attempted and planned requests, confusion matrix, per-class precision/recall/F1, and strata. Baseline metrics use 48 unique cases; model metrics use repeated attempts. Missing calls are not silently classified as API errors.
- **Routing:** wrong automatic routes divided by all automatic routes; automatic coverage divided by planned requests; expected-review precision and recall. Errors are shown separately and never credited as successful reviews.
- **Consistency:** all-equal department/route rates only among cases with every repeat successful; incomplete cases are explicit. Pair agreement divides agreeing successful pairs by observed successful pairs, alongside planned pair counts. Route agreement compares action and queue, not incidental urgency/frustration floats. Consistency can be consistently wrong.
- **Confidence:** four fixed bins and fixed policy thresholds 0.5/0.8/0.95/0.99 provide descriptive sensitivity analysis. These are not calibrated correctness probabilities or tuned threshold recommendations.
- **Operations:** per-attempt wall-clock p50/p95 (including failed calls), successful input usage, pricing-based cost, and durable budget snapshots. The ledger keeps unreported reservations separate.

Three repeated predictions are correlated observations of one case, not three independent samples. This run cannot establish population accuracy, calibration, prompt-injection immunity, or general production reliability. Network, model serving, and caching can affect measured consistency and latency.
