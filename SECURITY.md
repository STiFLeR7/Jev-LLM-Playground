# Security policy and operating boundaries

## Intended use

This is a local experimentation tool, not a hosted production service. There is no security support SLA or independently completed penetration test. Do not expose the server to a public network.

The server binds to `127.0.0.1`, checks Host/Origin, serves an asset allowlist, and accepts one live request at a time. These checks do not protect against malware or another process running as your local user.

## Credentials and data

- Keep keys in the local environment or ignored `.env`; never place them in browser code, screenshots, issues, or committed artifacts.
- Live ticket text is sent to TypeSafe. This app's lack of local ticket persistence is not a claim about provider retention.
- Use synthetic data. Review provider terms and your organization's requirements before private-data experiments.
- Provider errors are sanitized; successful outputs are normalized, not universally redacted.
- Inspect reports before sharing. Hashes are not signatures or proof of data authenticity.

If a credential may have been exposed, revoke/rotate it through the provider and investigate affected artifacts. Removing a file from the latest commit does not erase repository history.

## Report a vulnerability

A dedicated private reporting channel has not yet been configured. Do not publish credentials, private tickets, or exploit details in a public issue.

If GitHub offers a private “Report a vulnerability” action for this repository, use it; availability has not been verified. Otherwise, open a minimal issue requesting a private contact **without sensitive details**, then wait for the maintainer's response. No response time is promised.

## Before a public release

Review staged files and history for secrets, verify tests and hosted CI, confirm a private reporting channel, choose a license, and document unresolved risks. A secret scan is a precaution, not a guarantee.
