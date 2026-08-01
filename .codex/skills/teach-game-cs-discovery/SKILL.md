---
name: teach-game-cs-discovery
description: Design, rewrite, audit, and verify game-programming CS interview lessons and interactive labs so learners discover each concept from a plausible game problem before seeing terminology. Use for this portfolio's computer-science interview questions, discovery flows, simulations, explanatory visualizations, Q-series expansion, or reviews of whether a lesson teaches a correct mental model rather than merely revealing an answer.
---

# Teach Game CS Discovery

Build each lesson as a reconstruction of why the concept had to exist. Treat terminology as the final name of a role the learner has already discovered.

## Required workflow

1. Read the target question record, its lab implementation, shared renderer, and neighboring questions.
2. Write a lesson contract before editing:
   - learner's starting vocabulary;
   - plausible game pressure;
   - invariant that must survive;
   - simplest earlier solution;
   - condition that breaks it;
   - developer's next idea;
   - formal term revealed afterward;
   - actual machine representation;
   - likely false mental models;
   - final game-engineering decision.
3. Reject a premise that only exists to demonstrate the answer. Replace it with a situation where the concept is genuinely useful.
4. Create one causal interaction per inference. A step must let the learner predict, act, and observe—not merely reveal prose.
5. Keep every educational model internally consistent. When switching from a decimal toy model to actual binary storage, label the boundary and never reuse toy units as if they were real fields.
6. Reveal formal vocabulary only after its job has been experienced. Explain every field as part of one complete value and show how the parts recombine.
7. Give step navigation three routes: direct step selection, previous/next, and reset. Keep the current step visible and preserve useful state when revisiting.
8. Use a visual form specific to the mechanism. Do not reuse one diagram or animation grammar across unrelated questions.
9. Run the quality rubric in [references/quality-rubric.md](references/quality-rubric.md). Fix every high-risk misunderstanding before proceeding.
10. Run `node .codex/skills/teach-game-cs-discovery/scripts/audit_questions.mjs <repo-root>` plus syntax, DOM interaction, integration, and deployment checks.

## Batch application

For Q-series work, process in concept-coherent batches of at most ten. Do not claim a batch is redesigned merely because a shared disclosure wrapper was added.

For every question in a batch:

1. Produce a distinct lesson contract.
2. Inspect whether the existing lab proves the concept's causal mechanism.
3. Rewrite the premise, reasoning sequence, and lab where the contract is not satisfied.
4. Exercise every meaningful control and every navigation route.
5. Record the observed state change, not only the absence of JavaScript errors.
6. Commit and push only after the batch passes; verify the public files after deployment.

## Non-negotiable gates

- Do not front-load unexplained jargon, hardware limits, formulas, acronyms, or advanced subsystem names.
- Do not use an implausible game design as the premise for a valid CS concept.
- Do not call a timed diagram an interactive explanation.
- Do not mix decimal digits, binary bits, stored fraction bits, and effective precision without explicitly mapping them.
- Do not say a field stores the whole value when the value is reconstructed from multiple fields.
- Do not use arbitrary numbers without showing their source and unit.
- Do not hide missing pedagogy behind more prose.
- Do not propagate one question's visual style to all questions.
- Do not mark the series complete after only generic renderer changes.

## Verification evidence

Report:

- question and lab IDs tested;
- controls exercised and expected state changes observed;
- terminology that is absent before discovery and present afterward;
- toy-to-real representation boundary;
- direct/previous/next navigation results;
- syntax and integration errors;
- commit, push, deployment status, and public-file verification.

If browser screenshots are unavailable, state that explicitly and use DOM-level interaction checks without claiming visual verification.
