# Discovery-first quality rubric

Use this rubric on every question. A high-risk failure blocks completion.

## 1. Need before name

- Can a learner understand the opening without knowing the target term?
- Does the game situation naturally require the concept?
- Is the game example the cause of the problem rather than decorative flavor?

High risk: the title contains the answer, unexplained subsystem jargon, or a contrived misuse such as a float currency ledger.

## 2. Invention chain

The sequence must contain all of these links:

1. familiar working method;
2. concrete new requirement;
3. learner prediction;
4. attempted method;
5. visible failure;
6. next idea motivated by that failure;
7. formal name;
8. actual implementation;
9. cost and boundary;
10. game-engineering choice.

High risk: any arrow requires the learner to accept a fact that has not been demonstrated.

## 3. Representation integrity

- Keep count, measurement, unit, bit, byte, field, and value distinct.
- Identify whether a displayed number is stored, decoded, derived, rounded, or illustrative.
- When a value is split across fields, show the reconstruction equation.
- Label stored fraction bits separately from effective significand precision.
- Use actual widths after introducing a real format; any reduced width must be labeled as an intentional experiment.

High risk: a toy decimal digit count silently replaces a real binary field width.

## 4. Misconception audit

Ask after every stage:

> What incorrect structure could a careful learner infer from only this screen?

Write down at least three likely misconceptions and ensure a later action disproves each one.

Examples:

- “The exponent stores the significant digits.”
- “The 2–4 bit slider is another field inside the 23-bit fraction.”
- “A notification remembers an event.”
- “Lock-free means faster.”
- “Virtual memory means the bytes are already resident.”

## 5. Interaction quality

- The learner makes a prediction or choice.
- The chosen variable is the actual cause being taught.
- The visual state changes spatially, numerically, or temporally.
- The result names the invariant that held or broke.
- Direct step buttons and previous/next remain synchronized.
- Revisiting a step does not invent contradictory state.

High risk: controls only replace text or replay a fixed animation.

## 6. Topic-specific visual form

Choose the mechanism, not a theme:

- representation: editable bits, number line, reconstruction;
- cache: addresses, lines, transfers, reuse distance;
- concurrency: interleaving, ownership, waits, linearization point;
- OS: queues, pages, handles, process boundaries;
- networking: packets, clocks, loss, ordering, ownership transfer;
- algorithms: state space, work growth, invariants, counterexample;
- profiling: timelines, distributions, causal interventions.

High risk: the same node-and-arrow scene is reskinned for unrelated concepts.

## 7. Completion test

A lesson is complete only if a learner can answer:

1. What problem existed before this concept?
2. Why did the simpler method fail?
3. What parts does the solution store or control?
4. How do those parts produce the observed result?
5. What does the solution sacrifice?
6. When would a game programmer not use it?

