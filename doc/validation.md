# Validation record

Date: 2026-09-21. Environment: Windows, Node.js 24.11.0.

This record preserves the v0.1.0 checks below. Subsequent v0.2.0 benchmark work is documented in the [48-case, three-pass results](../docs/03-evaluation/benchmark-v2-results.md), including all 144 requests, spending reconciliation, and repeatability limitations. It does not replace the historical observations.

## Offline checks

- `npm test`: 20 passing tests covering response normalization, decision traces, recorded-report projection, routing, malformed responses, HTTP/body failures, abort behavior without retries, missing credentials, evaluation denominators, synthetic splits, CLI replay, stable provenance hashes, config/dataset rejection, and HTTP concurrency/lock release.
- `npm run demo`: request preview with zero API calls.
- `npm run eval -- --config data/support-routing-v1.json`: 16-case keyless keyword baseline, 12/16 correct (75%), with zero API calls. This is baseline performance, not Jev performance.
- `node playground.mjs replay --report doc/results/jev-test-2026-09-21.json`: recomputed the historical summary with `summary_matches_recorded: true`; diagnostic metrics come from existing observations, not a new live run.
- The historical report SHA-256 remained `2c58e7b234b6a97544f69ec001ea7d6817041e3cc028ce52f04e926b5d876a05`.
- Hosted CI passed for published commit `80e99b7` on [GitHub Actions](https://github.com/STiFLeR7/Jev-LLM-Playground/actions/runs/35565321063). That historical run predates milestone 2. See [current runs](https://github.com/STiFLeR7/Jev-LLM-Playground/actions/workflows/checks.yml) for commit-specific release verification.

## Live verification

One synthetic ticket was successfully sent to TypeSafe using the existing local key. The initial sandboxed attempt failed to connect; the network-enabled retry succeeded. No key value was printed or written into this repository's documentation.

Input: `I was charged twice. Please refund the duplicate today.`

| Observed field | Value |
| --- | --- |
| Requested / resolved model | `jev-latest` / `jev-1.13.0` |
| Department / confidence | `billing` / 1.0 |
| Suggested action | Route to billing |
| Urgency probability | 0.88 |
| Frustration score / confidence | 0.65 / 0.47 |
| Input / output tokens | 523 / 77 |
| End-to-end latency | 1,239.56 ms |

This single ticket is a connection and response-validation smoke test, not an accuracy or latency benchmark.

## Saved 16-case evaluation

[Full JSON report](results/jev-test-2026-09-21.json), collected 2026-09-21 using the unchanged test split and threshold 0.8. Requested `jev-latest`; resolved `jev-1.13.0`. The first 16-call pass completed successfully but its tool output was truncated; a second complete pass was captured here. No prompts or thresholds were changed between passes. These are repeat requests, not 32 independent examples. The figures below describe only the saved pass.

| Metric | Saved pass |
| --- | --- |
| Successful / failed responses | 16 / 0 |
| Department accuracy | 16/16 (100%) |
| Keyword baseline accuracy | 12/16 (75%) |
| Automatic coverage / accuracy | 12/16 (75%) / 12/12 (100%) |
| Human review | 4 |
| Out-of-scope automatic misroutes | 0/4 |
| End-to-end latency p50 / p95 | 383.19 / 1,229.47 ms |
| Successful input tokens | 8,394 |
| Estimated saved-pass cost | $0.000352548 |

Cost uses the research price snapshot, excludes the first pass and previous smoke test, and is not a billing total. Repeated inputs may affect observed latency; cache behavior was not measured. This tiny public synthetic dataset does not validate calibration, real-world accuracy, urgency, or frustration.

## Browser playground

The local server reuses the CLI request and response validation. Offline integration tests cover static assets, preview without API calls, live dispatch with a mock, missing credentials, oversized/invalid input, Host/Origin rejection, and sanitized provider failures. No real provider calls are made by tests.

Local Headless Chrome 153.0.8010.48 browser checks covered desktop and 390px layouts, form and disclosure keyboard operation, loading/failure/retry, stale-state clearing, independent preview/recorded panels, local filtering, contained table scrolling, and zero external requests. Live-shaped responses and edge cases were intercepted synthetic fixtures; no new provider evaluation was performed. See the [detailed verification record](../docs/verification/2026-09-21-education-experience.md).

## Limits

The synthetic set is tiny and labels only department ownership. Confidence threshold 0.8 is illustrative. The CLI validates response shapes and uses explicit review/error outcomes, but does not establish model calibration, prompt-injection resistance, or production reliability. The initial commit is already published on GitHub. MIT licensing and v0.1.0 publication were subsequently authorized; [release notes](../docs/releases/v0.1.0.md) describe scope and limitations.
