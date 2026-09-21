# Typed decisions

Official concepts checked September 21, 2026. The examples below describe this repository's task, not a new provider SDK.

| Primitive | Meaning | Our question |
| --- | --- | --- |
| Choice | Select a defined option; receive its probability distribution and confidence | Which department owns the ticket? |
| Score | Probability-weighted position across ordered rubric levels | How frustrated is the writer? |
| Noul | Probability that a yes/no answer is yes; no separate confidence | Is the ticket urgent? |

See the official [Choice](https://docs.typesafe.ai/primitives/choice), [Score](https://docs.typesafe.ai/primitives/score), and [Noul](https://docs.typesafe.ai/primitives/noul) documentation.

Our department options are billing, technical, sales, and other. The frustration levels are calm, frustrated but civil, and very angry, indexed 0–2. A fractional score is valid; it is not an invented fourth category. Urgency is a probability, not a severity score.

Run this to inspect our exact request:

```sh
npm run triage -- --text "The export button does nothing."
```

Question IDs organize responses. Write full instructions instead of assuming an ID such as `urgent` explains the task.

The application checks required fields, numeric ranges, allowed options, distributions, and score consistency, then retains only recognized response fields. That guards the software boundary; it does not establish semantic correctness.

Next: [confidence](confidence-and-uncertainty.md).
