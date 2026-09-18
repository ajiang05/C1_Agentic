# Adaptive AI Study Journey

Turn a student's syllabus and course notes into a personalized learning journey that adapts to their answers and remembers their progress.

See [the MVP specification](mvp.md) for product scope and [team ownership](docs/team-ownership.md) for the eight-person split.

See [feature documentation](docs/features/README.md) for each feature's scope, ownership, inputs and outputs, dependencies, and acceptance criteria.

## Project structure

```text
frontend/
  public/                  Static assets
  src/
    features/
      onboarding/          Initial learning preferences
      course-upload/       Syllabus and notes upload
      journey/             Course path and recommended reviews
      lesson/              Questions, feedback, sources, and flagging
      progress/            Student mastery overview
    components/            Reusable UI components
    lib/                   API client and frontend helpers
backend/
  src/
    api/                     HTTP endpoints and request validation
    agents/
      curriculum/            Concepts, prerequisites, and course ordering
      tutor/                 Grounded lessons, questions, and hints
      evaluation/            Answer evaluation and possible misconceptions
      learning-manager/      Next action, difficulty, and review decisions
    ingestion/               Extract text and preserve source locations
    retrieval/               Select source passages for agent requests
    services/                Learning workflow and persistence operations
    db/
      migrations/            Database schema changes
      seeds/                 Development and demo seed data
supabase/
  migrations/                Canonical Supabase schema and memory functions
shared/
  contracts/                 API schemas and example request/response data
tests/
  unit/                      Memory service validation and RPC behavior
  integration/               Agent, API, and persistence integration checks
  e2e/                       Complete student workflow checks
demo/
  materials/                 Sample syllabus and course notes
  scenarios/                 Demo scripts and expected outcomes
docs/                        Architecture and team coordination
```

The Supabase schema and Node learning-memory service are implemented. See [database setup and usage](docs/database.md). The frontend and remaining backend features are still scaffolds. Empty directories contain `.gitkeep` files so Git tracks them; remove those files when adding implementation files.

## Implementation boundaries

- Run the four logical agents as modules in one backend for the MVP.
- Agree on API contracts in `shared/contracts/` before connecting the frontend and backend. Include source references in generated lesson and question responses.
- Keep ingestion and source retrieval separate from lesson generation.
- Let evaluation and the learning manager propose updates; apply mastery and preference updates through one persistence service in `backend/src/services/`.
- Store user-uploaded files in runtime storage, not in `demo/materials/`. Use that folder only for intentionally shared sample materials.

The first working flow should be: upload materials → generate journey → open lesson → answer question → adapt teaching → save progress → return for review.
