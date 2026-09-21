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
- [ ] Broader labeled datasets, repeat trials, and additional baselines/tasks.
- [ ] Authorized live evaluation of a newly frozen configuration.

## 2. Education and evidence experience — verified locally

- [x] Beginner Jev guide and reorganized README entry point.
- [x] Application decision trace: input → questions → validation → policy → suggested route.
- [x] Read-only recorded-result explorer with provenance labels.
- [x] Browser/keyboard/mobile verification and labeled screenshots.

## 3. Public contribution and release — approval-dependent

- [x] MIT license selected under owner authorization and GitHub private vulnerability reporting enabled.
- [x] Contribution guidelines and experiment/dataset templates.
- [x] Hosted CI verification for published commit `80e99b7` ([run](https://github.com/STiFLeR7/Jev-LLM-Playground/actions/runs/35565321063)).
- [x] Pre-publication configured-key scan of all staged files and existing history; .env is not tracked. This is not an exhaustive security audit.
- [x] Previous authorized commit and push of `80e99b7`.
- [ ] Publish v0.1.0 after its pushed commit passes hosted CI (see [release notes](../docs/releases/v0.1.0.md)).
- [ ] Technical write-up.

Milestone 2 is locally verified and approved for publication. The hosted run above predates these changes; release publication requires green CI for the actual release commit.

## 4. Expand only after the first release

Agent gating and document operations each need a task definition, labeled evaluation, and explicit execution boundaries. General-purpose LLM comparisons, provider adapters, and package workspaces should follow concrete requirements, not precede them.
