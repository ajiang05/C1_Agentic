# Adaptive teaching and next-action selection

[Feature index](README.md) · [MVP specification](../../mvp.md) · [Team ownership](../team-ownership.md)

## Purpose

Change the next learning step based on performance instead of repeating generic questions.

## Priority and ownership

- **Priority:** Core MVP; primary product differentiator.
- **Owner:** Person 6 (decisions), person 5 (content), person 7 (state).
- **Implementation locations:** backend/src/agents/learning-manager/; backend/src/services/

## MVP behavior

- Select among advance, harder question, hint, reteach, and prerequisite review.
- Use explicit simple rules for the first implementation.
- Pass the chosen concept, difficulty, explanation style, and reason to the tutor.
- Return to the original concept after a prerequisite review when appropriate.

## Inputs and outputs

- **Inputs:** Evaluation, updated mastery, preferences, current concept, prerequisites, and session context.
- **Outputs:** Structured next action with target concept, teaching parameters, and a short explanation.

These are proposed implementation contracts. Agree on exact schemas in `shared/contracts/` with person 1 before integration.

## Dependencies and handoffs

- Answer evaluation supplies evidence.
- Learning memory saves updates before selecting the next action.
- Tutor generates the next teaching step.
- Lesson UI displays the change.

## Acceptance criteria

- A strong answer can increase difficulty or advance.
- A supported prerequisite gap triggers targeted review.
- The demo visibly changes explanation strategy after an incorrect answer.
- Decisions only target valid, source-supported concepts.

## Failure states and constraints

- Treat a single wrong answer as limited evidence.
- Bound automatic retries and repeated reteaching; allow the student to stop or retry.
- Do not advance progress when a dependent save or generation operation fails.

## Out of scope

- Reinforcement learning
- Sophisticated teaching-strategy optimization
