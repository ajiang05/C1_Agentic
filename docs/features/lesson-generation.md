# Grounded lessons and practice

[Feature index](README.md) · [MVP specification](../../mvp.md) · [Team ownership](../team-ownership.md)

## Purpose

Teach a selected concept and generate a question from the uploaded material.

## Priority and ownership

- **Priority:** Core MVP.
- **Owner:** Person 5 (Tutor Agent), person 3 (UI).
- **Implementation locations:** backend/src/agents/tutor/; frontend/src/features/lesson/

## MVP behavior

- Generate a short explanation or worked example using preferences and source passages.
- Start with multiple-choice practice; short answers are optional after the core loop works.
- Return structured lesson content, question options, and source references.
- Keep answer keys and grading context on the backend until feedback is appropriate.

## Inputs and outputs

- **Inputs:** Concept, retrieved source passages, student preferences, difficulty, and requested teaching action.
- **Outputs:** Student-facing lesson and question; server-side answer key, rubric, and source references.

These are proposed implementation contracts. Agree on exact schemas in `shared/contracts/` with person 1 before integration.

## Dependencies and handoffs

- Source grounding supplies passages.
- Onboarding or defaults supplies preferences.
- Adaptive teaching supplies difficulty and teaching action.
- Answer evaluation consumes stored question context.

## Acceptance criteria

- A student can read a lesson and submit one answer.
- The question and explanation cite available source passages.
- Changing teaching preferences changes presentation without changing the underlying facts.

## Failure states and constraints

- If sources are insufficient, report missing coverage instead of inventing material.
- Validate generated question structure before display.
- Retain student input if generation or submission fails.

## Out of scope

- All question formats
- Generated interactive diagrams
- Open-ended chat tutor
