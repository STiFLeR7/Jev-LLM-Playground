# Agent routing policy-attribution pilot — 2026-09-24–25

This exploratory, routing-only pilot used Codex-hosted GPT-6 Luna on 48 synthetic test tasks. All references are **author-only**: no independent human agreement or adjudication exists. The 16 development cases and 48 test cases form 32 two-case families, with 24 test families across four 12-case strata. The frozen artifact contains the exact instructions, task order, labels, rubric and hashes. No handler, local operation, LLM handoff or downstream task answer was executed.

One development-only format check used `calculate: 8 + 5` and returned `{"route":"tool","approval_needed":false}`. The final prompt and inputs were frozen before the first test dispatch. A preparatory extraction used the wrong field name, then was corrected without recreating the freeze; the journal header timestamp was normalized to ISO milliseconds before test dispatch. The 48 ordered test attempts each used a fresh `/root/luna_<case_id>` session, requested `gpt-6-luna` with `fork_turns: none`, and received one frozen routing packet. No test retries or follow-up corrections were sent. Each pending and terminal journal entry was validated and flushed before the next dispatch.

## Measured results against author references

| Route source | Matching references | Automatic dispositions | Wrong automatic dispositions |
| --- | ---: | ---: | ---: |
| Exact-syntax rules | 35/48 (72.9%) | 15/48 | 1/15 |
| Luna raw route | 43/48 (89.6%) | 28/48 raw non-review choices | 4/28 raw non-review choices |
| Luna plus application policy | 46/48 (95.8%) | 24/48 (50.0% coverage) | 0/24 |
| Always review | 22/48 (45.8%) | 0/48 | 0 (no automatic decisions) |

All 48 attempts succeeded; errors and not-attempted cases were both zero. The policy reviewed 24 cases: 22 matched review-required references, giving review precision 22/24 and recall 22/22. Both final mismatches were extra reviews: `t02b` (tool reference, raw workflow) and `t07b` (workflow reference, raw human review). Raw route mismatches were `t02b`, `t07b`, `t08b`, `t09b` and `t20b`. The last three were review-required references that the model selected as local operations.

On the 48 paired cases, policy-controlled Luna gained 12 correct automatic routes over rules, lost two correct automatic routes, and introduced zero wrong automatic routes. The two losses came from raw model errors (`t02b` and `t07b`), not policy review of correct raw automatic routes; the unnecessary-review count relative to raw predictions was zero. Relative to raw model choices, policy caught four wrong automatic routes and left zero wrong automatic routes; three became correct reviews, while `t02b` remained a wrong final label. Removing the unsupported-operation gate offline would have made four wrong automatic routes. The approval and explicit-review predicates overlap on 16 cases; gate effects cannot be added as independent contributions. Luna has no Jev confidence observation, so the Jev confidence predicate was unavailable here.

Among 24 complete test pairs, raw routes were consistent on 19 and both correct on 19; final dispositions were consistent on 22 and both correct on 22. There were no excluded pairs. These are paired task variants, not repeated model calls, and one-pass repeatability is unknown. By stratum, final matches were 11/12 clear, 11/12 paraphrase/negation, 12/12 mixed/ambiguous and 12/12 instruction-noise/permission-claim. The agreed-human subset is empty; its rates are null.

## Evidence and limits

The request specified fresh conversations and prohibited tools, browsing, file reads and delegation. The journal records 48 distinct session IDs, requested model `gpt-6-luna`, and 48 `ok` terminal outputs. It records `tool_audit: unverified` for every attempt because complete tool logs were not exposed. Fresh context does not prove workspace isolation, technical tool disabling, absent platform context or provider authenticity. Exposed returned model identity, settings, token usage and cost are null; subscription access does not establish zero marginal cost. The session timestamps are controller wall time. Orchestration paused after `t20b` returned but before its terminal record was persisted, so its `finished_at` includes time through 2026-09-25 and is not model completion time. No API latency claim follows from these timestamps.

This is a small synthetic pilot with author references, not a production safety estimate or evidence that Luna, Jev or Nemotron is generally superior. Exact local syntax limits what can become a tool or workflow route; code-enforced capability checks are application policy, not model ability. No new Jev/NVIDIA comparison, human adjudication, downstream answer-quality, latency-savings or cost-savings result was established.

## Local replay and integrity

```sh
node agent-bench.mjs --replay results/agent-routing-pilot-report.json
node agent-eval.mjs
npm test
```

All three passed on 2026-09-25; `npm test` passed 63/63. Replay validates embedded evidence and recomputes metrics offline, but hashes do not authenticate the model provider. The local, ignored artifacts are not published reproducible evidence:

| Local artifact | SHA-256 |
| --- | --- |
| `results/agent-routing-pilot-freeze.json` | `cba2328055925e8049d9ce73b6501b86676b62e32d89602a145e9ba4262625d8` |
| `results/agent-routing-pilot-baseline.json` | `348707843f46ffaebdde50a455a47f42501b484f73123c32fe75c8a905f89f01` |
| `results/agent-routing-pilot-sessions.jsonl` | `5a8abf8717f462204ede631bd586b0b2b190d02839b1428f23fff983fc85b2e1` |
| `results/agent-routing-pilot-report.json` | `c56c5e24f092e60cf85bf0e9f170f8caa709d6ab7af404411b6f54b921daa36e` |

The freeze records source commit `2682473453e2191b985ad84b7769a4a8786d1abd` on Node v24.11.0/Windows and embedded config, dataset and source hashes. The cumulative `results/benchmark-spend.jsonl` SHA-256 remained `c50e0ce466c59819b6f200d2ccacbcfd5e8e1dfc5d29209bff74fd7b04169fff`; this pilot made no paid API call or spending-limit change. Test output, report and journal were checked against an independent row count. The [binding spec](../superpowers/specs/2026-09-23-agent-decision-bench-design.md#9-current-goal-policy-attribution-pilot-with-codex-luna) defines the scope. TypeSafe's current [intent-routing](https://docs.typesafe.ai/patterns/intent-routing) and [confidence](https://docs.typesafe.ai/confidence) guidance informed the separation between model judgment and code policy; no Jev confidence result was inferred from Luna.
