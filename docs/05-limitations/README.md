# Limitations

## Evidence

The saved 16-ticket run is public, synthetic, English-language, and department-labeled only. It does not establish population accuracy, calibration, non-English performance, or prompt-injection resistance. Four review outcomes are not evidence that low-confidence gating works on real traffic.

The first live pass was not retained in full. Only the second pass supports the published aggregate; repeat consistency cannot be recovered from it. Recorded latency includes local/network conditions and is not a provider SLA.

## Implementation

Only one task, one baseline, one-attempt evaluation, and the current question/policy replay contract are supported. The app has no production action queue, user authentication, hosted rate control, automatic retries, or general-purpose LLM comparison.

Response validation protects data shape and checks some internal consistency; it cannot prove the selected department is correct. Output normalization drops unknown fields but cannot guarantee absence of sensitive text in recognized strings.

## Verification and release

Twenty automated tests pass in the recorded local environment. Headless Chrome checks covered desktop/mobile layout, keyboard navigation, disclosures, scrolling regions, loading/failure/retry states, and panel independence. They did not include a screen reader and do not establish full WCAG conformance. Synthetic interception exercised live-shaped and failure states; no new live model evaluation was run.

Hosted results are commit-specific; see [GitHub Actions](https://github.com/STiFLeR7/Jev-LLM-Playground/actions/workflows/checks.yml). The project uses the [MIT license](../../LICENSE), without a production-readiness guarantee.

See [validation history](../../doc/validation.md), [security](../../SECURITY.md), and [roadmap](../../doc/roadmap.md).
