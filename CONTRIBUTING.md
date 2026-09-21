# Contributing

This project values useful experiments and reproducible failures over feature count. Licensing is not yet selected; discuss contribution and redistribution terms with the owner before substantial external submissions. No contributor license agreement is implied.

## Local checks

Use Node.js 22.9+; no dependency installation is needed.

```sh
npm test
npm run demo
npm run eval -- --config data/support-routing-v1.json
node playground.mjs replay --report doc/results/jev-test-2026-09-21.json
```

These checks do not call TypeSafe. Do not add live requests or keys to CI.

## Small changes

Explain the problem, affected behavior, and how you verified the change. Add behavioral tests for validation, policy, or metrics changes. Keep existing commands compatible. Do not introduce infrastructure for hypothetical future consumers.

For documentation, distinguish implemented behavior, vendor claims, recorded evidence, and proposals. Include primary sources for API claims; never present illustrative values as observations.

## Experiments and datasets

Use the [experiment template](docs/03-evaluation/experiment-template.md) and [dataset guide](docs/03-evaluation/dataset-contributions.md). Tune on development data, freeze test settings, keep failed attempts visible, and preserve historical artifacts. Ask before making paid calls.

## Reporting

Use the issue templates for non-sensitive bugs and proposals. Include exact commands, Node/OS versions, sanitized inputs, expected behavior, and observed behavior. For security issues, follow [SECURITY.md](SECURITY.md) instead of posting exploit details publicly.

Before a commit, inspect staged changes and ensure `.env`, private inputs, credentials, and incidental run logs are absent.
