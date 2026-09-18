# Adaptive AI Study Journey

Turn a student's syllabus and course notes into a personalized learning journey that adapts to their answers and remembers their progress.

See [mvp.md](mvp.md), [docs/architecture.md](docs/architecture.md), and [docs/team-ownership.md](docs/team-ownership.md).

## Stack (locked)

| Layer | Choice |
| --- | --- |
| Frontend | Vite + React + TypeScript SPA (**Persons 2–3**) |
| Backend | FastAPI (Python) (**Person 1 + 4–7**) |
| Data | Supabase Auth + Postgres + Storage |
| LLM | OpenAI API only |

**Local-only for now** — no cloud deploy wiring in this scaffold.

## Ownership split (important)

| Who | Owns | Does not own |
| --- | --- | --- |
| **Person 1** | `shared/contracts/`, `backend/src/api/`, integration workflow, Supabase schema/Auth/Storage wiring, OpenAI one-shot helper, local run docs, thin `frontend/src/lib/` API client | Feature screens / polished React UI |
| **Persons 2–3** | All UI under `frontend/src/features/` and `frontend/src/components/` | Changing API contracts without Person 1 |

Frontend people consume contracts + `api` client; they build onboarding, upload, journey, lesson, and progress screens.

## One-shot-per-stage LLM rule

Each pipeline stage makes **exactly one** OpenAI completion:

1. Assemble that stage's context pack + prompt
2. Call `complete_json` / `complete_model` once (`backend/src/llm/openai_client.py`)
3. Parse structured JSON

Agent modules (`curriculum`, `tutor`, `evaluation`, `learning-manager`) must **not** chain LLM calls, tool loops, or re-prompts inside a stage. When `OPENAI_API_KEY` is missing, agents return demo-shaped stubs so the E2E backend path still runs.

## Project structure

```text
frontend/          Vite stub + lib/api client; features/* empty for Persons 2–3
backend/           FastAPI + agents + services (People 1, 4–7)
shared/contracts/  Shared TS types + JSON Schema (Person 1)
tests/             Integration + e2e (Person 8)
demo/              Sample materials + scenarios (Person 8)
docs/              Architecture + ownership
```

## Quick start (local)

### 1. Backend (Person 1 path — required for the pipeline)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # add OPENAI_API_KEY / SUPABASE_* when ready
uvicorn src.main:app --reload --port 8000
```

Health: [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)

Run uvicorn from the `backend/` directory so `src` imports resolve.

### 2. Frontend stub (optional; Persons 2–3 replace UI)

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

App: [http://127.0.0.1:5173](http://127.0.0.1:5173) — stub only calls `GET /health` via `src/lib/api.ts`. Vite proxies `/api` → `:8000`.

### 3. Supabase (optional for first demo)

Without Supabase keys the API uses **in-memory** persistence and local `backend/uploads/`.

With a cloud (or local) Supabase project:

1. Create a project at [supabase.com](https://supabase.com) (or `supabase start` locally)
2. Run `backend/src/db/migrations/001_core_schema.sql` in the SQL editor
3. Ensure Storage bucket `course-materials` exists
4. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`
5. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` in `frontend/.env` for Auth (Persons 2–3)

### 4. Smoke the backend flow (curl / API client)

Use `demo/materials/sample_syllabus.txt` + `sample_notes.txt`:

1. `POST /api/v1/students`
2. `POST /api/v1/courses/upload` (multipart)
3. `POST /api/v1/courses/{id}/journey`
4. `GET /api/v1/courses/{id}/lessons/{concept_id}`
5. `POST /api/v1/attempts` with answer `Queue` on the BFS stub question
6. `GET /api/v1/students/{id}/progress`

## How frontend should call the API

```ts
import { api } from "./lib/api";
import type { Lesson, SubmitAttemptRequest } from "@contracts/types";

const student = await api.createStudent("Demo Student");
const uploaded = await api.uploadCourse({
  studentId: student.student_id,
  courseName: "Graph Algorithms",
  syllabus: syllabusFile,
  notes: notesFile,
});
const { journey } = await api.generateJourney(uploaded.course_id, student.student_id);
const lesson: Lesson = await api.getLesson(
  uploaded.course_id,
  journey.current_concept_id!,
  student.student_id,
);
const result = await api.submitAttempt({
  student_id: student.student_id,
  course_id: uploaded.course_id,
  concept_id: lesson.concept_id,
  question_id: lesson.question.id,
  question_prompt: lesson.question.prompt,
  student_answer: "Queue",
} satisfies SubmitAttemptRequest);
```

- Types: `shared/contracts/types.ts` (import via `@contracts/types`)
- Client: `frontend/src/lib/api.ts`
- Optional Auth: pass Bearer token from `frontend/src/lib/supabase.ts` into `api.createStudent`
- Env: `VITE_API_BASE_URL` (see `frontend/.env.example`)

Do **not** invent response shapes — extend contracts with Person 1 if needed.

## API surface (`/api/v1`)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness + persistence/openai flags |
| POST | `/students` | Create student (optional `Authorization: Bearer` Auth JWT) |
| PUT | `/students/{id}/preferences` | Onboarding preferences |
| POST | `/courses/upload` | Multipart syllabus + notes → Storage |
| POST | `/courses/{id}/journey` | Curriculum stage → journey |
| GET | `/courses/{id}/journey` | Read journey |
| GET | `/courses/{id}/lessons/{concept_id}` | Tutor stage → lesson |
| POST | `/attempts` | Evaluate → persist mastery → next action |
| GET | `/students/{id}/progress` | Mastery overview |

Contracts: `shared/contracts/types.ts` ↔ `backend/src/api/schemas.py`.

## Who plugs in where

| Person | Plug points |
| --- | --- |
| 1 Tech lead | Root config, `backend/src/api/`, `shared/contracts/`, Auth/Storage wiring, `frontend/src/lib/` |
| 2 Journey FE | `frontend/src/features/{onboarding,course-upload,journey,progress}/` |
| 3 Lesson FE | `frontend/src/features/lesson/`, `frontend/src/components/` |
| 4 Ingestion + Curriculum | `ingestion/`, `retrieval/`, `agents/curriculum/` (1 OpenAI call) |
| 5 Tutor | `agents/tutor/` (1 OpenAI call; must emit `source_references`) |
| 6 Eval + Learning Manager | `agents/evaluation/`, `agents/learning-manager/` (1 call each) |
| 7 DB + memory | `db/`, `services/` — **only** place that writes mastery |
| 8 QA/demo | `tests/`, `demo/` |

## Env vars

See `backend/.env.example` and `frontend/.env.example`. Never commit `.env`.

## Implementation boundaries

- Four logical agents as modules in one backend process
- Source references required on lesson + question (+ evaluation) responses
- Ingestion/retrieval stay separate from Tutor generation
- Agents propose; `services/learning.py` applies mastery updates
- Uploaded files → Supabase Storage (or local stub path), not `demo/materials/`
