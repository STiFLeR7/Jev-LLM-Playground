# What is Jev?

Jev is TypeSafe AI's first System One model. Its interface accepts state and typed questions, returning structured judgments for software to consume. It is not this repository's chat assistant. [Official introduction](https://docs.typesafe.ai/introduction)

Here, state is a support ticket. Questions ask which team owns it, whether it is urgent, and how frustrated its writer sounds. Our code validates the returned values and applies a review policy.

Start without credentials:

```sh
npm run demo
```

Inspect the state and complete question instructions. This prints a request, not an observed model answer.

Keep four kinds of statements separate:

- **Vendor description:** how TypeSafe describes its model and training.
- **Recorded observation:** a response preserved in our synthetic experiment.
- **Application rule:** a deterministic threshold or routing condition we wrote.
- **Hypothesis:** an idea that still needs labeled evaluation.

A correctly shaped answer can still choose the wrong department. The [saved results](../../doc/results/jev-test-2026-09-21.json) are evidence for those inputs only.

Next: [typed decisions](typed-decisions.md).
