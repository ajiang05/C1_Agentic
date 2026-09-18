# Weak-topic review and basic spaced repetition

[Feature index](README.md) · [MVP specification](../../mvp.md) · [Team ownership](../team-ownership.md)

## Purpose

Bring students back to concepts they struggled with in previous sessions.

## Priority and ownership

- **Priority:** Basic return-session review is core; time-based scheduling is supporting MVP.
- **Owner:** Person 6 (selection), person 7 (storage), person 2 (UI).
- **Implementation locations:** backend/src/agents/learning-manager/; backend/src/services/; frontend/src/features/journey/

## MVP behavior

- Persist weak concepts and last-reviewed timestamps.
- Choose a recommended review using a simple documented mastery rule.
- Show a review entry point on the journey screen after returning.
- Reuse the existing tutor and evaluation loop for review.
- Optionally add a due-at timestamp after persistent weak-topic review works.

## Inputs and outputs

- **Inputs:** Saved mastery, recent attempts, last-reviewed time, and available source coverage.
- **Outputs:** Recommended review concept and reason; updated review state after an attempt.

These are proposed implementation contracts. Agree on exact schemas in `shared/contracts/` with person 1 before integration.

## Dependencies and handoffs

- Learning memory survives navigation and session changes.
- Adaptive teaching selects a target.
- Lesson generation and evaluation handle the review itself.

## Acceptance criteria

- A concept missed in one session appears as a review recommendation on return.
- Starting review opens the relevant concept.
- Completing review updates mastery and review history.
- Any time-based demo simulation is clearly identified.

## Failure states and constraints

- If no concepts need review, show the normal next lesson.
- Do not recommend topics without source material.
- A low score alone must not trap a student in an endless review cycle.

## Out of scope

- Optimal spaced-repetition algorithms
- Notifications
- Calendar integration
