# Application decision trace

Status: approved by owner and implemented; locally verified on 2026-09-21. Baseline: published commit `80e99b7`. Subsequently authorized for v0.1.0 publication.

Derived from the [strategy](../../../doc/plans/Jev-LLM-Playground-Strategic-Plan.md) and [education milestone](../../../doc/roadmap.md). Companion: [evidence explorer](2026-09-21-evidence-explorer-design.md).

## Outcome and scope

A developer can inspect how the support-routing application turns validated model answers into a suggested queue. This is an application audit trail, not Jev's hidden reasoning, and it never executes a routing action.

Keep the current Node server, native browser UI, question definitions, and routing policy. No new dependencies, generic task framework, persistence, or provider calls on page load.

## Existing behavior

`requestBody` validates input; `evaluateTicket` calls Jev, normalizes through `validateResponse`, and applies `route`. The browser currently shows answers and the suggested queue. Preview constructs a request without calling Jev. The existing replay path compares the saved `decision` object exactly against `route`, so its shape must remain unchanged.

## Design decision

Add one shared `decisionTrace(data, threshold)` export alongside the current policy. It calls existing normalization and routing functions; it must not introduce a second routing implementation. Browser-only policy duplication risks drift. A general decision engine is unnecessary for this one task.

The helper returns this versioned, allowlisted application contract:

```text
schema_version: 1
policy_version: "support-routing-v1"
validation: "passed"
category: validated department choice
confidence: validated department confidence
threshold: applied numeric threshold
reason: "other_category" | "below_threshold" | "threshold_met"
decision: unchanged route result
```

Determine the reason from the returned decision: routed means `threshold_met`; review with category `other` means `other_category`; remaining review means `below_threshold`. Equality at the threshold routes unless category is `other`. Do not describe confidence as probability of correctness or urgency as department confidence.

The live HTTP response gains a sibling `trace` property derived from its normalized answers and the applied threshold. Do not add fields to `decision` or require traces in historical reports. CLI output and replay compatibility stay intact. Build the trace only after successful validation; provider or validation failures return the existing sanitized error, never a fabricated successful trace.

## Browser presentation

Render a small ordered sequence:

1. Input: the submitted snapshot, not subsequently edited text.
2. Questions: department Choice, urgent Noul, frustration Score, using existing definitions.
3. Validation: accepted normalized answers, or pending in preview.
4. Policy: category, confidence, threshold, and the explicit application reason.
5. Suggested route: queue and route/review action, clearly not an executed action.

Label modes visibly. Preview shows the request, keyword baseline, and pending model/policy stages with zero API calls; it must not manufacture a Jev response. Live shows an actual successful response. Any illustrative values in documentation must be labeled illustrative. Existing request-change clearing and pending-control locking remain.

Use semantic headings/list markup, text labels as well as color, keyboard-operable disclosures, the existing live status region, and readable narrow-screen wrapping. Render all ticket/provider-derived strings with `textContent`. Keep credentials server-side and do not persist ticket text.

## Acceptance and verification

- Tests cover threshold equality, below-threshold review, `other` review even at high confidence, and reason precedence.
- Invalid responses cannot produce a trace. Existing validation and timeout tests still pass.
- Original `route` object shape and historical replay results remain unchanged.
- Preview and initial page load make no provider calls; changing input clears stale results.
- A fake credential cannot appear in trace, static assets, or errors.
- Browser checks cover preview, fake/live-shaped success, sanitized failure, keyboard navigation, and narrow screens. Simulated responses must not be represented as live observations in screenshots.

Expected files: `playground.mjs`, `server.mjs`, existing browser assets, and existing test files. Add no new module unless implementation demonstrates a concrete need.

## Delivery gate

Review this contract before implementation. Implement and verify the trace first, then the independent recorded-result explorer. A paid live run is not required for acceptance. Publish screenshots only after checking the rendered UI and labeling their evidence source.
