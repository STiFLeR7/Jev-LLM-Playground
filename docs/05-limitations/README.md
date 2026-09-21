# Limitations

## Evidence

The saved 16-ticket run is public, synthetic, English-language, and department-labeled only. It does not establish population accuracy, calibration, non-English performance, or prompt-injection resistance. Four review outcomes are not evidence that low-confidence gating works on real traffic.

The first live pass was not retained in full. Only the second pass supports the published aggregate; repeat consistency cannot be recovered from it. Recorded latency includes local/network conditions and is not a provider SLA.

## Implementation

Only one task, one baseline, one-attempt evaluation, and the current question/policy replay contract are supported. The app has no production action queue, user authentication, hosted rate control, automatic retries, or general-purpose LLM comparison.

Response validation protects data shape and checks some internal consistency; it cannot prove the selected department is correct. Output normalization drops unknown fields but cannot guarantee absence of sensitive text in recognized strings.

## Verification and release

Fourteen automated tests pass in the recorded local environment. Browser visual, keyboard, mobile, and assistive-technology checks remain pending. Hosted CI must be verified from actual runs. No license or production-readiness guarantee is supplied.

See [validation history](../../doc/validation.md), [security](../../SECURITY.md), and [roadmap](../../doc/roadmap.md).
