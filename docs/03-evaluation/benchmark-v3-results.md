# Challenge benchmark results — 2026-09-21

One frozen run of jev-1.13.0 completed all 144 requests (48 synthetic tickets, three correlated passes). No retries, API errors, or post-observation label/prompt changes. See the [pre-run protocol](benchmark-v3.md), [baseline snapshot](../../doc/results/benchmark-v3-baseline-2026-09-21.json), [live observations](../../doc/results/benchmark-v3-live-2026-09-21.json), and [cumulative budget journal](../../doc/results/benchmark-v3-budget-2026-09-21.jsonl).

## Classification and policy are different results

| Measure | All author references | Agreed references only |
| --- | --- | --- |
| Unique cases | 48 | 42 |
| Jev matching attempts | 124/144 (86.11%) | 121/126 (96.03%) |
| Keyword matching cases | 20/48 (41.67%) | 14/42 (33.33%) |
| Automatic routes at 0.8 | 75 | 75 |
| Reviews at 0.8 | 69 | 51 |
| Wrong automatic routes | 0/75 | 0/75 |

The separate blind AI reviewer agreed confidently on 42 cases; six were flagged before the live run. These are not human-adjudicated labels or objective ground truth. Three repeats do not triple the independent sample size. Do not pool these results with v2 or treat zero observed routing errors as a production guarantee.

## Agreed-reference errors

- **v3-test-24:** a customer only acknowledges a previously supplied demo link, explicitly requiring no action. Reference `other`; Jev chose `sales` three times with confidence 0.74, 0.70, 0.76. The application sent all three to review.
- **v3-test-27:** equally mixed connector restoration and pre-purchase demonstration. Reference `other`; Jev chose `sales`, `other`, `sales` with confidence 0.23, 0.25, 0.27. All three went to review. This was the only case whose category changed across passes.

The confidence gate caught all five agreed-reference mismatches, but also reviewed 15 correctly classified billing/technical/sales attempts. Across all cases, 34 reviews came from choosing `other`; another 35 came from below-threshold non-other choices (20 author-label mismatches and 15 correct choices). This illustrates a coverage/review trade-off, not validated confidence calibration.

## Disputed cases remain disputed

Original author references were `other` for all six. All 18 attempts went to review. Jev chose billing for 31, 32, and 41; technical for 33 and 37; other for 39, consistently across repeats. These involve uncertain order state, plan entitlement, unexplained suspension, an unspecified rejection, an accounts contact, and unspecified paid-for access. The reviewer independently preferred billing for 31 and flagged uncertainty on all six. Do not count the resulting 15 author-label mismatches as established model failures; see the [review record](../../doc/research/benchmark-v3-label-review.json).

## Prespecified threshold sensitivity

Recomputed from the same saved answers; no additional calls or threshold tuning:

| Threshold | All routes / reviews | Wrong routes vs author labels | Agreed routes / reviews | Wrong routes vs agreed labels |
| --- | --- | --- | --- | --- |
| 0.50 | 99 / 45 | 9 | 93 / 33 | 3 |
| 0.80 | 75 / 69 | 0 | 75 / 51 | 0 |
| 0.95 | 72 / 72 | 0 | 72 / 54 | 0 |
| 0.99 | 61 / 83 | 0 | 61 / 65 | 0 |

At 0.5, the three agreed-reference wrong routes are repetitions of case 24. The six other author-label wrong routes are disputed cases 31 and 33. At the frozen 0.8 threshold, automatic coverage is 52.08% overall and 59.52% on agreed references. All 48 cases retain the same route/review action across three passes; 47 retain the same category. This is descriptive consistency, not determinism.

## Cost, timing, and provenance

- This run: 76,704 reported input tokens; estimated **USD 0.003221568**.
- Before: USD 0.003198132. After: **USD 0.006419700 cumulatively**, below the approved USD 0.05 cap; USD 0.043580300 remains. No unsettled reservations.
- The journal contains both v2 and v3: v3 reservations are IDs 145–288. Do not attribute the full journal cost to this run.
- Attempt latency p50 366.44 ms; p95 418.53 ms. Sequential local conditions, not throughput or service-level guarantees.
- Cost uses the dated USD 0.042/M input-token snapshot, output free; estimated from reported usage, not a provider invoice. The ledger does not govern unrelated calls. [Official pricing](https://docs.typesafe.ai/models)
- Baseline and live dataset/cases/config/source hashes match. Source SHA-256: `9dfebf4bf0451e8e8be70a35f651e2cd5ad01ecb6e141bb0877b5999e0cc0b9b`. Base revision `33e42986737903b804acdddc6bbe77956a9c28f6`, dirty working tree, Node v24.11.0 on Windows. The source hash identifies the actual modified source; the base commit alone does not reproduce it.

## Replay and next evidence gap

```sh
node benchmark.mjs --replay doc/results/benchmark-v3-live-2026-09-21.json
npm test
```

Both are offline. Replay checks retained evidence and metrics, not future provider behavior. Urgency and frustration remain unlabeled. A useful next step is independent human adjudication and a new frozen dataset of permissioned real or human-authored tickets—not tuning on these observed errors and presenting the same cases as fresh tests. No further API spending is necessary for that preparation.
