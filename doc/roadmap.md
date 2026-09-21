# Jev Lab roadmap status

Strategy: [user's long-term plan](plans/Jev-LLM-Playground-Strategic-Plan.md).
Implementation detail: [reference-release plan](../docs/superpowers/plans/2026-09-21-reference-release.md).

Updated 2026-09-21. This status distinguishes implemented local work from future release goals. No GitHub release or production readiness is claimed.

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

## 2. Education and evidence experience — next

- [x] Beginner Jev guide and reorganized README entry point.
- [ ] Application decision trace: input → questions → validation → policy → suggested route.
- [ ] Read-only recorded-result explorer with provenance labels.
- [ ] Browser/keyboard/mobile verification and synthetic screenshots.

## 3. Public contribution and release — approval-dependent

- [ ] Owner-selected license and private security-report channel.
- [x] Contribution guidelines and experiment/dataset templates.
- [ ] Pre-publication secret review and hosted CI verification.
- [ ] Authorized commit/push, tagged release, and technical write-up.

## 4. Expand only after the first release

Agent gating and document operations each need a task definition, labeled evaluation, and explicit execution boundaries. General-purpose LLM comparisons, provider adapters, and package workspaces should follow concrete requirements, not precede them.
