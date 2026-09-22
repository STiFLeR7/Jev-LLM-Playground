# Security policy and operating boundaries

## Intended use

This is a local experimentation tool, not a hosted production service. There is no security support SLA or independently completed penetration test. Do not expose the server to a public network.

The server binds to `127.0.0.1`, checks Host/Origin, serves an asset allowlist, and accepts one live request at a time. These checks do not protect against malware or another process running as your local user.

## Credentials and data

- Keep keys in the local environment or ignored `.env`; never place them in browser code, screenshots, issues, or committed artifacts.
- Alternatively, enter a key through the local Playground's masked session-key form. The field is cleared after submission; the server retains the key only in memory, never writes it to disk, and never returns it through the status endpoint. No browser storage is used. All tabs on that server share the active key. Clearing disables even an environment-loaded key for that process; restarting reloads the environment. The browser and local server necessarily handle the entered secret temporarily; this is not protection against local malware or browser extensions.
- Live ticket text is sent to TypeSafe. This app's lack of local ticket persistence is not a claim about provider retention.
- Use synthetic data. Review provider terms and your organization's requirements before private-data experiments.
- Provider errors are sanitized; successful outputs are normalized, not universally redacted.
- Inspect reports before sharing. Hashes are not signatures or proof of data authenticity.
- Agent Lab is offline-only. Its exact-syntax utilities are pure functions; model confidence cannot enable arbitrary code or external tools. The optional live agent CLI reserves against the existing shared budget before dispatch and retains uncertain reservations. LLM handoff is not connected. Saved CLI reports include task text, so use synthetic inputs and explicit new output paths.

If a credential may have been exposed, revoke/rotate it through the provider and investigate affected artifacts. Removing a file from the latest commit does not erase repository history.

## Report a vulnerability

GitHub private vulnerability reporting is enabled. Use [Report a vulnerability](https://github.com/STiFLeR7/Jev-LLM-Playground/security/advisories/new) to contact the maintainer privately. Do not publish credentials, private tickets, or exploit details in a public issue.

If the private reporting action is unavailable to you, open a minimal issue requesting a private contact **without sensitive details**, then wait for the maintainer's response. No response time is promised.

## Before a public release

Review staged files and history for secrets, verify tests and hosted CI, confirm a private reporting channel, choose a license, and document unresolved risks. A secret scan is a precaution, not a guarantee.
