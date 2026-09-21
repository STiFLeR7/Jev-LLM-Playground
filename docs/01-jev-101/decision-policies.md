# The application owns the policy

The model supplies observations. The application decides whether to act.

Our existing policy is:

```text
Invalid response → error, no routing decision
Valid response:
  department = other → human review
  confidence < threshold → human review
  otherwise → suggest the selected department
```

The default threshold is 0.8. Urgency and frustration are displayed but do not alter routing. Human review is an output label here, not an implemented human workflow. No ticket is moved automatically.

Try different thresholds on a synthetic ticket:

```sh
npm run triage -- --text "I need help with a refund." --threshold 0.95
```

Without `--live`, this only previews the request. Use unit tests or saved observations to inspect deterministic policy behavior without spending API credits.

The browser application trace explains these rules and their inputs in five stages. Preview labels model-dependent stages as pending; a successful live response shows validated observations and the policy reason. The trace is application logic, not internal model reasoning, and its route remains a suggestion rather than an executed action.

[Current architecture](../02-how-it-works/architecture.md)
