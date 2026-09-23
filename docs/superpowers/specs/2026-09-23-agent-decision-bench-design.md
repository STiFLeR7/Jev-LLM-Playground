# Agent Decision Bench — specification

Status: proposed implementation contract, written 2026-09-23 for owner review.
The [landscape review](../../../doc/research/2026-09-23-agent-benchmark-landscape.md)
informs the policy-attribution pilot defined in section 9. That section supersedes
the initial delivery sequence and API-run scope below for the current goal.
The owner approved the direction; this revised written contract awaits review
before implementation planning. No new Jev/NVIDIA calls or publication authorized.

## 1. Question and scope

Under the same bounded handler contract, how do deterministic rules, Jev and
Nemotron compare at selecting a route and identifying requests needing review?
Measure both the model's raw selection and the application's final disposition.
Do not assume Jev wins.

Compare routing decisions, not the quality of generated task answers. Never
execute a tool, checklist workflow or downstream text-generation handoff during
this benchmark. An LLM route is a label, not permission for another call.
The existing live Jev-to-Nemotron smoke test proves connectivity only.

Preserve support benchmark data/reports and the original 20-case
agent-gating-v1 syntax-conformance test. That test is not independent semantic
evidence. Add a separate versioned semantic dataset and runner.

## 2. Reuse and boundaries

- Keep Node ES modules, native fetch, node:test and zero runtime dependencies.
- Reuse agent input validation, exact operation allowlist, Jev question schema,
  response normalization, baseline routing and deterministic policy.
- Factor shared policy only where the runner needs it; preserve existing
  CLI/UI behavior and support response contracts.
- Reuse durable Jev accounting and existing classification metric helpers
  where their denominators match. Do not force new rows into support schemas.
- Do not add a provider framework, database, generic task DSL or new executor.

## 3. Dataset and label protocol

Proposed dataset ID: agent-routing-v2, schema_version 1.
Create 64 original English synthetic tasks: 16 development and 48 held-out
test cases. No training split because no model training occurs.

Test strata: 12 clear, 12 paraphrase/negation, 12 mixed-intent/ambiguous and
12 instruction-noise/permission-claim cases. Include at least six cases of
each reference route across the test set; publish actual class counts, not
an implied real-world distribution.

Each case contains:

| Field | Contract |
| --- | --- |
| id, family_id | Unique case ID; related variants share a family |
| split, stratum | Fixed development/test split and named stratum |
| text | Original synthetic task, 1–4,000 characters |
| expected_route | tool, workflow, llm or human_review |
| review_required | Boolean expectation for application disposition |
| rationale | Human-readable label explanation, never sent to providers |
| reference_status | author_only, agreed or disputed |
| reviews | Reviewer pseudonym, human/AI kind, independent route/review labels and rationale |

Keep entire families in one split. Reject duplicate IDs, exact normalized text
duplicates across splits, invalid labels and missing provenance. Human review
must also inspect semantic near-duplicates; hashing is not a leakage detector.

The label rubric must match actual capabilities: only exact supported syntax
qualifies for tool/workflow. A natural-language arithmetic request is not
automatically a tool case while the application lacks argument extraction.
Benign open-ended requests go to llm; ambiguous, unsupported, sensitive or
permission-requiring requests go to human_review. In this dataset,
review_required is true exactly when expected_route is human_review.
Annotate ambiguity in the rationale; do not force an arbitrary non-review label.

Have two human reviewers label cases without seeing provider predictions or
each other's labels. Preserve disagreements. Agreed means both humans agree
on route and review; AI review alone cannot produce this status. Resolve a
disagreement only through recorded human adjudication before the freeze.
An author-only draft can exercise the runner, but must not be described as
independently adjudicated. Missing reviewers block that evidence claim, not
offline implementation.

Freeze dataset bytes, label rubric, split manifest and their SHA-256 hashes
before test inference. Tune prompts or thresholds only on development data.
Corrections after observing test predictions require a new dataset version,
with the old version and results retained.

## 4. Three comparators

| Comparator | Decision source | Uncertainty treatment |
| --- | --- | --- |
| rules | Existing baselineRoute exact-syntax rules | No confidence or model probabilities |
| jev | Existing route Choice, approval_needed Noul and complexity Score; jev-1.13.0 | Existing route confidence threshold 0.80; approval_needed >=0.50 requires review |
| nemotron | NVIDIA nvidia/nemotron-3-super-120b-a12b as a router, not an answer generator | Explicit review flag; no invented confidence |

All comparators see the same task text and handler definitions, without labels,
rationales, split names or reviewer identities. Save the exact provider-specific
request construction: identical task information does not imply identical token
counts or API schemas.

Jev retains all three questions to evaluate the shipped recipe; complexity is
informational and not scored. Its extra question cost must remain visible.

Nemotron requests a single JSON object with exactly route (one allowed string)
and approval_needed (boolean). Use strict JSON parsing, reject extra fields,
markdown fences, tools, invalid types, missing output or truncated completion.
Do not repair responses, regex-extract labels or retry. Use the verified fixed
NVIDIA endpoint, thinking disabled, temperature 1, top_p 0.95, stream false,
max_tokens 512 and a 30-second timeout. Pin and hash the complete prompt.
Do not depend on undocumented JSON-schema support.

For both models, apply the same capability check and human-review precedence:
explicit review or approval signal stops routing; unsupported local syntax
stops routing. Jev additionally applies its native confidence gate.
Rules have no approval observation: report that difference rather than
fabricating one. All paths disable actual execution. Provider failures are
errors, never converted into a correct human_review prediction.

Report this as a comparison of concrete systems with different uncertainty
interfaces, not a controlled claim that their confidence values are equivalent.

## 5. Run protocol and authorization

Baseline and offline replay require no credentials and make zero network calls.
Live invocation must explicitly select one comparator, a frozen config, the
test split and a new output path. Proposed commands are not implemented yet:

```text
node agent-bench.mjs --baseline --config experiments/agent-routing-v2.json --out results/NEW.json
node --env-file=.env agent-bench.mjs --provider jev --config experiments/agent-routing-v2.json --budget-usd 0.05 --out results/NEW.json
node --env-file=.env agent-bench.mjs --provider nemotron --config experiments/agent-routing-v2.json --max-calls 144 --out results/NEW.json
node agent-bench.mjs --replay results/EXISTING.json
```

Run the baseline once over 48 unique cases. Proposed live protocol: three
sequential round-robin passes, 48 cases each, at most 144 calls per provider.
Do not replicate baseline rows to inflate sample size. Record case/pass order,
UTC timestamps, runtime, platform, source hash, requested/returned model IDs,
prompt/config/policy hashes and provider parameters.

No automatic retries, polling, fallback model or implicit resume. Stop after
the first provider/validation failure and checkpoint partial evidence.
Missing/blocked attempts stay visible. Never restart all calls automatically.

The existing Jev USD 0.05 cap is cumulative. Last verified spend was
USD 0.006442296, but the ledger at execution time is authoritative. Reserve the
existing conservative full-call amount before each request; settle verified
usage only and retain uncertain reservations. A missing/corrupt/locked ledger
fails closed. Never reset it or create a replacement to make the run fit.
The proposed 144 calls are a ceiling, not a promise that budget permits them.

NVIDIA is restricted to the approved free-prototyping endpoint, subject to
account limits; fail closed on quota/access errors and never provision paid
capacity. Enforce an explicit per-run max-calls ceiling including failures,
cap output tokens, and retain usage. A key does not prove zero billing.
Cost remains null unless independently verified; unknown is not zero.
Live benchmark scheduling/authorization is a separate gate from this spec.

## 6. Evidence and metrics

Create the report exclusively before dispatch. Checkpoint pending/terminal
attempts durably, including sanitized failures. Save successful synthetic-task
provider responses in credential-free evidence, with normalized projections
for replay; exclude headers, secrets and private reasoning_content. Mark this
as a filtered response, not an unmodified wire capture. Failed responses store
safe status/error categories, never arbitrary upstream error bodies.

Each row records case ID, pass, raw route, approval signal, available Jev
confidence/distribution, final policy route/reason, success/error status,
latency, token usage and provenance. No actual execution output exists.

Required metrics:

- Raw route confusion matrix, per-class precision/recall/F1 and accuracy.
  Report success-only accuracy AND correct/scheduled attempts; include error,
  not-attempted and successful denominators separately.
- Primary table: agreed-human test cases. Secondary table: all author
  references, clearly labeled; disputed and author-only cases remain visible.
  Empty agreed subsets yield null, not fabricated human-grounded scores.
- Final policy agreement; review precision = correctly reviewed / all reviewed;
  review recall = correctly reviewed / references requiring review.
- Automatic coverage = non-review successful dispositions / scheduled attempts.
  Wrong automatic routes = automatic dispositions differing from the reference;
  show both count and wrong/automatic rate. Separate false local routes and
  review-required cases mistakenly auto-routed.
- Metrics by stratum and reference status, with explicit denominators.
- Three-pass raw and policy consistency over complete successful triplets only;
  report excluded incomplete triplets. Repeated calls are not independent cases.
- Jev confidence bins and fixed exploratory thresholds 0.50/0.80/0.95/0.99
  recomputed from saved observations. Do not select a new headline threshold
  using test outcomes. No equivalent confidence bins for rules or Nemotron.
- Observed routing latency p50/p95, failures, per-provider input/output tokens,
  estimated Jev spend and unknown NVIDIA cost. No downstream latency savings,
  answer-quality or dollar-savings claim from this routing-only experiment.

Report zero denominators as null. Pair provider comparisons on the same
case/pass keys and show paired-subset coverage. Never drop errors silently or
present repeated attempts as independent sample-size evidence.
Offline replay validates schemas/hashes and recomputes metrics rather than
trusting saved totals; it cannot cryptographically prove provider authenticity.

## 7. Delivery sequence and acceptance

1. Approve this spec; write a file-level implementation plan.
2. Implement dataset validation, frozen config, baseline and offline replay.
3. Add Jev/Nemotron routing adapters and mocked boundary tests.
4. Obtain human labels and freeze evidence inputs; record any missing review.
5. Separately authorize and run bounded live evaluation, or explicitly report
   why live evidence is incomplete. Reconcile the Jev ledger.
6. Add the resulting report to the read-only Evidence explorer in a follow-on
   UI slice: separate provider/policy views, failures and reference-status filters.
7. Prepare a release after code, evidence and hosted CI are verified; tagging,
   publication and community posts require explicit authorization.

Runnable acceptance checks must cover malformed datasets/JSON, unknown routes,
review precedence, confidence equality, unsupported high-confidence operations,
no execution/downstream calls, no credentials in results, no network in replay,
exclusive outputs, partial failures, exhausted budgets and call ceilings.
Use hand-counted metric fixtures including zero denominators, disputed cases
and incomplete repeats. Preserve all existing tests and historical replay.

Implementation completion does not require Jev to outperform rules or Nemotron.
An honest negative result or explicitly incomplete run is valid evidence.
The independent-human benchmark milestone is not complete without genuine
human adjudication and an explicitly frozen test set.

## 8. Documentation sources and limitations

TypeSafe skill guidance informed the split between typed observations and
application policy. Official pages checked 2026-09-23:
[intent routing](https://docs.typesafe.ai/patterns/intent-routing) and
[confidence](https://docs.typesafe.ai/confidence).
The existing [NVIDIA recipe](../../04-recipes/nvidia-handoff.md) records the
verified endpoint/model and links to official NVIDIA usage documentation.

Synthetic English tasks, small strata, reviewer subjectivity, provider/model
drift and a syntax-limited local toolset constrain generalization. This is
neither a production safety certification nor evidence of a general model
ranking. Document triage and end-to-end answer-quality evaluation are later work.

## 9. Current goal: policy-attribution pilot with Codex Luna

### Scope and completion boundary

Implement offline dataset validation, rules, an always-review control, strict
result import, policy attribution and replay. Record one bounded Codex-hosted
GPT-6 Luna pilot against author references. Existing Jev/NVIDIA API adapters,
three-pass comparisons, independent human adjudication and Evidence UI expansion
remain later slices. The goal does not require those deferred milestones.
No paid API calls, publication or changes to the cumulative spending cap.

The question is what useful automation a model adds beyond rules and which
mistakes application policy catches or leaves behind. Do not claim a first Jev
benchmark: substantial independent work already exists. Until Jev is actually
evaluated on these inputs, the pilot cannot establish Jev's incremental value.

### Dataset freeze and inference

Retain 64 synthetic tasks, 16 development and 48 test, with the strata and
route minimums above. Use 32 two-case families, eight development and 24 test.
Each pair declares meaning-preserving variation or a meaningful change requiring
a different route. Freeze pair relations, labels, prompt and hashes before test
inference. Report pair consistency and correctness separately; consistently
wrong decisions are not successful understanding. Human labels are not invented.

Use one fresh session per task with `fork_turns: none` and requested model
`gpt-6-luna`. Send only frozen routing instructions, handler definitions, the
two-field JSON contract used for Nemotron and one task. Never send reference
labels, rationales, dataset paths, prior predictions or conversation history.
Do not request reasoning traces or confidence. Do not substitute another model.

Instruct sessions not to use tools, browse, read files or delegate. A fresh
conversation is not a sandbox: agents may share workspace and tool access.
Record session IDs and observable tool activity. Tool use invalidates the
attempt. If activity auditing is unavailable, label isolation unverified;
never claim tools were technically disabled or hidden platform context absent.

Ceiling: four development-only format/transport checks, then one attempt per
48 test tasks. Freeze the final prompt after development checks and before
test inference. No retries, corrections or follow-up prompts on test tasks.
Stop at the first malformed response, tool use or session failure and preserve
partial evidence; missing attempts remain explicit. Run no downstream action.

Record requested model and exposed returned identity/settings; unknown token
usage, parameters and billing stay null. Subscription access is not proof of
zero marginal billing. Session wall time includes orchestration and must not
be presented as raw API latency. Report Codex-hosted Luna, not a raw API model.

### Attribution and honest comparisons

Run rules and always-review once, without fabricating model observations.
Always-review has zero automatic coverage: zero automatic errors alone is not
useful automation. Apply the existing capability and review policy to Luna;
only Jev observations can activate a Jev confidence gate.

Save raw route, every independent policy predicate and the first effective
reason in production precedence. Replay with each gate removed as offline
diagnostics, never actual execution. Gate effects overlap and cannot be summed.

Against rules on paired successful cases, count correct automatic routes gained,
correct automatic routes lost and wrong automatic routes introduced. Relative
to raw predictions, count wrong automatic routes caught by policy, correct
automatic routes unnecessarily reviewed and wrong routes surviving policy.
Report errors and missing attempts separately, including scheduled denominators.
The exact-syntax tool contract limits semantic gains mainly to LLM versus review;
code-enforced execution guarantees must not be credited to the model.

This is a small exploratory pilot. Report descriptive paired counts, not
significance or population confidence claims. Repeated calls are not independent
samples; task families are the eventual resampling unit. A larger confirmatory
design and precision target come later. Endpoint differences cannot establish
model-architecture latency advantages. Unknown costs are never zero.

### Acceptance and execution sequence

1. Review this revised written spec, then review its file-level implementation
   plan and choose execution, as required by the design workflow.
2. Reuse existing policy and metric helpers; add no dependency or provider
   framework. Preserve existing CLI, UI and support reports.
3. Validate frozen inputs and imported strict JSON, provenance and hashes;
   test policy boundaries, hand-counted attribution, no execution/network,
   exclusive outputs, partial failures and missing-metric nulls.
4. Run the bounded Luna pilot after freeze; save sanitized evidence and replay
   it offline. Report tool-audit limitations and author-only reference status.
5. Update roadmap and report what was measured, including negative results.
   Leave human adjudication, API comparisons and publication visibly unfinished.
