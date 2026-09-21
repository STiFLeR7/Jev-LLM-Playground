# v0.2.0 benchmark design

Approved direction: broader frozen support-routing data, repeated decisions, routing safety, and an engineering write-up. User authorized end-to-end execution on main with at most USD 0.05 new API spend. No new release/tag or deployment is included.

## Scope

Keep the v0.1.0 application, prompts, keyword baseline, routing policy, and legacy report unchanged. Add a separate benchmark CLI reusing request/response validation, routing, classification metrics, and the HTTP client. No dependencies or UI changes.

Freeze 56 original English synthetic tickets: 8 development examples and 48 test examples. Test strata: clear, negation, mixed_intent, instruction_noise; each has 3 examples per department (billing, technical, sales, other). Each case includes a department label, expected-review label, stratum, and author rationale. These are author-assigned labels, not independent human ground truth. Expected review means no single in-scope owner (other); it does not label every operational reason for human review. Development examples are not evaluated live. No training split because no training is performed.

Run three round-robin passes over the frozen 48 test cases using jev-1.13.0, existing three questions, threshold 0.8, no retries, sequential requests. Never modify labels, questions, thresholds, or baseline after inspecting test outputs. Repeated observations are correlated, not 144 independent examples.

## Budget and failure boundaries

Official pricing checked 2026-09-21: USD 0.042 per million input tokens, output free; 64k tokens per request. Reserve 65,536 input tokens (USD 0.002752512) before every request. Use integer nanodollars. A durable append-only ledger records reservations before dispatch and settlements only after valid usage; failures/crashes keep full reservation. A file lock prevents concurrent users of that ledger. Reopening a corrupt ledger fails closed; the same ledger carries spending across invocations. Never automatically reset it. Refuse limits above USD 0.05, and stop the run on API errors, unexpected model versions, or insufficient budget. No automatic retries or credits purchases. Pricing-based accounting is not a provider invoice or an account-wide spending control.

Source: https://docs.typesafe.ai/models . No paid call until tests, data/config hashes, and price assumptions are frozen. Save partial results, sanitized errors, and unattempted counts. A timeout is potentially billed, not free.

## Evidence

Save normalized API observations with timestamps, actual model, token usage, latency, case/pass IDs, questions, embedded test cases, input/source/config hashes, and budget snapshots. Preserve legacy files. Offline replay validates rows and recomputes metrics without credentials or network access. Output paths are exclusive: do not overwrite evidence.

Report classification matrix/per-class metrics, unique-case versus attempt denominators, per-stratum errors, automatic coverage, wrong automatic routes, expected-review precision/recall, confidence bins, fixed threshold sensitivity (0.5/0.8/0.95/0.99), and repeat category/route agreement. Incomplete/error repeats must not count as consistent. Confidence is not interpreted as empirical correctness probability. Latency describes this machine/network/run only. No urgency/frustration accuracy claim: those dimensions remain unlabeled.

## Acceptance

Tests cover hand-calculated metrics, incomplete/error repeats, config/data rejection, ledger cap/rounding/restart/lock/corruption, fail-closed API handling, zero-call preview/replay, and tampered reports. Existing tests and saved report replay continue passing. Publish local evidence and a write-up including failures and cost limitations. Live completion depends on API availability and budget; never exceed the cap to finish all planned calls.
