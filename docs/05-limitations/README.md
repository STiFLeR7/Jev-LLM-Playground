# Limitations

## Evidence

The saved 16-ticket run is public, synthetic, English-language, and department-labeled only. It does not establish population accuracy, calibration, non-English performance, or prompt-injection resistance. Four review outcomes are not evidence that low-confidence gating works on real traffic.

The first live pass was not retained in full. Only the second pass supports the published aggregate; repeat consistency cannot be recovered from it. Recorded latency includes local/network conditions and is not a provider SLA.

The newer [48-case benchmark](../03-evaluation/benchmark-v2-results.md) retains all three passes. Stable categories and routes did not mean identical full answers. Its author-assigned labels are not independently adjudicated, repeated observations are correlated, and no confidence fell below 0.8. It still does not establish calibration or general reliability. The spending ledger is local and pricing-based, not provider invoice reconciliation or a cap on other callers.

## Implementation

Only one task, one baseline, and the current question/policy contract are supported. The legacy evaluator uses one attempt per case; the separate v2 benchmark supports repeated passes. The app has no production action queue, user authentication, hosted rate control, automatic retries, or general-purpose LLM comparison.

Response validation protects data shape and checks some internal consistency; it cannot prove the selected department is correct. Output normalization drops unknown fields but cannot guarantee absence of sensitive text in recognized strings.

## Verification and release

The v0.1.0 verification recorded twenty automated tests and Headless Chrome checks covering desktop/mobile layout, keyboard navigation, disclosures, scrolling regions, loading/failure/retry states, and panel independence. They did not include a screen reader and do not establish full WCAG conformance. Those browser checks used intercepted synthetic live-shaped responses. The separate v2 benchmark subsequently made 144 authorized provider calls; see its results above. Additional offline tests cover its budget and evidence boundaries.

Hosted results are commit-specific; see [GitHub Actions](https://github.com/STiFLeR7/Jev-LLM-Playground/actions/workflows/checks.yml). The project uses the [MIT license](../../LICENSE), without a production-readiness guarantee.

See [validation history](../../doc/validation.md), [security](../../SECURITY.md), and [roadmap](../../doc/roadmap.md).
