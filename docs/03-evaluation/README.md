# Evaluation

The v0.3.0 [v3 challenge protocol](benchmark-v3.md) and [results](benchmark-v3-results.md) add harder cases, blind AI reference review, and observed low-confidence routing trade-offs. Disputed references remain separate; human adjudication is still needed.

The legacy implementation guide is [Decision Bench](../../doc/decision-bench.md). The [broader repeated benchmark](benchmark-v2.md) defines the new frozen dataset, denominators, spending guard, and separate replay command. See its [results](benchmark-v2-results.md).

## Repeat the offline analysis

```sh
npm run eval -- --config data/support-routing-v1.json
node playground.mjs replay --report doc/results/jev-test-2026-09-21.json
```

The first command evaluates keywords, not Jev. The second recomputes the saved Jev report. Neither validates current provider availability.

The browser's saved-evidence explorer selects the historical 16-ticket report or either 48-ticket, three-pass benchmark. It shows unique-ticket and attempt denominators, provenance warnings, matrices, and filters for label mismatches, review, wrong automatic routes, disputed references, and failures. V3's agreed-reference metrics remain separate. Legacy references are not independently reviewed; missing original ticket text is not reconstructed.

The threshold control recalculates routes from saved answers through the local server. It makes no model calls, changes no predictions, and writes no files. These are exploratory policy comparisons, not fresh evaluations or a justification for tuning on the test set. Different datasets are not pooled or ranked. See the [walkthrough and verification](../verification/2026-09-22-evidence-explorer.md).

## Design a new experiment

1. Specify the task, allowed labels, review policy, and failure costs.
2. State provenance and redistribution permission for every dataset.
3. Separate development from test cases before tuning.
4. Freeze data, questions, model version, policy, and baseline.
5. Obtain approval for live cost; retain every attempt, including failures.
6. Report successful-response and per-attempt metrics separately.
7. Inspect individual errors before making a headline claim.

Department and narrow expected-review labels exist in the broader benchmark. Repeated-decision agreement is descriptive, not proof of general determinism. Urgency/frustration accuracy and calibration still require additional protocols. Do not silently relabel difficult test cases after seeing results.

Use the [dataset guide](dataset-contributions.md) and [experiment proposal template](experiment-template.md).
