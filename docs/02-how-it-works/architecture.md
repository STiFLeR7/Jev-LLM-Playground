# Current architecture

The project uses Node built-ins and native browser assets. No SDK package, database, queue, or monorepo is required.

```text
CLI ─────────────────┐
Browser → server.mjs ├→ playground.mjs → TypeSafe HTTP API
                     │       └→ validateResponse → route
                     └→ evaluation.mjs → diagnostic metrics / replay
```

`playground.mjs` defines questions, builds requests, validates and normalizes responses, applies routing, and dispatches commands. `evaluation.mjs` loads experiment configurations, records provenance, and computes metrics. It reuses the current policy for replay; it is not yet independent across task versions.

`server.mjs` binds to loopback, serves an explicit asset allowlist, validates JSON input, and limits live requests to one at a time. The key is loaded in the Node process, never embedded in the browser scripts. The browser renders external values using text content.

Live calls have a 30-second default timeout, reject redirects, and make one attempt. Provider failures do not become a default department. Error bodies are not forwarded. Normalized successful output is not a universal sensitive-data sanitizer.

Fixtures and reports are separate from runtime actions. Historical reports remain immutable. New hashes identify the files/settings used, not their authenticity.

The strategic plan's larger directory structure is deferred. Extract a package when a second real consumer needs it, not merely to resemble a framework.

[Security boundaries](../../SECURITY.md) · [Decision Bench](../../doc/decision-bench.md)
