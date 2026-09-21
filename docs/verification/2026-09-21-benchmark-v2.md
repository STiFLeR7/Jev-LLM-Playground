# Benchmark verification — 2026-09-21

Environment: Windows, Node v24.11.0, main branch. This records the pre-release verification checkpoint. Publication was subsequently authorized for v0.2.0; its GitHub release description links hosted CI for the exact release commit. Saved live-run provenance retains its original pre-commit state.

## Checks completed

- 33/33 automated tests pass, including the original 20. New guard/runner tests were observed failing before implementation; replay tampering and failed ledger synchronization regressions were observed failing before fixes.
- Zero-key CLI checks pass: request preview, original baseline, configured v1 baseline, historical replay, v2 baseline, and v2 live-report replay. No additional provider calls were made during verification.
- Pre-live reviewer found no spending-control blocker. Replay initially did not validate budget evidence; pricing, budget arithmetic/deltas, reservation IDs, timestamps, and stop states were added and retested before the paid run.
- Durable-budget tests cover exact-limit rejection, cumulative reopen, concurrent lock rejection, invalid amounts/usage, malformed journals, duplicate settlements, and conservative state after synchronization failure.
- Runner tests cover missing authorization, zero-call baseline, successful checkpointing, refusing existing output paths, API failure without retry, retained failed reservation, budget-exhausted zero dispatch, incomplete repeats, and hand-calculated routing metrics.
- All 144 paid observations were successful. The saved report replays with matching metrics. Its 144 reservations and settlements reconcile to 76,146 input tokens and USD 0.003198132 at the checked rate; no held reservations remain.
- Baseline/live dataset, case, effective-config, and source hashes match. Historical report SHA256 remains `2c58e7b234b6a97544f69ec001ea7d6817041e3cc028ce52f04e926b5d876a05`.
- Final independent review confirmed aggregate and threshold results, minimum confidence 0.8, and full-answer variation in 40/48 cases. No final blocker was found.
- Configured-key exact-value scan found no key values in publishable files; .env is ignored. This is not an exhaustive security audit. All local Markdown file links resolve; Git diff whitespace checks pass.

## Boundaries

The browser and old report were not changed; no new browser audit was needed for this CLI-only extension. Tests use fake HTTP transport except the explicitly authorized recorded run. Pricing-based accounting is not a provider invoice or account-wide spend control. Dataset labels are authored, not independently adjudicated; repeat agreement and perfect synthetic classification are not reliability or calibration guarantees.

See [protocol](../03-evaluation/benchmark-v2.md), [results](../03-evaluation/benchmark-v2-results.md), and [engineering write-up](../03-evaluation/engineering-writeup.md).
