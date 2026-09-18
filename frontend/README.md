# Frontend (Persons 2–3)

Person 1 provides:

- Typed API client: `src/lib/api.ts`
- Optional Supabase Auth helper: `src/lib/supabase.ts`
- Contracts: `../shared/contracts/types.ts` (alias `@contracts/*`)
- Empty feature folders under `src/features/*` for you to implement

Person 1 does **not** own screens. The Vite app is a health-check stub only.

## Call the API

```ts
import { api } from "./lib/api";
import type { SubmitAttemptRequest } from "@contracts/types";

const health = await api.health();
const student = await api.createStudent("Ada");
const uploaded = await api.uploadCourse({ studentId, courseName, syllabus, notes });
const { journey } = await api.generateJourney(courseId, studentId);
const lesson = await api.getLesson(courseId, conceptId, studentId);
const result = await api.submitAttempt({ ... } satisfies SubmitAttemptRequest);
```

Base URL: `VITE_API_BASE_URL` (default `/api/v1` via Vite proxy to `:8000`).

See root [README.md](../README.md) for the full endpoint table and backend run instructions.
