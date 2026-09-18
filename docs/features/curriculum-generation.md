# Curriculum generation

[Feature index](README.md) · [MVP specification](../../mvp.md) · [Team ownership](../team-ownership.md)

## Purpose

Generate an ordered course journey from the syllabus and available notes.

## Priority and ownership

- **Priority:** Core MVP.
- **Owner:** Person 4.
- **Implementation locations:** backend/src/agents/curriculum/

## MVP behavior

- Extract a small concept set for the demo course.
- Assign stable concept identifiers, descriptions, ordering, and prerequisite identifiers.
- Associate concepts with supporting source passages.
- Distinguish syllabus topics with no teachable source coverage from available modules.

## Inputs and outputs

- **Inputs:** Extracted syllabus and notes passages.
- **Outputs:** Ordered concepts with prerequisite relationships and source references.

These are proposed implementation contracts. Agree on exact schemas in `shared/contracts/` with person 1 before integration.

## Dependencies and handoffs

- Course upload supplies readable source material.
- Learning memory saves concepts.
- Journey and tutor consume the generated curriculum.

## Acceptance criteria

- The graph-algorithms demo yields a usable sequence of concepts.
- Prerequisites reference existing concepts and contain no cycles.
- Only concepts with source coverage are available for generated lessons.

## Failure states and constraints

- Validate generated structure before saving.
- On invalid or empty output, provide a retryable error rather than a broken journey.

## Out of scope

- Perfect prerequisite inference
- Multi-course planning
- Exam-based scheduling
