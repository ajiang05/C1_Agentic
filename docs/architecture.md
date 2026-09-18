# Architecture

## End-to-end pipeline

```text
Upload (Storage) → Ingestion → Curriculum (1× LLM)
       → Journey → Retrieval → Tutor (1× LLM)
       → Answer → Evaluation (1× LLM)
       → services.apply_mastery (no LLM)
       → Learning Manager (1× LLM)
       → Progress / next lesson
```

## OpenAI stage pattern

```python
from src.llm.openai_client import complete_json, is_openai_available

def generate_*(...):
    if not is_openai_available():
        return demo_stub(...)
    # Assemble context for THIS stage only, then ONE call:
    return complete_json(system=..., user=...)
```

**Forbidden:** multi-step agent loops, tool-calling chains, or “ask the model again” retries inside a stage. Parse failures may fall back to stubs; do not re-invoke OpenAI to “fix” output in the same stage without an explicit product decision.

## Persistence

| Mode | When | Behavior |
| --- | --- | --- |
| `memory` | Missing Supabase service role env | `MemoryStore` in process |
| `supabase` | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` set | Person 7 wires table writes; Storage upload already calls the client |

Mastery updates **only** via `backend/src/services/learning.py` → store/`student_concept_mastery`.

## Auth + Storage

- **Auth:** Frontend may obtain a Supabase session (`frontend/src/lib/supabase.ts`) and pass `Authorization: Bearer <access_token>` to `POST /students`. Backend verifies via `verify_access_token`. Local demo works without Auth using opaque `student_id`.
- **Storage:** `upload_to_storage` in `backend/src/db/supabase_client.py` writes to bucket `course-materials`. Without Supabase, path is `local://…` and bytes are kept under `backend/uploads/`.

## Frontend boundary

Person 1 ships contracts + `frontend/src/lib/api.ts` (+ optional Auth helper). Feature folders under `frontend/src/features/*` are empty plug-ins for Persons 2–3. The Vite app is a health-check stub only.

## Local run topology

```text
Browser :5173  →  Vite proxy /api  →  FastAPI :8000  →  (optional) Supabase + OpenAI
```

Deployment beyond local is out of scope for this scaffold.
