# Decision Bench: support-routing v1

This is a small, reproducible support-routing experiment, not a general provider framework or production benchmark. It currently supports the fixed Choice/Noul/Score question contract and one keyword baseline.

## Run without a key

```sh
npm run eval -- --config data/support-routing-v1.json
node playground.mjs replay --report doc/results/jev-test-2026-09-21.json
```

The first command runs the baseline. The second validates saved model observations and recomputes their metrics; it never reruns Jev. Model diagnostics are `null` in baseline-only mode, not simulated measurements.

The browser's Recorded experiment section exposes this same fixed report through a validated, read-only projection. It shows recomputed metrics and case filters; it cannot select paths or upload reports, and filtering makes no requests.

The [config](../data/support-routing-v1.json) specifies a schema version, task, relative dataset path, dataset version, split, model, confidence threshold, policy/baseline versions, and one attempt per case. Unsupported versions, unknown fields, invalid labels, duplicate IDs, and empty selected splits fail before evaluation. This legacy CLI supports only support-routing v1 and synthetic-tickets-v1. The separate [v2 benchmark CLI](../docs/03-evaluation/benchmark-v2.md) adds a broader frozen dataset, repeated trials, and a spending guard; multiple decision tasks remain future work.

Supplying `--config` rejects simultaneous model/threshold/split overrides. Existing ad-hoc CLI flags remain available without a config. The bundled config is pinned to `jev-1.13.0`; the ad-hoc CLI retains `jev-latest`. A pinned version is not a promise of deterministic answers or indefinite provider availability.

## Provenance

New reports record exact dataset-byte SHA-256, effective configuration SHA-256 (including questions and policy/baseline versions), and source SHA-256 for the CLI/client and evaluation module. Source/runtime/Git metadata is captured before the evaluation loop. Start and completion times describe the run. Requested model is in the envelope; resolved models remain in successful rows. Missing Git revision and dirty state are explicitly represented.

Hashes identify content, not authenticity. Replay checks supported schema/policy, validates successful responses and recorded routing, then recomputes totals. It does not independently retrieve the original dataset, verify source hashes against historical code, or authenticate the report. `summary_matches_recorded` compares the legacy-compatible summary; diagnostic metrics are freshly derived. Preserve dataset/config/source alongside reports for independent reproduction.

The historical run is left untouched and replay labels it `legacy_provenance_incomplete`. Do not retroactively invent hashes, revisions, or repeated-run observations for it.

The browser projection deliberately omits ticket text because the legacy report does not contain it. Joining today's dataset would imply an unverified historical mapping. Missing optional metadata stays unavailable, failed rows remain errors rather than guessed categories, and a recorded-summary mismatch is shown explicitly.

## Metric definitions

Confusion matrix rows are expected classes; columns are predicted classes. Errors are excluded from matrix cells and counted separately. `other` is a real dataset label, not an error bucket.

| Field | Denominator / meaning |
| --- | --- |
| `accuracy` | Correct predictions / successful predictions |
| `correct_per_attempt` | Correct predictions / all attempts, including errors |
| `support` | All attempted cases for the expected class |
| `successful_support` | Successfully predicted cases for the expected class |
| `precision` | True positives / predictions of the class |
| `recall_successful` | True positives / successful support |
| `recall_per_attempt` | True positives / all support |
| `f1_successful` | 2 × true positives / (successful support + predictions of the class) |
| `wrong_auto_routes` | Successful automatic routes whose queue differs from the label |

Zero denominators return `null`. F1 is zero when its denominator is positive but there are no true positives. Baseline metrics use all cases; no model probability or token cost is invented for the keyword baseline.

Existing summary fields retain automatic coverage, automatic accuracy, review count, out-of-scope misroutes, and nearest-rank p50/p95 latency. These summary latency percentiles still cover successful requests only. New live rows additionally record per-attempt elapsed time, including failures, and a generic `evaluation_failed` code. Failed-call token usage/cost is unknown and excluded from the estimate. There are no automatic retries.

## Evidence limits

The saved Jev run has 16/16 correct department labels and the keyword baseline has 12/16. All recorded department confidences were at least 0.91, so it does not test the 0.8 low-confidence review branch. Urgency/frustration are unlabeled. Neither calibration nor repeat consistency is established. New metrics are analysis of existing observations, not new model evidence.

Tune only on development cases, freeze the config/data before another test run, and retain failures and all attempted runs. New paid evaluations require explicit approval in this workflow.
