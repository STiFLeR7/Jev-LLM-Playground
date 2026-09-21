# Contributing datasets

Prefer original synthetic examples. Do not submit real customer tickets, credentials, personal data, or third-party text without appropriate permission.

Each proposal must describe:

- Dataset name/version, author/source, generation method, redistribution terms, and sensitive-data status.
- Task definition and allowed labels, including ambiguous and out-of-scope cases.
- Labeling rationale and any disagreement or adjudication.
- Development/test assignment and how leakage or near-duplicates were checked.
- Known coverage gaps and intended metrics.

Current ticket rows contain `id`, `split` (`dev` or `test`), `text`, and `expected` (billing, technical, sales, other). IDs must be unique; text must be nonempty and at most 20,000 JavaScript string units.

The current loader accepts only the existing support-routing/dataset version contract. A new dataset version requires a reviewed code/schema change; changing the JSON filename alone does not register it.

Do not overwrite the historical dataset to improve an existing reported score. New fixtures need a new identity and an honest comparison. Repository-wide licensing is still undecided; do not assume a license for submitted material.
