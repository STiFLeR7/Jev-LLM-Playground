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

An application trace should explain these rules and their inputs. It must not invent internal model reasoning or claim an action was executed. The browser trace is planned; current live output includes a suggested route and normalized JSON.

[Current architecture](../02-how-it-works/architecture.md)
