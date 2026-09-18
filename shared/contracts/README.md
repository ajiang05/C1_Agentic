# Shared contracts

Canonical shapes for frontend + backend. Person 1 coordinates breaking changes.

| Artifact | Purpose |
| --- | --- |
| `types.ts` | TypeScript types used by the frontend API client |
| `schemas/*.json` | JSON Schema mirrors for validation / OpenAPI later |
| `examples/*.json` | Demo-shaped payloads matching stub backend responses |

## Core domain models

- `SourceReference` — required on lesson and question responses
- `Concept`, `Lesson`, `Attempt`, `Evaluation`, `NextAction`, `StudentProgress`
- Upload / journey / attempt API envelopes

Backend Pydantic models live in `backend/src/api/schemas.py` and must stay aligned with `types.ts`.
