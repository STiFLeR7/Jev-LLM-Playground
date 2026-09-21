# Jev Lab roadmap status

Strategy: [user's long-term plan](plans/Jev-LLM-Playground-Strategic-Plan.md).
Implementation detail: [reference-release plan](../docs/superpowers/plans/2026-09-21-reference-release.md).

Updated 2026-09-21. This status distinguishes implemented local work from future release goals. Release publication is tracked separately from feature verification; no production readiness is claimed.

## 1. Decision Bench foundation — implemented locally

- [x] Response normalization and score/distribution consistency checks.
- [x] Offline replay with explicit legacy-provenance warning.
- [x] Dataset/effective-config/source hashes and runtime metadata.
- [x] Versioned support-routing config with pinned model and validated dataset.
- [x] Confusion matrices, per-class precision/recall/F1, and failure denominators.
- [x] Timeout/no-retry and concurrency/lock-release checks.
- [x] Keyless CI commands for baseline, configured benchmark, and replay.
- [x] Broader synthetic dataset and three-pass evaluation: 48 test cases, 144 live observations, with explicit routing/repeat metrics. See [results](../docs/03-evaluation/benchmark-v2-results.md).
- [x] Authorized live evaluation of the frozen v2 configuration: USD 0.003198132 estimated usage against a USD 0.05 cap; journal reconciled and offline replay matches.
- [ ] Independently adjudicated/harder datasets and additional baselines/tasks.
- [x] v0.3.0 challenge: 48 harder cases with blind AI review, 144 live observations, and separate agreed/disputed metrics. [Results](../docs/03-evaluation/benchmark-v3-results.md): five agreed-reference mismatches, all reviewed; cumulative v2/v3 estimated spend USD 0.0064197 under USD 0.05. Human adjudication and additional baselines/tasks remain open.

## 2. Education and evidence experience — verified locally

- [x] Beginner Jev guide and reorganized README entry point.
- [x] Application decision trace: input → questions → validation → policy → suggested route.
- [x] Read-only recorded-result explorer with provenance labels.
- [x] Browser/keyboard/mobile verification and labeled screenshots.

## 3. Public contribution and release — v0.1.0 published

- [x] MIT license selected under owner authorization and GitHub private vulnerability reporting enabled.
- [x] Contribution guidelines and experiment/dataset templates.
- [x] Hosted CI verification for published commit `80e99b7` ([run](https://github.com/STiFLeR7/Jev-LLM-Playground/actions/runs/35565321063)).
- [x] Pre-publication configured-key scan of all staged files and existing history; .env is not tracked. This is not an exhaustive security audit.
- [x] Previous authorized commit and push of `80e99b7`.
- [x] Published [v0.1.0](https://github.com/STiFLeR7/Jev-LLM-Playground/releases/tag/v0.1.0) from commit e9420d2 after [hosted CI passed](https://github.com/STiFLeR7/Jev-LLM-Playground/actions/runs/35570872353). See [release notes](../docs/releases/v0.1.0.md).
- [x] Local [engineering write-up](../docs/03-evaluation/engineering-writeup.md); not posted to external communities.

Milestone 2 is published in v0.1.0. Its exact release commit passed hosted CI on Node.js 22 and 24; subsequent roadmap-only updates do not move the release tag.

The v0.2.0 benchmark is published. The v0.3.0 challenge benchmark is authorized for publication, gated on hosted CI for its exact release commit; see [release notes](../docs/releases/v0.2.0.md) and [GitHub releases](https://github.com/STiFLeR7/Jev-LLM-Playground/releases) for publication status. The UI intentionally continues to show the historical 16-ticket report; new evidence is available through the benchmark CLI and documentation.

## 4. Expand only after the first release

Agent gating and document operations each need a task definition, labeled evaluation, and explicit execution boundaries. General-purpose LLM comparisons, provider adapters, and package workspaces should follow concrete requirements, not precede them.
