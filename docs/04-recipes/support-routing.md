# Recipe: support-ticket routing

**Status:** implemented as a suggestion-only local demo.

## Task and input

Given a ticket of 1–20,000 JavaScript string units, choose its main owning department. Billing covers existing payments; technical covers broken behavior; sales covers pre-purchase inquiries. Unrelated, insufficient, or equally mixed requests belong to other.

## Run

```sh
npm run triage -- --text "The integration stopped syncing."
npm start
```

Both start without a provider request. For an actual response, configure the local key and explicitly use live mode. Never use private customer data in a public demonstration.

In the browser, **Preview request** shows the five-stage trace with model-dependent stages pending. **Load recorded experiment** independently loads the saved 16-case synthetic run; its filters make no provider calls and do not submit or reset the ticket form.

## Decision and policy

Department is Choice, urgency is Noul, and frustration is Score. After validation, other or confidence below the threshold leads to human review; otherwise the selected team is suggested. API failure yields an error, not a route.

These are intended semantics, not guaranteed observations for the example sentence. Inspect the actual response before claiming its prediction.

The trace reports the submitted input snapshot, shared question definitions, validation, policy reason, and suggested route. It documents application logic, not hidden model reasoning, and does not execute the suggestion.

## Evaluation and safety

Run the keyword baseline and historical replay described in [evaluation](../03-evaluation/README.md). Department is the only labeled target. The app performs no refunds, queue updates, or tool execution.

Agent gating and document operations are future recipes. They need distinct schemas, datasets, evaluation criteria, and safety boundaries before implementation.
