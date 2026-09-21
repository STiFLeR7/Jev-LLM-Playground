# FAQ and glossary

## Do I need an API key?

Not for preview, baseline evaluation, tests, or recorded replay. Live submissions require your TypeSafe key and may incur charges.

## Is preview a simulated Jev response?

No. It shows the request and, in the browser, a labeled keyword baseline. Replay analyzes a recorded response. Neither should be mistaken for a new live observation.

## Is this an official project or production service?

No. It is an independent learning project. It has no ticket-execution backend, hosted account system, or production reliability claim.

## Does 16/16 mean perfect accuracy?

Only on the saved synthetic sample. See [evidence limitations](../05-limitations/README.md).

## Where is the license?

The project's original code and documentation use the [MIT license](../../LICENSE). TypeSafe's model, API, branding, and referenced third-party materials are not licensed by this repository.

## Why does localhost return an error?

Use the documented address `http://127.0.0.1:3000`. The server deliberately checks its exact Host and Origin.

## Glossary

- **State:** the input being evaluated.
- **Rubric:** descriptions of allowed categories or ordered levels.
- **Policy:** deterministic code that turns observations into suggested behavior.
- **Review:** abstaining from automatic routing.
- **Provenance:** recorded input/configuration/source identity and run context.
- **Replay:** offline validation and recomputation of a saved report.
- **Baseline:** a simpler comparison method; here, keyword matching.
