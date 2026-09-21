# Jev LLM Playground

Learn how a decision model fits into software: define a question, inspect a typed answer, apply your own policy, and measure the result.

An independent community project using TypeSafe AI's Jev. **Working today:** a support-routing CLI, local browser playground, keyword baseline, versioned experiment config, offline replay, and diagnostic metrics. Not an official TypeSafe project or a production routing service.

## Why Jev?

TypeSafe describes Jev as a System One model: send application state and focused questions, receive structured decisions rather than conversational prose. That makes routing and classification useful experiments. It does not remove the need for application validation or evaluation. [Official introduction](https://docs.typesafe.ai/introduction)

This repository serves three paths:

| You want to… | Start here |
| --- | --- |
| Learn Jev | [Jev 101](docs/01-jev-101/what-is-jev.md) |
| Inspect evidence | [Decision Bench](doc/decision-bench.md) |
| Build a workflow | [Support-routing recipe](docs/04-recipes/support-routing.md) |

## Quickstart — no API key required

Install **Node.js 22.9 or newer** and Git. There are no runtime dependencies or build steps.

```sh
git clone https://github.com/STiFLeR7/Jev-LLM-Playground.git
cd Jev-LLM-Playground
npm test
npm start
```

Open **http://127.0.0.1:3000**. Paste a synthetic ticket and choose **Preview request**. Stop the server with Ctrl+C.

Prefer a terminal?

```sh
npm run demo
npm run eval -- --config data/support-routing-v1.json
node playground.mjs replay --report doc/results/jev-test-2026-09-21.json
```

These commands respectively preview a request, run the keyword baseline, and recompute a saved report. None makes a provider call.

## Interactive demo

The browser shows department probabilities, urgency, frustration, suggested routing, latency, token usage, and normalized JSON for live responses.

| Mode | What happens |
| --- | --- |
| Request preview | Shows the request and a labeled keyword baseline; no Jev answer is invented |
| Live | Sends your ticket to TypeSafe after explicit submission; consumes API credits |
| Recorded experiment | Loads the fixed saved 16-case run, recomputes metrics, and filters cases without querying Jev |

Preview and live results include a five-stage **application decision trace**: submitted input, questions, response validation, application policy, and suggested route. It explains application behavior, not hidden model reasoning. The independent recorded experiment explorer shows provenance warnings, aggregate metrics, confusion matrices, and filterable case outcomes. See the [verification record](docs/verification/2026-09-21-education-experience.md) and inspected [desktop](docs/images/recorded-explorer-desktop.png) / [mobile](docs/images/recorded-explorer-mobile.png) captures.

### Enable live requests

Create `.env` from [.env.example](.env.example), preserving any existing file. Set `TYPESAFE_API_KEY` to your key. The legacy name `JEV_LLM_API` is accepted as a fallback. Never commit either value.

Restart `npm start`, enable **Live request to TypeSafe**, and submit. Or:

```sh
npm run triage -- --text "I was charged twice. Please refund the duplicate today." --live
```

Omit `--live` for a request preview. The key stays on the server; live ticket text goes to TypeSafe. The app does not persist browser tickets. Use synthetic inputs and read [SECURITY.md](SECURITY.md) before experimenting with sensitive content.

## How it works

```text
Ticket → request builder → Jev → response validation → application policy
                                                        ├─ suggested team
                                                        └─ human review
```

Our application asks three questions:

| Question | Type | Application use |
| --- | --- | --- |
| Department | Choice | Billing, technical, sales, or other |
| Urgent? | Noul | Display a 0–1 yes probability |
| Frustration | Score | Display a weighted position on the 0–2 rubric |

The shared policy sends `other` or department confidence below 0.8 to review. Equality passes the confidence gate. This threshold is illustrative, not validated for production. Urgency/frustration do not trigger actions. The program never moves tickets, issues refunds, or executes tools.

Read [typed decisions](docs/01-jev-101/typed-decisions.md), [confidence](docs/01-jev-101/confidence-and-uncertainty.md), and [application policy](docs/01-jev-101/decision-policies.md).

## Experiments and results

### Broader benchmark (v0.2.0)

The [broader benchmark](docs/03-evaluation/benchmark-v2.md) adds 48 frozen test cases across clear requests, negation, mixed intent, and embedded routing instructions, plus 8 development examples. It records three passes, routing errors, review coverage, repeat agreement, and a durable spending ledger. Original prompts and keyword rules remain unchanged.

```sh
# Zero provider calls
node benchmark.mjs --config data/support-routing-v2.json
node benchmark.mjs --replay doc/results/benchmark-v2-live-2026-09-21.json
```

See [results and limitations](docs/03-evaluation/benchmark-v2-results.md). Paid runs require explicit authorization and budget arguments; the benchmark ledger does not cap unrelated browser or legacy CLI calls.

### Historical v0.1.0 experiment

The original dataset contains **32 original synthetic tickets**: 16 development and 16 test cases, four per department in each split. Only department ownership is labeled.

The saved September 21, 2026 run used `jev-latest`, resolved to `jev-1.13.0`, with threshold 0.8:

| Observation | Saved result |
| --- | --- |
| Jev department classifications | 16/16 correct |
| Keyword baseline | 12/16 correct |
| Automatically routed / reviewed | 12 / 4 |
| Correct automatic routes | 12/12 |
| Successful / failed requests | 16 / 0 |
| p50 / p95 request latency | 383.19 / 1,229.47 ms |

**This tiny synthetic result does not establish general accuracy, calibration, or production reliability.** All recorded department confidences were at least 0.91, so this live run did not exercise low-confidence review. Only the second of two passes was retained; it cannot establish repeat consistency.

[Saved JSON](doc/results/jev-test-2026-09-21.json) · [Validation record](doc/validation.md) · [Methodology and denominators](doc/decision-bench.md)

The [versioned config](data/support-routing-v1.json) pins model, split, threshold, and policy/baseline versions. Config mode rejects CLI overrides. New reports include dataset/config/source hashes and runtime metadata; hashes identify content, not authenticity. Legacy replay explicitly warns about incomplete provenance.

```sh
# Development baseline; free and offline
npm run eval -- --split dev

# Paid: one request per selected ticket, no automatic retries
npm run eval -- --config data/support-routing-v1.json --live
```

Tune on development data before freezing a new test run. Preserve failures and every attempted run. Cost estimates are dated estimates, not bills. Save CLI JSON only after reviewing it for private data.

## Recipes and architecture

The [support-routing recipe](docs/04-recipes/support-routing.md) is runnable today. Agent gating and document triage remain proposals.

[Architecture](docs/02-how-it-works/architecture.md) describes the actual dependency-free structure:

- `playground.mjs`: request, validation, routing, baseline, CLI.
- `evaluation.mjs`: config loading, provenance, diagnostics, replay.
- `benchmark.mjs` and `budget.mjs`: repeated benchmark, evidence replay, durable spending reservations.
- `server.mjs` and `web/`: local browser interface.
- `data/`, `test/`, `doc/results/`: synthetic fixtures, offline tests, curated evidence.

The larger package layout in the strategy is a possible future direction, not the current architecture.

## Limitations and roadmap

This is a local learning tool with one decision task and one baseline. There is no hosted authentication, production queue, general LLM comparison, or validated security classifier. Automated tests cover application boundaries, benchmark evidence, and the spending guard; local browser checks cover the released UI. See the [verification record](docs/verification/2026-09-21-education-experience.md) for UI checks and [GitHub Actions](https://github.com/STiFLeR7/Jev-LLM-Playground/actions/workflows/checks.yml) for commit-specific hosted results.

See [limitations](docs/05-limitations/README.md), [roadmap status](doc/roadmap.md), and the [strategic plan](doc/plans/Jev-LLM-Playground-Strategic-Plan.md). Research notes are a [dated source archive](doc/research/README.md), not proof of model performance.

## Contributing and security

Start with [CONTRIBUTING.md](CONTRIBUTING.md). Reproducible failures, clearer documentation, and carefully labeled synthetic cases are useful contributions. Do not post real keys or private tickets in issues. See [SECURITY.md](SECURITY.md) for reporting boundaries.

Licensed under [MIT](LICENSE). The license covers this project's original code and documentation, not TypeSafe's model, hosted API, branding, or third-party materials. Referenced materials retain their respective terms. See [v0.2.0 release notes](docs/releases/v0.2.0.md) and the [v0.1.0 history](docs/releases/v0.1.0.md).
