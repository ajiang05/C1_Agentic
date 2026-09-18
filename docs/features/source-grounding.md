# Source grounding and citations

[Feature index](README.md) · [MVP specification](../../mvp.md) · [Team ownership](../team-ownership.md)

## Purpose

Make lessons, questions, and feedback traceable to uploaded course material.

## Priority and ownership

- **Priority:** Core MVP success criterion.
- **Owner:** Person 4 (retrieval), person 5 (generation), person 3 (source UI).
- **Implementation locations:** backend/src/retrieval/; backend/src/agents/tutor/; frontend/src/features/lesson/

## MVP behavior

- Retrieve relevant passages for the concept before content generation.
- Attach stable source identifiers to generated content.
- Show document title, page or section when available, and the actual passage in View Source.
- Validate that returned reference identifiers belong to the supplied course sources.

## Inputs and outputs

- **Inputs:** Concept or evaluation context and extracted course passages.
- **Outputs:** Relevant passages and resolvable citations attached to generated content.

These are proposed implementation contracts. Agree on exact schemas in `shared/contracts/` with person 1 before integration.

## Dependencies and handoffs

- Ingestion preserves source locations.
- Tutor and evaluator use retrieved passages.
- Human verification uses the source viewer.

## Acceptance criteria

- View Source opens the actual uploaded passage used for the lesson.
- Source references survive a reload.
- A fabricated source identifier is rejected.
- Material without reliable page numbers uses a section or passage reference instead.

## Failure states and constraints

- Citation presence alone does not prove the explanation is correct.
- Use neutral wording such as Source attached unless a stronger verification actually occurred.
- If retrieval has insufficient evidence, return a missing-coverage state.

## Out of scope

- Internet research
- Large-scale vector infrastructure
- Automated proof of factual correctness
