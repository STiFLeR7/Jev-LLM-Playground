# Frozen routing benchmark — 2026-09-21

## Outcome

Jev matched the author-assigned department label on **48/48 unique synthetic cases in each of three passes** (144/144 successful classifications). The unchanged keyword baseline matched **28/48**. This is evidence about this deliberately small authored dataset, not a population accuracy estimate or a production-readiness claim.

| Measure | Observed result |
| --- | --- |
| Planned / attempted / successful / failed requests | 144 / 144 / 144 / 0 |
| Unique test cases / repetitions | 48 / 3 |
| Keyword baseline | 28/48 (58.33%) |
| Jev classifications | 144/144 across three correlated passes |
| Suggested automatic routes / reviews at 0.8 | 108 / 36 |
| Wrong automatic routes | 0/108 |
| Expected-review precision / recall | 36/36 / 36/36 |
| Cases with identical categories and routing across all passes | 48/48 |
| Successful pair comparisons agreeing on category / route | 144/144 / 144/144 |
| Attempt latency p50 / p95 | 366.12 / 434.34 ms |
| Reported input tokens | 76,146 |
| Pricing-based usage cost | USD 0.003198132 |
| Authorized cap / unused amount | USD 0.05 / USD 0.046801868 |
| Unsettled reservations | 0 |

No further paid calls were made after completing the planned run. The goal was to finish the experiment, not consume the remaining allowance.

## Evidence and replay

- [Pre-live baseline and freeze snapshot](../../doc/results/benchmark-v2-baseline-2026-09-21.json)
- [All normalized live observations](../../doc/results/benchmark-v2-live-2026-09-21.json)
- [Budget journal audit copy](../../doc/results/benchmark-v2-budget-2026-09-21.jsonl)
- [Frozen configuration](../../data/support-routing-v2.json), [dataset](../../data/tickets-v2.json), and [rubric/methodology](benchmark-v2.md)

```sh
npm test
node benchmark.mjs --config data/support-routing-v2.json
node benchmark.mjs --replay doc/results/benchmark-v2-live-2026-09-21.json
```

These commands make no provider calls. Offline replay returned `metrics_match: true`. All 144 reservations and 144 settlements reconcile to 76,146 input tokens and 3,198,132 nanodollars. The operational ledger remains in ignored `results/benchmark-spend.jsonl`; the public journal is a point-in-time audit copy, not a replacement for that cumulative ledger.

The run used pinned `jev-1.13.0`, the unchanged v0.1.0 questions, keyword-v1 baseline, support-routing-v1 policy, and threshold 0.8. Every observed model ID matched the requested version. It ran from 09:16:13.619 to 09:17:09.163 UTC on 2026-09-21, with Node v24.11.0 on Windows. Latency includes this client's request processing and network; it is not isolated model inference latency.

The pre-live snapshot and live report share these hashes:

| Input | SHA256 |
| --- | --- |
| Full dataset bytes | `8d4d0fd7025225cefe0708b6c20ed85784bf573f32496db66d1e5fedb9c89305` |
| Embedded test cases | `eebc014e31671c83cc03bc9a31c92e67b8f050b7eb6390b321712a26edae93e2` |
| Effective config | `8df0b9df684037c78d25f0d73a5bf2e7fcb432f8f1f56a288579621b7e31c2a1` |
| Runner/client/evaluator/budget source | `333f67cb5f70d5a56cb4cc8756717ed36aec48a39ff0d0748b7c05f5138a253a` |

The reported Git base is `9c50864c5d49ee7d6a4f6ec1c2bdea51fb176aa6` with `working_tree_dirty: true`: the benchmark implementation was local, not part of that base commit. Do not claim checking out that SHA alone reproduces the runner. The source hash records the actual files used; byte hashes can also change with line endings. Hashes are identity checks, not independent authenticity proofs. The historical v0.1.0 report was left byte-for-byte unchanged.

## What the aggregate hides

Each of the four strata had 12 unique cases and 36 successful predictions, all matching the reference label. There are **48 examples, not 144 independent examples**. The cases deliberately contain clear prioritization, explicit negation, or simple embedded instructions; even the mixed-intent labels often have a strong textual cue. Perfect results can indicate an easy benchmark, not broad capability.

The minimum observed department confidence was exactly **0.8**. No response fell below the deployed threshold, so this live experiment did **not** measure the usefulness of low-confidence review at 0.8. All 36 reviews were driven by the `other` category. The safety of low-confidence and error paths is covered by offline tests, not demonstrated by these successful calls.

Category and route agreement were perfect, but full answer objects varied across passes for **40/48 cases**. Probabilities, confidence, urgency, or frustration can change without changing the selected category or queue. This is not evidence that Jev responses are bitwise deterministic.

## Fixed threshold sensitivity

Thresholds below were specified before the live run and recomputed from the same observations. No additional calls or policy tuning were performed.

| Threshold | Auto-route | Review | Wrong auto-routes | Review precision against narrow label |
| --- | --- | --- | --- | --- |
| 0.50 | 108 | 36 | 0 | 100% |
| 0.80 | 108 | 36 | 0 | 100% |
| 0.95 | 96 | 48 | 0 | 75% |
| 0.99 | 86 | 58 | 0 | 62.07% |

Expected-review recall remained 100% at each threshold. Raising the threshold here only sends additional correctly classified in-scope cases to review; there were no classification errors for the threshold to catch. This cannot establish the best production threshold or estimate the harm avoided by abstention.

Confidence bins [0,0.5) and [0.5,0.8) are empty. [0.8,0.95) has 21 observations and [0.95,1] has 123; both contain only correct classifications. Empty bins and the absence of errors prevent a useful calibration conclusion.

## Cost and limitations

The price used was $0.042 per million input tokens, output free, checked on the [official model page](https://docs.typesafe.ai/models) before the run. Token usage times that rate gives USD 0.003198132 (about 0.32 US cents). This is **not a provider billing reconciliation**. No provider invoice, tax treatment, or account-specific rate was retrieved.

The durable guard reserved the maximum documented request input cost before each call and settled actual reported usage afterward. There were no failed or unreported calls in this run. Other callers, machines, browser requests, and legacy CLI calls do not share this guard. Keep the operational journal; never reset it to create artificial budget headroom.

Remaining limitations: original synthetic English inputs; author-assigned, non-adjudicated labels; no realistic class prevalence; one provider/version; one small single-session run; public test cases; no general LLM baseline; unlabeled urgency/frustration; no downstream action execution; no general prompt-injection resistance or calibration claim. Review precision concerns only the dataset's narrow `other` label, not all reasons a real organization might require review.

## Next experiment

Use independently reviewed, harder cases with weak prioritization, context-dependent ownership, varied language, and realistic prevalence. Freeze a new version before any observations. Keep this result, including its easy-case limitations, unchanged. Additional live spending needs a new explicit scope; the unused allowance is not an instruction to keep running.
