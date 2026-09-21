# TypeSafe AI and Jev

As of 2026-09-21. Documentation research, not a local benchmark.

## What it is

TypeSafe describes Jev as its first System One model: provide a state and focused questions, receive typed judgments that software can consume. It is suited to classification, routing, and scoring. It does not provide ordinary free-form chat output. Questions sharing a state are evaluated independently; dependent decisions must be composed in application code. [Official introduction](https://docs.typesafe.ai/introduction)

Founder Diogo Almeida announced early access on September 15, 2026. The announcement describes a new architecture, parallel sampling, and Reinforcement Learning for Calibrated Decisions (RLCD). These are vendor descriptions; this research did not independently verify the training method. [Launch announcement](https://typesafe.ai/blog/introducing-system-one-models-and-jev)

## Question types

| Primitive | Useful for | Returned fields |
| --- | --- | --- |
| Choice | Select a department, category, or allowed action | `choice`, `probabilities`, `confidence` |
| Score | Judge a defined, ordered rubric | `score`, `legend`, `probabilities`, `confidence` |
| Noul | Estimate whether a statement is true | `noul`, between 0 and 1 |

Questions use IDs, `type`, and `instructions`. Choice criteria are an option map; Score criteria are ordered levels. A score can fall between levels. Noul has no separate confidence field. Question IDs are for application bookkeeping and are not sent to the model, so instructions must contain the complete question. Include an `other` option where the Choice categories are incomplete. [Primitives](https://docs.typesafe.ai/primitives)

Choice and Score confidence summarize the shape of their probability distributions. Do not automatically interpret confidence as the selected option's probability or as a measured correctness rate. Choose thresholds using labeled examples from the intended task. [Confidence](https://docs.typesafe.ai/confidence)

## Integration facts

| Item | Officially documented value |
| --- | --- |
| Endpoint | `POST https://api.typesafe.ai/v1/systemone` |
| Authentication | `Authorization: Bearer <API_KEY>` |
| Content type | `application/json` |
| Request fields | `state`, `model`, `questions` keyed by question ID |
| Quickstart model alias | `jev-latest` |
| Response | `model`, `answers`, `usage` |
| SDK key environment variable | `TYPESAFE_API_KEY` |

These values come from the [official quickstart](https://docs.typesafe.ai/introduction/quickstart). Do not treat its sample model version as a promise about which version the moving alias will resolve to.

Python: install `typesafe-sdk`; import from `typesafe_sdk`; use `TypeSafeClient().system_one(...)`. The quickstart requires Python 3.10 or newer. [Python SDK repository](https://github.com/typesafe-ai/typesafe-sdk-python), [quickstart](https://docs.typesafe.ai/introduction/quickstart)

JavaScript/TypeScript: install `@typesafe-ai/sdk`; use `TypeSafeClient` and `client.systemOne(...)`. The repository specifies Node.js 20 or newer. [JavaScript SDK repository](https://github.com/typesafe-ai/typesafe-sdk-js)

The SDKs provide typed questions and answers and default retry handling; raw HTTP is also supported. [SDK overview](https://docs.typesafe.ai/sdk)

Before implementing, recheck request constraints, errors, model availability, and account limits in the [API reference](https://docs.typesafe.ai/api). No live call was made, so this research does not establish that the local key is valid or has access.

## Price and benchmark claims

The homepage advertises $42 per billion input tokens, equivalent to $0.042 per million. [Official homepage](https://typesafe.ai/)

The launch announcement says output tokens are free and reports 70–500 ms end-to-end response times. Its 193.6x speed and 444.6x cost comparisons are vendor workflow results, which the author says may be near the upper end of real-world gains. Measurements were generally made from West Coast laptops near the service; local network latency may differ. [Launch announcement](https://typesafe.ai/blog/introducing-system-one-models-and-jev)

The evaluation site covers security incidents, agent-trace observability, invoice processing, and customer service. It assumes the workflow harness is correct and uses consensus reference answers from other models rather than independently established human ground truth. This tests agreement within a particular harness; it does not establish universal task accuracy. [Evaluation methodology](https://evals.typesafe.ai/)

Our arithmetic illustration: 1,000 billed input tokens at the published rate cost $0.000042; 1,000 such requests cost $0.042. This is an estimate, not a measured bill. Use actual reported usage and current pricing in experiments.

## Limits and unresolved questions

The launch's zero-hallucination framing refers to schema-constrained outputs. Our interpretation: a valid category can still be semantically wrong; type validity is not factual correctness. [Launch discussion of type safety](https://typesafe.ai/blog/introducing-system-one-models-and-jev)

For this playground, still establish: local latency distribution, task accuracy, confidence behavior on ambiguous inputs, current account limits, and the resolved model version. Parameter count, detailed training recipe, and general-purpose benchmark superiority were not established by the inspected official material.

## Useful official destinations

- [Console](https://console.typesafe.ai/): account and playground, linked by the official quickstart.
- [Agent skills repository](https://github.com/typesafe-ai/skills): published integration guidance; recorded as a resource, not installed.
- [GitHub organization](https://github.com/typesafe-ai): official SDKs and related projects.
- [Privacy policy](https://typesafe.ai/legal/privacy-policy) and [customer agreement](https://typesafe.ai/legal/mca): source documents to review before using private datasets or distributing a service; no legal interpretation is made here.
