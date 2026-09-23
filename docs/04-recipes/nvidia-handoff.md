# NVIDIA text handoff

Agent Lab can now execute one text-only LLM handoff with
`nvidia/nemotron-3-super-120b-a12b`. Jev selects a route; application code retains
consent, thresholds and execution. Browser routing currently uses the deterministic
baseline, not Jev. Live Jev routing remains in the budgeted CLI.

## Run

Add `NVIDIA_NIM_API_KEY` to your ignored `.env`, then restart with `npm start`.
In Agent Lab choose **Deterministic baseline**, enter `draft: a friendly greeting`,
and check both **Allow one operation** and **Enable NVIDIA text handoff**.
Preview remains network-free regardless of checkbox state.

```powershell
node --env-file=.env agent.mjs --baseline --execute --nim --text "explain: why application code should own execution"
```

For Jev routing, use `--live --budget-usd 0.05 --out results/NEW-FILE.json`
instead of `--baseline`. This requires the existing cumulative Jev ledger.
Adding `--execute --nim` permits NVIDIA only after the validated Jev policy
selects the LLM route. Review/low-confidence gates never dispatch NVIDIA.

## Limits and evidence

- One fixed hosted endpoint and model; no SDK dependency, model fallback,
  retry, polling, tools, recursive planning or generated-code execution.
- Maximum 512 output tokens and a 30-second provider timeout.
- Nemotron thinking is disabled for this bounded text response; sampling uses
  temperature 1 and top-p 0.95 per the model's usage guidance.
- Task text leaves the machine only for an authorized provider call. Never
  submit credentials or confidential data. Keys stay server-side.
- Reports expose normalized model identity, token usage, finish reason and
  latency. `cost_usd: null` means unverified billing, not a measured zero cost.
- NVIDIA advertises free Developer Program prototyping, subject to account
  limits. The application cannot verify your entitlement or enforce provider
  billing. It does not provision paid services or fall back to them.
- An error/timeout may still consume quota. No automatic retry.
- Generated text is untrusted, rendered literally, and may be incomplete when
  `finish_reason` is `length`. This is integration evidence, not a quality benchmark.

Sources checked 2026-09-23:
[NVIDIA model and usage](https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3-super-120b-a12b),
[hosted free endpoint](https://build.nvidia.com/nvidia/nemotron-3-super-120b-a12b),
[free prototyping](https://docs.api.nvidia.com/nim/docs/run-anywhere),
[TypeSafe function calling](https://docs.typesafe.ai/cookbooks/function_calling).
