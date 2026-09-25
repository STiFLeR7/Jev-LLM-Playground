# Jev Lab roadmap status

Strategy: [user's long-term plan](plans/Jev-LLM-Playground-Strategic-Plan.md).
Implementation detail: [reference-release plan](../docs/superpowers/plans/2026-09-21-reference-release.md).

Updated 2026-09-25. Implementation through commit d38b241 was pushed to main, including the Agent Decision Bench pilot implementation and report; raw pilot artifacts remain local and ignored. This status distinguishes merged work, local work, proposed work and tagged releases. Release publication is tracked separately from feature verification; no production readiness is claimed.

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

## 3. Public contribution and release — v0.3.0 published

- [x] MIT license selected under owner authorization and GitHub private vulnerability reporting enabled.
- [x] Contribution guidelines and experiment/dataset templates.
- [x] Hosted CI verification for published commit `80e99b7` ([run](https://github.com/STiFLeR7/Jev-LLM-Playground/actions/runs/35565321063)).
- [x] Pre-publication configured-key scan of all staged files and existing history; .env is not tracked. This is not an exhaustive security audit.
- [x] Previous authorized commit and push of `80e99b7`.
- [x] Published [v0.1.0](https://github.com/STiFLeR7/Jev-LLM-Playground/releases/tag/v0.1.0) from commit e9420d2 after [hosted CI passed](https://github.com/STiFLeR7/Jev-LLM-Playground/actions/runs/35570872353). See [release notes](../docs/releases/v0.1.0.md).
- [x] Local [engineering write-up](../docs/03-evaluation/engineering-writeup.md); not posted to external communities.

Milestone 2 is published in v0.1.0. Its exact release commit passed hosted CI on Node.js 22 and 24; subsequent roadmap-only updates do not move the release tag.

The v0.2.0 benchmark and [v0.3.0 challenge benchmark](https://github.com/STiFLeR7/Jev-LLM-Playground/releases/tag/v0.3.0) are published. v0.3.0 points to `da25781d16a388780e4b7385d0978b877c9c22bb`, which passed [hosted CI](https://github.com/STiFLeR7/Jev-LLM-Playground/actions/runs/35587069614). Earlier tags remain unchanged. See [v0.3.0 release notes](../docs/releases/v0.3.0.md).

## 4. v0.4.0 offline evidence explorer — pushed to main, untagged

- [x] Select historical, v2, and v3 recorded reports through an explicit allowlist.
- [x] Keep unique tickets, repeated attempts, and agreed/disputed references distinct.
- [x] Filter label mismatches, human review, wrong automatic routes, disputed references, and failures.
- [x] Explore thresholds using shared policy and saved answers; no provider calls or artifact writes.
- [x] Verify browser switching, errors/retry, mobile layout, keyboard focus, and old endpoint compatibility.
- [x] Update walkthrough and status; see [verification](../docs/verification/2026-09-22-evidence-explorer.md).
- [x] Decision Studio: reference-inspired three-panel UI, Playground/Evidence/Learn navigation, responsive layout, and offline browser checks. [UI verification](../docs/verification/2026-09-22-decision-studio.md).
- [x] Committed and pushed in 2b6963d.
- [ ] Verify release-candidate hosted CI; separately authorize tag and publication.
- [x] Session-only API-key entry and clearing; no disk/browser storage or automatic provider calls.

## 5. Agent harness — pushed to main, untagged

- [x] Detailed [specification](../docs/superpowers/specs/2026-09-22-agent-harness-design.md) and [execution plan](../docs/superpowers/plans/2026-09-22-agent-harness.md) written before code.
- [x] Route/approval/complexity questions, normalized answers and deterministic execution policy.
- [x] One consented pure local utility/workflow operation and human-review stop; optional NVIDIA handoff added in milestone 6.
- [x] Offline preview/baseline routing in Agent Lab and CLI; live Jev CLI uses the existing cumulative budget and exclusive reports.
- [x] Versioned 20-case synthetic baseline conformance evaluation, not semantic model validation.
- [x] Final [verification record](../docs/verification/2026-09-22-agent-harness.md): 49 tests, browser checks, source/visual reviews and unchanged cumulative spend.
- [x] Initial harness committed and pushed in 2b6963d.
- [ ] Separate authorization to tag/publish this milestone.

## 6. Connected NVIDIA handoff — pushed to main, untagged

The opt-in [NVIDIA text handoff](../docs/04-recipes/nvidia-handoff.md) is implemented with fixed endpoint/model, consent, timeout and output limits. Nemotron 3 Super was verified through both baseline routing and a live Jev-to-Nemotron CLI run on 2026-09-23; see the [verification record](../docs/verification/2026-09-23-nvidia-handoff.md). Human-adjudicated agent-routing labels, semantic comparisons and document operations remain future work. No latency/cost benefit or production reliability is established by this milestone.

- [x] Explicit NVIDIA consent, server-side key, text-only output, 512-token limit, 30-second timeout, no retries or paid fallback.
- [x] 51 tests and browser checks; successful synthetic Jev-to-Nemotron CLI smoke.
- [x] Cumulative recorded Jev spend USD 0.006442296 under USD 0.05; NVIDIA billing unmeasured, not asserted zero.
- [x] Committed and pushed in 2fd120a; clean worktree confirmed after push.
- [ ] Release-candidate hosted CI and separately authorized tag/release.

## 7. Agent Decision Bench — offline pilot pushed, untagged

Contract: [Agent Decision Bench specification](../docs/superpowers/specs/2026-09-23-agent-decision-bench-design.md).

- [x] Draft a routing-only comparison of rules, Jev and Nemotron; no downstream execution.
- [x] Research [existing benchmark evidence and differentiation](research/2026-09-23-agent-benchmark-landscape.md); independent evaluations already exist.
- [x] Incorporate research into revised spec: exploratory pilot, policy attribution, always-review control and contrastive task families.
- [x] Specify fresh-context Codex GPT-6 Luna evaluation and shared-workspace isolation limitations.
- [x] Owner-approved revised written spec and file-level implementation plan; execution method selected.
- [x] Versioned 64-case dataset: 16 development / 48 test; family-separated splits and documented label rubric.
- [ ] Independent human review, preserved disagreements and frozen test labels. AI review is not human adjudication.
- [x] Prepare the [human-review handoff](../docs/03-evaluation/agent-routing-human-review.md), unlabeled extraction command and response contract; actual independent submissions remain pending.
- [x] Offline rules and always-review controls, validated reports, replay and hand-counted metric tests.
- [x] Bounded [author-reference Luna pilot](../docs/03-evaluation/agent-routing-pilot.md): 48/48 test attempts, raw 43/48, final policy 46/48, 24/48 automatic with zero wrong automatic against author labels. Local ignored artifacts, no new Jev/NVIDIA API calls or publication.
- [ ] Model comparators with shared capability policy, Jev budget enforcement and NVIDIA call ceiling.
- [ ] Separately authorized live runs: up to three passes per provider, failures/partial runs retained, spending reconciled.
- [x] Report route quality, wrong automatic routes, review coverage, pair consistency and unavailable usage/cost; session wall time is not provider latency.
- [ ] Follow-on Evidence explorer support for provider, policy and reference-status comparison.

The local pilot made no paid API calls and grants no new spending. Its author
references are not independent-human evidence; that milestone still requires
genuine human review. Jev/NVIDIA comparison and UI integration remain pending.

## 8. After the benchmark

1. Package the verified Decision Studio, agent harness and benchmark into a
   coherent release; confirm hosted CI and obtain publication authorization.
2. Build document triage as the next distinct recipe with its own specification,
   labels and safety boundaries.
3. Evaluate downstream answer quality and operational trade-offs separately
   before claiming that routing reduces total latency or cost.
