# CalmPath frontend

A responsive React + TypeScript implementation of all five supplied CalmPath screens in `stitch_neurodivergent_accessible_learning_platform/`. Uses the supplied SVG logo, locally bundled Lexend font, cream/sage surfaces, and three sensory themes.

## Run

```sh
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. No backend or credentials are needed to explore the sample course: choose **Course Upload → Try the sample course**. Sample data is clearly labeled and saved in this browser's local storage.

## Screens

- **Preferences:** learning approach, support preference, duration, explanation detail, reset, skip, and save.
- **Course Upload:** course name, file picker/drop zones, validation, replacement/removal, citation preference, API-backed journey generation, and sample entry point.
- **Learning Journey:** concept progression, locked nodes, resume, dismissible review suggestion, source inspection, preferences, and mastery summary.
- **Study Lesson:** multiple-choice or written responses, explicit submission confirmation, supportive evaluation, sample call-stack simulation, hints, follow-up lessons, source review/flagging, and pause/resume.
- **Mastery & Knowledge:** live progress, concept estimates, preferences, recent attempt history, review queue, refresh, and downloadable JSON report.

Every screen shares accessible navigation and sensory controls for Soft Day, Warm Sand, Muted Slate, reading size, reduced motion, and an optional quiet confirmation chime. Audio and motion are off by default. Dialogs trap focus, support Escape, and restore focus. Narrow layouts stack content, while the navigation remains horizontally scrollable.

## Backend connection

Vite proxies `/api` to `http://127.0.0.1:8000`. Run the existing FastAPI backend separately for real materials. Override the URL with `VITE_API_BASE_URL` in `frontend/.env.local` if needed. Never put a service-role key in frontend environment variables.

The shared client follows `shared/contracts/types.ts` and connects student creation, preference updates, upload, journey generation/loading, lessons, attempts, and progress. Upload accepts `.txt` and `.md` (up to 10 MB), matching the current backend's text-only ingestion. PDF processing is not implemented by the current ingestion service.

The UI does not silently switch to sample data when an API request fails. It keeps the current workspace and shows an actionable error. The optional existing Supabase browser configuration can pass an existing Auth session token during student creation; this change does not implement a login screen.

## Persistence and boundaries

- Preferences, sensory settings, the current lesson/answer, recent progress, and review notes persist under `calmpath.workspace.v1` in local storage.
- The sample evaluator is deterministic, with illustrative initial scores. Its calculation is disclosed under **How is this calculated?**. It is not an AI service.
- Real scores and next actions come from the backend. The current backend still uses its memory-store workflow; a frontend reload preserves the last workspace snapshot, but a backend restart may require re-uploading materials.
- Source discrepancy flags are explicitly saved locally and included in exported reports. The current API does not expose a flag-submission route, so the UI does not claim to send them to a teacher or backend.
- The four approach/support choices are retained locally. The existing API receives the supported preference booleans, explanation depth, and session length; richer teaching-strategy choices require a future contract extension.
- No fabricated streaks, XP, learning-style effectiveness percentages, or verified-source guarantees are shown as real measurements.

## Verify

```sh
npm run build
npm run test:e2e
```

Browser tests use Playwright with installed Google Chrome (`channel: chrome`). They cover the full sample loop, reload persistence, keyboard dialogs, mobile layouts, upload errors, mocked API contract integration, source flags, exports, and automated WCAG checks. The desktop render test writes screenshots under `test-results/` for visual review.
