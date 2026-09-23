# Agent routing gate

A bounded harness asks a routing question, validates the answer, applies application policy, and optionally returns one operation's result. The browser's **Agent Lab** is offline by default, with an opt-in [NVIDIA text handoff](nvidia-handoff.md). This recipe is independent of the support-ticket benchmark.

## Try it without a key

```sh
node agent.mjs --text "calculate: 12 + 3"
node agent.mjs --baseline --text "calculate: 12 + 3"
node agent.mjs --baseline --execute --text "calculate: 12 + 3"
node agent.mjs --baseline --execute --text "checklist: inspect; test; document"
node agent.mjs --baseline --execute --text "draft: a friendly greeting"
node agent-eval.mjs
```

The first command previews a request. The second suggests a utility without running it. The third returns 15. The checklist is a local array, not tasks created elsewhere. The draft produces an **LLM handoff — not executed**, not generated prose. All commands above make zero provider calls.

Run `npm start` and select **Agent Lab** for the same preview/baseline flow. Enable **Allow one operation** only when you want execution. The result explains each application step; it does not expose hidden reasoning. The baseline is a syntax rule, not a Jev prediction.

## Supported operations

| Input | Result |
| --- | --- |
| `calculate: 12 + 3` | Two decimal operands, one arithmetic operator; no eval or expressions |
| `count words: some words here` | Whitespace-delimited count, not model tokenization |
| `checklist: first; second` | Up to 20 nonempty items of at most 200 characters each |

Operands and results must be finite with absolute value at most 1e12. Division by zero, extra arithmetic syntax and unsupported operations route to review. Nothing runs shell commands, reads arbitrary files, browses URLs, sends messages, changes accounts, or invokes a general-purpose model.

## Jev questions and policy

The request asks a Choice (`tool`, `workflow`, `llm`, `human_review`), Noul (`approval_needed`) and a three-level complexity Score. It follows the [official API contract](https://docs.typesafe.ai/api). Jev is pinned to `jev-1.13.0`; [model details](https://docs.typesafe.ai/models) were checked on 2026-09-22.

Live policy prioritizes approval-needed probability >=0.5, an explicit review choice, and confidence below the selected threshold. Threshold equality passes. Even a confident tool/workflow answer cannot execute unless the exact operation is allowlisted and the caller explicitly consents. Complexity is informational. Baseline has no confidence score and uses its own clearly labeled syntax rule.

The read-only executor boundary—not the model's opinion—is the security control. The Noul question is not a validated safety classifier. Review stops locally; it does not notify a real reviewer.

## Optional live CLI

```sh
node --env-file=.env agent.mjs --live --budget-usd 0.05 --out results/new-agent-run.json --text "calculate: 12 + 3"
```

This sends text to TypeSafe and consumes credits. `--execute` is still required for local execution. Only environment credentials are used by CLI; the browser's memory-only key belongs to its server process.

Live requires the **existing** `results/benchmark-spend.jsonl` cumulative ledger used by previous benchmarks. It must have the same USD 0.05 limit. The command refuses a missing, corrupt, locked or exhausted ledger; it will not create a new one. A new clone can use all offline modes, but live setup requires an explicitly established budget history. Do not create an empty ledger to conceal prior spend.

The output file is created exclusively before a provider request. Existing files are never overwritten. The ledger reserves one full request, settles validated usage, retains uncertain reservations and makes no retries. Reports include model/configuration, normalized observation, trace and budget snapshots. Use synthetic text: explicit CLI reports retain the task. Treat failed reports and unresolved reservations as evidence, not files to delete and retry around.

The USD 0.05 ceiling covers these budgeted agent/benchmark CLI calls, not legacy support UI/CLI calls, other programs, or provider billing adjustments. No live agent benchmark was run for this milestone.

## Evaluation limits

`data/agent-gating-v1.json` contains 20 synthetic, author-labeled syntax-conformance cases. The offline evaluator records a dataset SHA-256, route counts, correctness and false-local-routing count. All 20 currently match the baseline by construction; this is a regression check, not evidence of semantic model quality or a fair Jev-versus-LLM benchmark. There is no held-out semantic test split. Live accuracy, provider latency and provider cost remain null.

To save an offline report explicitly, use `node agent-eval.mjs --out results/new-agent-baseline.json`; the path must not exist. Historical support reports are untouched.

## Architecture and next boundary

```text
Input → harness → decision source → validation → policy
                                                ├─ pure local operation → result
                                                ├─ LLM handoff (opt-in NVIDIA)
                                                └─ human review (stop)
```

The harness terminates after one decision and at most one operation. It has no iterative planner, memory store, arbitrary tool registry or production safety claim. The optional NVIDIA handoff produces text only; its output is never executed.

[Detailed specification](../superpowers/specs/2026-09-22-agent-harness-design.md) · [Implementation plan](../superpowers/plans/2026-09-22-agent-harness.md)
