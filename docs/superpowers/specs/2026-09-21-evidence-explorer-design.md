# Recorded evidence explorer

Status: approved by owner and implemented; locally verified on 2026-09-21. Baseline: published commit `80e99b7`. Subsequently authorized for v0.1.0 publication.

Derived from the [strategy](../../../doc/plans/Jev-LLM-Playground-Strategic-Plan.md) and [education milestone](../../../doc/roadmap.md). Companion: [decision trace](2026-09-21-decision-trace-design.md).

## Outcome and scope

A visitor can inspect the saved 16-ticket support-routing experiment without an API key or new model calls: aggregate metrics, individual outcomes, errors, and limitations. This is inspection of recorded evidence, not a fresh benchmark or a claim of general accuracy.

Use the existing browser page, Node server, `replayReport`, and `diagnosticMetrics`. No charting library, upload flow, arbitrary filesystem browser, report registry, database, or additional experiment is needed yet.

## Data boundary

Add one fixed GET endpoint: `/api/reports/support-routing-2026-09-21`. It maps internally to `doc/results/jev-test-2026-09-21.json`; it accepts no report path or filename. Existing Host/Origin checks and security headers apply. Never expose the results directory as static files.

Read and parse the fixed report, then run `replayReport` before returning any results. Construct a fresh allowlisted view; never spread raw report/provider objects into the response. A missing, malformed, or inconsistent report produces a sanitized unavailable/error response with no partial success metrics or filesystem details.

Proposed response contract:

```text
mode: "recorded_replay"
api_calls: 0
report_id: "support-routing-2026-09-21"
metadata: { recorded_at, model, split, threshold }
summary: recomputed replay summary
diagnostics: recomputed replay diagnostics
warnings: replay provenance/compatibility warnings
summary_matches_recorded: replay comparison flag
cases: array of allowlisted case views
```

Metadata reflects the saved report, with explicit null/unavailable values for missing optional facts; never substitute today's date or current runtime as original run metadata. Validate metadata types before serialization. Preserve the legacy-provenance warning: this report lacks original dataset/config/source hashes, and replay cannot authenticate the original experiment.

Each case exposes `id`, `expected`, `baseline`, `status`, and, on success, validated `prediction`, `confidence`, unchanged `decision`, and finite `latency_ms`. Failure rows expose a generic error marker and null model-result fields, not raw errors or a guessed category. Reuse existing validation for successful answers and routing checks. Do not expose ticket text: the saved report omits it, and joining current dataset text would imply an unverified historical mapping.

Keep the original report immutable. A recorded-summary mismatch must be visible; display recomputed metrics as recomputed, never silently present them as the recorded values.

## Browser experience

Add a clearly labeled Recorded experiment section separate from the current request/live panel. Load its fixed endpoint only when the user selects the recorded experiment. Show loading, unavailable, and loaded states without enabling live mode or submitting the ticket form.

Display model, recorded timestamp, split, threshold, sample size, provenance warnings, and the synthetic-data limitation before the numbers. Show model/baseline accuracy with explicit denominators, errors, review coverage, wrong auto-routes, and successful-call latency. Null metrics display “not available,” not zero. Describe token-derived cost only as an estimate, not an invoice or current pricing.

Use a native table for per-case outcomes and a labeled confusion matrix. Filters: all, model misclassifications, human review, failed requests. Filters operate on already loaded cases and make no provider calls. Failed requests are not classification mistakes or an `other` prediction; keep their count visible separately. Empty filters show an explanatory message.

Use table captions/header associations, accessible filter labels, visible keyboard focus, text alongside status colors, and a contained horizontal table scroll on small screens. Insert all untrusted values as text. Resetting or editing the live ticket must not relabel recorded evidence as live.

## Acceptance and verification

- Loading/filtering recorded evidence works without credentials and calls the provider zero times, verified with an injected spy.
- Recomputed summary/diagnostics agree with offline replay of the saved fixture.
- Legacy warnings and successful-versus-attempted denominators remain visible.
- Malformed reports fail safely; raw unknown fields, secrets, ticket text, and internal paths never enter the response.
- Unknown report IDs and attempts to request `.env` or arbitrary paths cannot read files.
- Synthetic failure fixtures cover null metrics, failed rows, empty filters, and summary mismatches; the historical report bytes stay unchanged.
- Browser checks cover keyboard operation, narrow-screen tables, independent preview/live states, and unavailable-report recovery. Screenshots clearly identify recorded or simulated evidence.

Expected files: `server.mjs`, existing browser assets, and existing tests; reuse evaluation functions rather than copying metric logic. An optional small projection helper belongs beside existing evaluation logic only if needed for testability.

## Delivery gate

Review this spec before implementation. Implement after the trace, update the learning/evaluation docs with actual verified behavior, and rerun keyless CI commands. Add multiple reports or imports only when there is a second concrete dataset and a reviewed validation contract. No new live evaluation, release tag, or deployment is authorized by this specification.
