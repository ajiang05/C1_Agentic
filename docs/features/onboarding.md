# Onboarding and initial preferences

[Feature index](README.md) · [MVP specification](../../mvp.md) · [Team ownership](../team-ownership.md)

## Purpose

Initialize how the tutor presents lessons from a short student questionnaire.

## Priority and ownership

- **Priority:** Supporting MVP; use default preferences if skipped.
- **Owner:** Person 2 (UI), person 7 (storage).
- **Implementation locations:** frontend/src/features/onboarding/; backend/src/services/

## MVP behavior

- Ask about examples versus explanations, session length, explanation detail, and hints.
- Allow skipping with sensible defaults.
- Save preferences for the current demo student before starting a lesson.

## Inputs and outputs

- **Inputs:** Student identifier and questionnaire answers.
- **Outputs:** Persisted learning preferences consumed by the tutor; preferences are initial hypotheses.

These are proposed implementation contracts. Agree on exact schemas in `shared/contracts/` with person 1 before integration.

## Dependencies and handoffs

- Learning memory provides preference storage.
- Tutor reads saved preferences when generating a lesson.

## Acceptance criteria

- Selected preferences survive a refresh.
- Skipping still permits upload and lessons.
- Two different preference profiles can produce different presentations of the same concept.

## Failure states and constraints

- Show a retry state if saving fails; do not claim preferences were saved.
- Do not present stated preferences as proven learning effectiveness.

## Out of scope

- Detailed learner profiling
- Complex authentication
