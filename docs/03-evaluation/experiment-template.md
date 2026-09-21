# Experiment proposal template

Copy this structure into an issue or a new proposal. It is not an executable configuration.

## Question

State one falsifiable question and what observation would count against your hypothesis.

## Data and labels

Identify dataset version, source/permission, synthetic status, split, label policy, and excluded cases.

## Frozen setup

Record question/rubric version, model/provider version, policy thresholds, baseline versions, attempt count, concurrency, and timeout/retry rules.

## Measures

Define correctness, review coverage, false automatic routes, error denominators, latency percentiles, and cost basis. Explain any scoring agreement metric.

## Execution and safety

Specify API-call budget, approval, retained artifacts, secret handling, and how failed/partial runs are reported. Keep irreversible actions out of experiments.

## Results and limits

Separate expected outcomes from recorded results. Include source/config hashes, timestamps, runtime, per-case errors, and limitations. Leave results explicitly “not run” until observations exist.
