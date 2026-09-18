# Team ownership

| Person | Role | Primary folders |
| --- | --- | --- |
| 1 | Tech lead, integration, deployment | Root app configuration, `backend/src/api/`, `shared/contracts/` |
| 2 | Course journey frontend | `frontend/src/features/onboarding/`, `course-upload/`, `journey/`, `progress/` |
| 3 | Lesson frontend | `frontend/src/features/lesson/`, `frontend/src/components/` |
| 4 | Ingestion and Curriculum Agent | `backend/src/ingestion/`, `backend/src/retrieval/`, `backend/src/agents/curriculum/` |
| 5 | Tutor Agent | `backend/src/agents/tutor/` |
| 6 | Evaluation and Learning Manager | `backend/src/agents/evaluation/`, `backend/src/agents/learning-manager/` |
| 7 | Database and learning memory | `backend/src/db/`, `backend/src/services/` |
| 8 | QA, demo, human verification | `tests/`, `demo/` |

Feature folder names abbreviated in person 2's row are all under `frontend/src/features/`.

## Handoffs

1. Agree on concept, source reference, lesson, attempt, evaluation, next-action, and student-progress contracts. Person 1 coordinates changes to these contracts.
2. Person 4 supplies concepts and source passages to person 5. Person 5 supplies questions and their grading context to person 6.
3. Person 6 returns an evaluation and next action. Person 7 owns the service that records attempts and applies mastery updates.
4. People 2 and 3 use the same API client in `frontend/src/lib/`; coordinate shared component changes with person 3.
5. Person 8 prepares sample materials early, verifies the end-to-end flow, and checks that source inspection and human flagging work with person 3 and the backend owners.

Each owner validates their own component. Person 1 owns integration across components; person 8 owns the demo acceptance checks.
