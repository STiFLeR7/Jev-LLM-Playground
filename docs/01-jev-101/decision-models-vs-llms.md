# Decision models and text-generation workflows

Choose the interface around the output your application needs.

A draft email requires text. A queue selector needs one allowed category. Conventional text-generation workflows can also produce structured output, but this repository has not benchmarked a general-purpose LLM against Jev.

TypeSafe positions Jev around focused, typed judgments rather than open-ended text generation. That positioning is a vendor description, not proof that Jev is best for every task. [Official introduction](https://docs.typesafe.ai/introduction)

Our experiment compares Jev with a keyword function. Rules are cheap, inspectable, and worth keeping when they solve the task. The saved comparison only demonstrates behavior on 16 public synthetic test cases.

Before replacing a rule, define the labels, failure cost, acceptable review rate, and evaluation split. Measure errors as well as successes. Do not choose a model based on this repository's name or a vendor speed claim.

See [evaluation](../03-evaluation/README.md).
