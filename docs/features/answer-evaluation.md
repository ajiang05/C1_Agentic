# Answer evaluation

[Feature index](README.md) · [MVP specification](../../mvp.md) · [Team ownership](../team-ownership.md)

## Purpose

Evaluate an answer and identify evidence that can guide the next teaching action.

## Priority and ownership

- **Priority:** Core MVP.
- **Owner:** Person 6 (evaluation), person 3 (feedback UI).
- **Implementation locations:** backend/src/agents/evaluation/; frontend/src/features/lesson/

## MVP behavior

- Grade multiple-choice answers against the stored answer key.
- Return feedback and, when supported, a possible misconception or prerequisite gap.
- Associate evidence with existing concept identifiers.
- Produce an evaluation for the persistence service and learning manager.

## Inputs and outputs

- **Inputs:** Stored question and grading context, student answer, source passages, and relevant student history.
- **Outputs:** Correctness, feedback, possible misconception, related concept identifiers, and assessment uncertainty.

These are proposed implementation contracts. Agree on exact schemas in `shared/contracts/` with person 1 before integration.

## Dependencies and handoffs

- Lesson generation stores trusted grading context.
- Source grounding supplies supporting evidence.
- Learning memory records the attempt.
- Adaptive teaching consumes the evaluation.

## Acceptance criteria

- Known correct and incorrect demo answers receive the expected grade.
- A wrong recursion answer can produce a supported call-stack review recommendation.
- Uncertain diagnosis is expressed as a possibility.
- Re-submitting the same attempt does not create duplicate mastery updates.

## Failure states and constraints

- Do not infer guessing or confidence without evidence such as student-reported confidence.
- Do not mark an answer incorrect solely because evaluation failed.
- Do not trust a client-supplied answer key.

## Out of scope

- Comprehensive free-text grading
- Psychological diagnosis
