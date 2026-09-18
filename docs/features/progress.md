# Progress dashboard

[Feature index](README.md) · [MVP specification](../../mvp.md) · [Team ownership](../team-ownership.md)

## Purpose

Show what the student has practiced and why a concept is recommended next.

## Priority and ownership

- **Priority:** Basic mastery display is core; richer insights are supporting MVP.
- **Owner:** Person 2 (UI), person 7 (data), person 6 (recommendation).
- **Implementation locations:** frontend/src/features/progress/; backend/src/services/

## MVP behavior

- List course concepts with mastery indicators and unassessed states.
- Use persisted attempts and mastery rather than separate frontend calculations.
- Show the recommended next step with a short reason derived from saved evidence.
- Refresh displayed values after a completed attempt.

## Inputs and outputs

- **Inputs:** Course concepts, persisted mastery, attempt counts, and next-action recommendation.
- **Outputs:** Student-facing progress summary and entry point to study or review.

These are proposed implementation contracts. Agree on exact schemas in `shared/contracts/` with person 1 before integration.

## Dependencies and handoffs

- Learning memory supplies the data.
- Adaptive teaching supplies the recommendation.
- Journey and lesson screens link to progress.

## Acceptance criteria

- Scores match the saved backend state.
- A completed attempt is reflected after navigation or refresh.
- Unattempted concepts are clearly unassessed.
- Any insight describes observed difficulty without overstating certainty.

## Failure states and constraints

- Show an empty state for a student with no attempts.
- Identify mastery as an estimate.
- Avoid generating numerical claims that are absent from stored data.

## Out of scope

- Complex analytics
- Leaderboards
- Achievement tracking
