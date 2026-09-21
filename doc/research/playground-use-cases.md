# Proposed playground experiments

Planning notes, 2026-09-21. Update: the first ticket-triage CLI and 32-case synthetic dataset are now implemented; see the [repository README](../../README.md) and [validation notes](../validation.md). Other candidates remain proposals. The research findings below predate implementation.

## First experiment: support-ticket triage

Recommendation: start with a small command-line experiment over synthetic tickets. Ask for department with Choice, urgency with Noul, and frustration with Score in one request. Print the decisions, probabilities, model version, latency, and token usage. Code decides whether to route or flag a ticket for review.

Why start here: inputs and expected labels are easy to inspect, all three primitives fit naturally, and results can be published without exposing personal data. The [official quickstart](https://docs.typesafe.ai/introduction/quickstart) provides a closely related example.

## Other candidates

| Candidate | Smallest useful experiment | What to measure |
| --- | --- | --- |
| Document classification | Assign synthetic documents to fixed categories | Accuracy, ambiguous-input behavior, cost per document |
| Model or skill routing | Choose from a fixed catalog plus `other` | Routing accuracy against human labels |
| Agent-loop review | Score prerecorded synthetic traces for repeated failed assumptions | False alarms and missed loops |
| Content filtering | Judge a small labeled set against explicit rules | False positives and false negatives |

These are our proposed experiments, informed by the [official primitives](https://docs.typesafe.ai/primitives) and [collected community leads](tweets-and-community.md). They are not a claim that any candidate is production-ready.

## Minimal evaluation plan

1. Prepare 30–50 synthetic labeled cases, including ambiguity, missing context, and inputs outside the supplied categories. Keep a held-out subset for reporting.
2. Use one small script and one request per state with all independent questions. Select the language when implementation starts; no framework is needed yet.
3. Compare against a simple rules baseline. Add a generative-model comparison only if its credentials and budget are available, keeping inputs and task constraints comparable.
4. Record end-to-end median and p95 latency, errors, input tokens, estimated cost, overall accuracy, and accuracy among automatically accepted cases. Report how many cases were deferred.
5. Tune confidence thresholds on the development subset, then report held-out results without retuning. For Noul, inspect probability bins against observed labels; do not equate the separate Choice confidence statistic with accuracy.
6. Publish dataset provenance, date, model identifier, sample size, request structure, and failures alongside results. A small test set is exploratory, not evidence of broad reliability.

## Evaluation additions from Reddit research

The [new community collection](reddit-discussions.md) supplies concrete failure cases to include: out-of-scope inputs accepted with high confidence (R1), errors silently replaced with ordinary choices (R4), and individually plausible fields producing an incorrect complete record (R6). Add these cases to the small evaluation set; community results remain unverified until reproduced.

## Later GitHub handoff

The workspace currently contains research and a local `.env`. `.gitignore` excludes `.env` and `.env.*` while allowing a future placeholder-only `.env.example`. Before the first publication, inspect staged files for credentials, use synthetic examples, and label measured results separately from vendor claims. The repository name, license, implementation language, and first runnable demo remain future choices.

Do not publish raw private inputs or authorization headers. Record only sanitized outputs needed to reproduce the experiment. Research has not consumed API credit or validated the key.
