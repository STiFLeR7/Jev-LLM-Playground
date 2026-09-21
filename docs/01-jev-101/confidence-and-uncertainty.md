# Confidence and uncertainty

TypeSafe's Choice and Score confidence is computed from the answer's probability distribution. It is not necessarily the selected option's probability. Noul has no separate confidence field. [Official confidence guide](https://docs.typesafe.ai/confidence)

In this app, department confidence below 0.8 leads to human review. A result of exactly 0.8 passes that gate, but `other` always goes to review.

The threshold is an application choice, not a demonstrated safety boundary. To evaluate it, use labeled cases spanning clear, ambiguous, incomplete, and misleading inputs. Compare automatic-route errors and coverage across thresholds on development data, then freeze a policy for testing.

The historical run does not establish calibration: all department confidence values were 0.91 or higher. Its four reviews came from the `other` rule, not low confidence.

Avoid saying “confidence 0.9 means 90% correct” without evidence from the relevant task and metric definition. Show distributions and actual errors alongside confidence.

See [benchmark limits](../../doc/decision-bench.md).
