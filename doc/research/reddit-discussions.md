# Reddit: Jev experiments and community findings

Collected: 2026-09-21. Scope: Jev/TypeSafe and closely related decision-model experiments. Seven unique threads; summaries are paraphrases.

## Evidence and dates

All seven post bodies below were directly readable through the public web tool without login. That verifies what the authors wrote, not whether their experiments are correct. No experiment was rerun here. Comments were sometimes absent from the retrieved page; absence is not evidence that a thread had no replies.

Several pages showed relative timestamps such as minutes ago despite older search crawl dates. Publication dates are therefore not reconstructed from those labels. Where an author supplies an experiment date, it is labeled as such. All entries have the collection date above. Votes and popularity ranks are omitted.

## R1 — Classification, confidence, and out-of-scope inputs

- Community / author: r/LLMDevs, u/Artistic-Blood7501.
- [Original discussion](https://www.reddit.com/r/LLMDevs/comments/1wln54t/i_ran_a_063_classifier_over_150_intents_1000/).
- Author's stated experiment date: 2026-09-21. Search metadata instead displayed September 20; retain this discrepancy rather than treating it as a verified publication date.
- Reported setup: Jev 1.13.0; 4,500 CLINC150 in-scope examples plus 1,000 out-of-scope examples; 151 Choice options, including a fallback.
- Reported results: 89.4% overall agreement, 90.6% in-scope accuracy, 83.8% out-of-scope recall, about $0.63, and approximately 1.1-second median latency at 16 concurrent requests. Of 162 missed out-of-scope cases, 54 received an ordinary intent with confidence at least 0.9.
- The author links [results and a reproduction command](https://github.com/chr-kelly/jev-cookbook/blob/main/eval/results/clinc150_jev-1.13.0_2026-09-21.md); that page was accessible, but the harness and raw data were not audited.
- Limitation: one dataset, model version, and configuration. Headline confidence statistics do not establish reliability for each subgroup or primitive.
- Playground implication: report out-of-scope errors separately, including confidently wrong answers and the share deferred for review.

## R2 — Two agent-routing examples

- Community / author: r/LLMDevs, u/blackbarata.
- [Original discussion](https://www.reddit.com/r/LLMDevs/comments/1wihigc/tried_typesafes_new_decisiononly_model_jev_as_an/).
- Reported experiment: a personal knowledge application chose between agents using recipe transcripts. An incomplete transcript routed to a scraper; a complete one routed to a recipe agent.
- Reported latency: 145 ms and 271 ms including network time. The author explicitly says this is two examples, not an evaluation, and has not established performance under load.
- Interesting proposed uses: prefetch decisions, deciding which pages to crawl, and matching places across services.
- Playground implication: a bounded router is a small demo, but successful screenshots are insufficient. Add ambiguous inputs and realistic agent descriptions before measuring accuracy.

## R3 — Secret detection and placeholder false positives

- Community / author: r/LLMDevs, u/teyhouse.
- [Original discussion](https://www.reddit.com/r/LLMDevs/comments/1wiu1ej/typesafe_jev_secret_detection_test/).
- The author uses Noul questions on examples spanning credentials, private keys, hashes, placeholders, redacted values, and public values. The post links [jev-secret-detection](https://github.com/teyhouse/jev-secret-detection); recorded as a project lead, not audited here.
- A visible comment by u/thecorruptvan asks about false positives on placeholders and redactions. The author replies that 16 of approximately 17 such examples were correct and notes sensitivity to comments and filenames.
- Limitation: a very small subset and author-reported consistency; the post explicitly frames this as experimentation rather than production use.
- Playground implication: compare synthetic secret-like strings with a deterministic scanner, separating recall from false positives. Never send this workspace's real `.env` or key as a test sample.

## R4 — Gateway integration and silent fallback failures

- Community / author: r/hermesagent, u/PoppaBear1950.
- [Original discussion](https://www.reddit.com/r/hermesagent/comments/1wlfgg0/what_i_measured_calling_jev_typesafes_decision/).
- Author's stated measurement date: 2026-09-20; publication timestamp not independently established.
- The author reports 239–430 ms decisions via OpenRouter, alongside difficulty finding the correct route and model identifier. These are gateway-specific observations, not our verified API instructions.
- Two useful failure reports: reading a nonexistent probability object from Noul silently defaulted to zero; catching every exception and returning the first allowed choice converted API failures into plausible decisions.
- The post also describes review inputs missing untracked files and becoming polluted by generated logs.
- Limitation: one machine and a changing gateway interface. Do not copy endpoint or alias claims into the official API notes without checking current provider documentation.
- Playground implication: distinguish a model answer from an unavailable service or policy fallback. Test malformed responses and errors explicitly.

## R5 — Doom controllers compared on small repeated trials

- Community / author: r/LocalLLaMA, u/shniydder.
- [Original discussion](https://www.reddit.com/r/LocalLLaMA/comments/1wl1yzq/i_gave_jev_laya_finetuned_modernce_and_qwen35_the/).
- Reported setup: Jev, Laya, fine-tuned ModernCE, and fine-tuned Qwen3.5-4B; eight seeds per controller per scenario, with 30-second episode caps. A deterministic adapter turns visible game-state data into text; this is not direct image understanding.
- Reported Jev results: 5.63 mean kills in Defend the Center, 13.03 seconds mean survival in Health Gathering, and 117.3/199.8 ms p50/p95 call latency.
- Caveats supplied by the author: videos contain selected episodes; latency uses a separate set of shared synthetic scenes; local models run on a DGX Spark while Jev includes a hosted round trip. Gameplay trajectories diverge after the first action.
- Playground implication: if we later add a game, preserve seeds, distinguish gameplay outcomes from isolated call timings, and document observation preprocessing.

## R6 — Decision Lab: an independent local-model experiment

- Community / author: r/SideProject, u/Glad-Bend6933.
- [Original discussion](https://www.reddit.com/r/SideProject/comments/1wk08l6/i_tried_jevstyle_typed_decisions_with_a_350m/).
- The author describes a separate 350M browser model inspired by Jev, not TypeSafe's model or weights. [Linked project](https://github.com/khalilelghoul01/decision-lab), not audited here.
- Reported results differ sharply by test: 83% on 1,600 held-out public examples versus 59.6% field accuracy and 19% fully correct records on a workflow suite.
- Reported warm latency is 92–148 ms for four fields on an M4 Mac mini; cold loading and shader compilation are separate costs.
- Playground implication: measure complete workflow success and cross-field consistency, not only individual labels. Do not cite these scores as Jev performance.

## R7 — Von: local alternative claims to investigate

- Community / author: r/LocalLLaMA, u/wFXx.
- [Original discussion](https://www.reddit.com/r/LocalLLaMA/comments/1wkpxn6/von_opensource_395m_system_one_model/).
- The author presents a separate 395M model as a Jev-compatible alternative, claiming CPU operation with 1–2 GB memory and 25–300 ms responses. The claim of beating Jev across benchmarks is unverified here; the retrieved post does not establish a general comparison.
- Leads: [project repository](https://github.com/wfzyx/von) and [model page](https://huggingface.co/wfzyx/von-1.0), linked by the post but not audited in this pass.
- Playground implication: an optional future baseline if the dataset, question semantics, and measurement conditions can be matched. Compatibility does not imply identical behavior or calibration.

## What this adds to our plan

Our synthesis: routing remains a practical first demo. The more valuable follow-up is testing when it should abstain. Include out-of-scope examples, explicit service failures, and workflow-level correctness in the evaluation. The reports above are research leads, not deployment endorsements or representative Reddit sentiment.

No Reddit account was used; nothing was posted, voted on, or messaged. No X sources were needed for this collection.
