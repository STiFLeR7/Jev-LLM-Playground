# A decision model still needs an application policy

The interesting part of this playground is not that an API returns a department. It is the boundary between a model's answer and the program's decision to act.

Our support task has four labels: billing, technical, sales, and other. Jev answers a Choice question and supplies probabilities and confidence. The application validates the structure, then applies an ordinary rule: suggest human review for other or confidence below 0.8; otherwise suggest the selected queue. The program never moves a real ticket. The browser trace shows this application sequence, not hidden reasoning.

## Freeze the experiment before reading the answer

The first release retained a 16-ticket experiment. Its 16 correct classifications were useful integration evidence, but not a broad benchmark. The next step was a frozen 48-case test set with clear requests, negation, mixed intent, and embedded routing instructions. Eight separate development examples explain the labeling rubric. We kept the original prompts and keyword baseline unchanged.

We ran three sequential passes over the test set, preserving every response and identifying each case/pass. The result: 48/48 correct labels in every pass, versus 28/48 for keywords. These are small, authored synthetic examples. Repeating one example three times does not triple its statistical independence. [Protocol](benchmark-v2.md) · [Full results](benchmark-v2-results.md)

## Measure what the policy does

At threshold 0.8, the application suggested 108 automatic routes and 36 reviews, with no incorrect automatic routes. That sounds reassuring, but there is an important limitation: no department confidence fell below 0.8. Every review came from the other category. The experiment therefore did not show whether confidence-based abstention catches incorrect answers.

Replaying fixed higher thresholds increased reviews without preventing any additional mistakes, because this run had no mistakes to prevent. We should not select a production threshold from that result. We need errors, ambiguous cases, and explicit consequences to evaluate that trade-off.

Likewise, unchanged categories are not unchanged model outputs. The selected department and suggested queue were stable for all 48 cases, but the full answer objects varied for 40 cases. A useful consistency report states exactly which fields it compares.

## Make spending a precondition, not an afterthought

The authorized ceiling was five US cents. A post-run token total is not enough to enforce a budget: the request may already have spent the money, and a timeout may still be billed.

The runner reserves the documented maximum input cost before dispatch. Its append-only ledger synchronizes that reservation to disk, replaces it with actual usage only after a valid response, and retains the full reservation after a failure. A local lock prevents overlapping runs from spending the same allowance. A failed write disables more requests; no automatic retry silently multiplies costs.

The completed run reported 76,146 input tokens, or USD 0.003198132 at the checked rate. All 144 settlements reconciled with the saved observations. That is a transparent pricing estimate, not a provider invoice or an account-wide spending limit.

## Keep claims narrower than the evidence

The code and tests establish an application contract: validate responses, enforce a local spending guard, record outcomes, and recompute metrics offline. The live observations establish behavior on these specific synthetic inputs under these recorded conditions.

Neither establishes production reliability, calibrated confidence, or immunity to malicious instructions. The next useful contribution is an independently reviewed and harder dataset—not a more impressive headline or a threshold adjusted after inspecting this test set.

Try the analysis without credentials:

```sh
npm test
node benchmark.mjs --replay doc/results/benchmark-v2-live-2026-09-21.json
```
