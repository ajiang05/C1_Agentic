# Learning journey

[Feature index](README.md) · [MVP specification](../../mvp.md) · [Team ownership](../team-ownership.md)

## Purpose

Show students what to study next and how far they have progressed.

## Priority and ownership

- **Priority:** Core MVP.
- **Owner:** Person 2 (UI), person 6 (recommendations), person 7 (progress).
- **Implementation locations:** frontend/src/features/journey/; backend/src/agents/learning-manager/

## MVP behavior

- Render an ordered path with available, in-progress, completed, and locked states.
- Open an available concept in the lesson screen.
- Display a recommended weak-topic review when one exists.
- Use saved progression and backend decisions as the source of truth.

## Inputs and outputs

- **Inputs:** Course concepts, prerequisite relationships, saved progress, and recommended next action.
- **Outputs:** Selected concept or review request sent to the lesson workflow.

These are proposed implementation contracts. Agree on exact schemas in `shared/contracts/` with person 1 before integration.

## Dependencies and handoffs

- Curriculum generation supplies the path.
- Learning memory supplies persisted progress.
- Adaptive teaching and review supply recommendations.

## Acceptance criteria

- A generated course renders without a custom graph visualization.
- Selecting a concept opens its lesson.
- Returning after an attempt reflects updated progress.
- Unavailable topics clearly explain their prerequisite or missing-material status.

## Failure states and constraints

- Show a useful empty state before a course is generated.
- Keep loading and failure states distinct from an empty course.

## Out of scope

- Animated dependency graph
- XP, streaks, and achievements
