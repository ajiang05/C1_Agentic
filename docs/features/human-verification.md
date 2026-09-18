# Human verification and content flagging

[Feature index](README.md) · [MVP specification](../../mvp.md) · [Team ownership](../team-ownership.md)

## Purpose

Allow a human to compare generated content against the source and flag unsupported output.

## Priority and ownership

- **Priority:** Core MVP success criterion.
- **Owner:** Person 3 (UI), person 7 (storage), person 8 (verification/demo).
- **Implementation locations:** frontend/src/features/lesson/; backend/src/services/; demo/scenarios/

## MVP behavior

- Provide View Source alongside generated content.
- Provide a flag action with a short reason.
- Store the exact content identifier or version, source references, reason, and timestamp.
- Show acknowledgment after a successful save and visibly mark the flagged item.
- Prepare a clearly labeled demo fixture with a questionable explanation for review.

## Inputs and outputs

- **Inputs:** Generated content, its citations, student or reviewer identifier, and flag reason.
- **Outputs:** Persisted content flag tied to the reviewed output.

These are proposed implementation contracts. Agree on exact schemas in `shared/contracts/` with person 1 before integration.

## Dependencies and handoffs

- Source grounding provides inspectable passages.
- Learning memory stores content and flags.
- QA supplies the verification scenario.

## Acceptance criteria

- A human can inspect a passage and flag an unsupported explanation.
- The flag remains visible after a reload.
- The flag refers to the exact output reviewed.
- The demo distinguishes human review from automated source attachment.

## Failure states and constraints

- Do not show a successful flag acknowledgment until it is saved.
- Flagging does not automatically establish the correct answer or reverse mastery.
- Keep automatic content regeneration outside the first implementation.

## Out of scope

- Professor dashboard
- Moderation queue
- Automatic correction pipeline
