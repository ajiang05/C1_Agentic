# Knowledge model and persistent memory

[Feature index](README.md) · [MVP specification](../../mvp.md) · [Team ownership](../team-ownership.md)

## Implementation

The Supabase schema, atomic attempt recording, preference storage, memory snapshots, and basic due-review recommendations are implemented. See [database setup and integration](../database.md), [the service](../../backend/src/services/learning-memory.mjs), and [contracts](../../shared/contracts/learning-memory.d.ts). Application endpoint and evaluator integration remain with their feature owners.

## Purpose

Remember attempts, concept mastery, preferences, and progression across sessions.

## Priority and ownership

- **Priority:** Core MVP.
- **Owner:** Person 7.
- **Implementation locations:** backend/src/db/; backend/src/services/

## MVP behavior

- Persist the MVP users, courses, concepts, attempts, and student-concept mastery records.
- Add document/source, generated-question, review, and content-flag records as required by the related features.
- Use a simple documented mastery-update rule, with scores bounded between zero and one.
- Record attempt identifiers so retries are idempotent.
- Persist initial preferences; updating teaching-strategy weights from later outcomes is optional.

## Inputs and outputs

- **Inputs:** Student and course identifiers, generated course data, evaluated attempts, and preference changes.
- **Outputs:** Saved learning state for lessons, journey, progress, and recommended review.

These are proposed implementation contracts. Agree on exact schemas in `shared/contracts/` with person 1 before integration.

## Dependencies and handoffs

- Person 1 coordinates schemas and request/response contracts.
- Evaluation supplies evidence; this service is the single owner of applying mastery updates.
- All student-facing features read saved state through the API.

## Acceptance criteria

- An attempt updates counts and mastery once.
- Refreshing and returning restore the same student progress.
- A failed write does not leave an attempt saved without its associated mastery update.
- New concepts display as unassessed rather than falsely implying measured mastery.

## Failure states and constraints

- Keep updates atomic where the selected database supports transactions.
- Separate records by student identifier, even when using a simple demo identity.
- Mastery is a heuristic indicator, not a validated probability of understanding.

## Out of scope

- Custom ML models
- Complex authentication
- Advanced analytics
