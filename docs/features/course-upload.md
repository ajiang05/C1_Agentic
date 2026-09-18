# Course upload and ingestion

[Feature index](README.md) · [MVP specification](../../mvp.md) · [Team ownership](../team-ownership.md)

## Purpose

Turn a syllabus and one set of notes into readable, traceable source material.

## Priority and ownership

- **Priority:** Core MVP.
- **Owner:** Person 2 (UI), person 4 (ingestion), person 7 (storage).
- **Implementation locations:** frontend/src/features/course-upload/; backend/src/ingestion/; backend/src/db/

## MVP behavior

- Provide separate syllabus and course-notes upload fields.
- For the initial implementation, support text-based PDFs and plain text; document actual supported formats in the UI.
- Extract text while preserving document and page or section references.
- Store document metadata and extracted passages for curriculum generation and retrieval.

## Inputs and outputs

- **Inputs:** Course identifier, syllabus file, and notes file.
- **Outputs:** Document records and source passages with stable identifiers and available page or section locations.

These are proposed implementation contracts. Agree on exact schemas in `shared/contracts/` with person 1 before integration.

## Dependencies and handoffs

- Learning memory stores document metadata.
- Curriculum generation and source grounding consume extracted passages.

## Acceptance criteria

- A sample syllabus and notes produce nonempty extracted text.
- Extracted passages can be traced to the original document.
- The UI shows processing, success, and failure states.

## Failure states and constraints

- Reject unsupported or unreadable files with an actionable message.
- Scanned PDFs requiring OCR are outside initial scope.
- A syllabus topic without corresponding notes must not become a fabricated lesson.

## Out of scope

- OCR
- Full textbook ingestion
- Slides, homework, and practice-exam import
