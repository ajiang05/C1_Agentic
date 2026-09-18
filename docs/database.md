# Supabase database and learning memory

The database schema and memory service are implemented. The application UI, authentication middleware, evaluator, and HTTP endpoints are separate integration work. No hosted Supabase project has been configured or modified by this change.

## Apply the schema

1. Create or select a Supabase project.
2. In its SQL editor, run [`202609180001_learning_memory.sql`](../supabase/migrations/202609180001_learning_memory.sql), then [`202609180002_memory_functions.sql`](../supabase/migrations/202609180002_memory_functions.sql). Run each once. These are the canonical migration files; future changes should use new migrations.
3. Create a student through Supabase Auth, or use an existing Auth user. Anonymous Supabase Auth users can also have profiles; the unauthenticated `anon` database role has no access to learning data.
4. Copy [`.env.example`](../.env.example) to `.env` and set the project URL and service-role key on the backend only. The service reads environment variables; use your framework's environment loader or Node's `--env-file=.env` option.
5. Call `savePreferences(userId)` once to create the profile with defaults, then create the student's course through your backend. Course rows require an existing profile. No signup trigger is required.

The migrations assume the standard Supabase `auth.users`, `auth.uid()`, `anon`, `authenticated`, and `service_role` objects. They do not create an upload bucket or configure file storage; `documents.storage_path` can reference your ingestion team's chosen private storage location.

## Schema

| Table | Purpose |
| --- | --- |
| `profiles` | Auth-linked student and saved learning preferences |
| `courses` | Student-owned courses |
| `documents` | Uploaded syllabus/notes metadata and ingestion status |
| `source_passages` | Extracted text and page/section references |
| `concepts` | Ordered course concepts |
| `concept_prerequisites` | Same-course prerequisite edges |
| `concept_sources` | Supporting passages for a concept |
| `learning_content` | Versioned explanation and student-facing question |
| `question_grading` | Backend-only answer key and rubric |
| `content_sources` | Citations for a specific content version |
| `attempts` | Immutable evaluated submissions and their resulting mastery |
| `student_concept_mastery` | Current counters, score, and review timestamps |
| `content_flags` | Human feedback tied to a specific content version |

Composite foreign keys enforce consistent student and course ownership across related records. The curriculum owner must validate prerequisite cycles; the schema rejects self-dependencies but does not perform full graph validation. Regenerating a question creates a new `learning_content` ID; updates to existing content and attempts are rejected. Backend code must preserve cited passages and citation links for historical content rather than rewriting them in place.

## Service integration

Use Node 22 or newer. The service uses built-in `fetch`; no package installation is required.

```js
import { randomUUID } from 'node:crypto';
import { createLearningMemoryService } from './backend/src/services/learning-memory.mjs';

const memory = createLearningMemoryService();

// Set userId from verified server-side authentication.
await memory.savePreferences(userId, {
  example_first: true,
  explanation_length: 'short',
});

// Allocate once for a submission. Retain the ID AND evaluator result for retries.
const attemptId = randomUUID();
const evaluatedAttempt = {
  userId,
  attemptId,
  contentId,
  studentAnswer: { option_id: 'C' },
  correct: false, // Produced by the trusted evaluator, not the browser.
  feedback: 'Follow the current branch before returning to the parent.',
  misconception: 'Possible confusion about backtracking',
  relatedConceptId: callStackConceptId,
  confidence: null, // Only set when the student supplies confidence.
  isReview: false,
};
const result = await memory.recordAttempt(evaluatedAttempt);
const state = await memory.getMemory(userId, courseId);
```

For endpoint integration, verify the user's access token on the server and derive `userId` from that identity. Never accept a browser-provided user ID or correctness value as authoritative. The privileged service bypasses RLS, while the database functions still check that content and courses belong to the supplied student.

The service deliberately does not grade answers, generate lessons, or select a full adaptive teaching action. Person 6 provides the evaluation and consumes the returned memory to choose the next step. Ingestion and tutor owners create course/content records through trusted backend code before calling this service.

See [TypeScript contracts](../shared/contracts/learning-memory.d.ts) for request and response shapes. Service method names use camelCase; stored data and RPC results use snake_case.

## Memory rules

- No mastery row means **unassessed**. The UI receives `mastery_score: null` and zero attempts.
- After an evaluated answer, mastery is `(correct_attempts + 1) / (attempts + 2)`, rounded to five decimal places. One correct answer gives `0.66667`; one wrong answer gives `0.33333`. This is a simple smoothed score, not a validated probability of understanding.
- A measured score of at least `0.8` reports `completed`; other attempted concepts report `in_progress`. These statuses describe mastery, not prerequisite locking. The learning manager owns availability rules.
- A wrong answer is due for review immediately. A correct answer schedules review in one day below `0.6`, three days below `0.8`, or seven days otherwise.
- `getMemory` recommends the lowest-mastery due concept with source coverage. Unsupported or unassessed topics are excluded. A missing recommendation is `null`; the manager can continue the journey. The recommendation is advisory, not a forced loop.
- A suspected prerequisite gap is retained on the attempt but does not invent a mastery score for a concept that was not tested.
- Preferences persist and patches merge atomically. Automatic preference-weight learning is deferred.
- The snapshot includes all course concepts and the 20 most recent attempts. Full attempt history remains in the database.

## Atomicity and retries

`record_learning_attempt` locks the student's profile row, checks the submission ID, and writes the attempt and mastery update in one transaction. Concurrent requests for one student serialize. Failures roll back both writes.

Retry with the same attempt ID and identical evaluated payload. A matching retry returns the original attempt with `duplicate: true`; conflicting reuse fails with database code `22023`. The original `mastery_after` is historical; call `getMemory` for the latest state. Network timeouts can occur after a committed write, so retain the same ID and payload when retrying. Do not rerun a nondeterministic evaluator and reuse the ID with changed feedback.

Each new practice question should have its own content version. Distinct attempt IDs are distinct attempts even when the content ID matches; the calling lesson workflow controls whether another attempt is allowed.

## Access controls

All application tables enable RLS. Authenticated users can read their own records, except `question_grading`, which has no browser read grant. Unauthenticated roles cannot read learning data. Browser roles cannot write mastery, attempts, or preferences directly. The trusted backend owns writes.

The read RPC is `SECURITY INVOKER`, so authenticated calls still obey RLS. Write RPCs grant execution only to `service_role`; the default public function execution grant is explicitly revoked. Keep service-role credentials out of frontend bundles.

These choices follow Supabase's [RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security), [function privilege guidance](https://supabase.com/docs/guides/database/functions), and [service-key guidance](https://supabase.com/docs/guides/database/secure-data).

## Demo data

Use an existing Supabase Auth user and a privileged database connection:

```sh
psql "$DATABASE_URL" -v demo_user_id='<auth-user-uuid>' -f backend/src/db/seeds/demo.sql
```

The seed creates a new graph-algorithms course with source material, two concepts, one question, and its private grading key. It prints the IDs needed for service calls. It does not fabricate attempts or student performance. Re-running creates a separate demo course.

## Verification

```sh
npm test
TEST_DATABASE_URL=postgresql://localhost:55439/c1_memory_test npm run test:db
```

The database suite requires `psql` and a running local PostgreSQL server with permission to create databases and test roles. It refuses non-local URLs and database names without the `c1_memory_test` prefix. It creates a uniquely named sibling database, applies the actual migrations, runs the tests, and drops that database in cleanup. Only missing Supabase-style roles are created at the cluster level; those roles remain for later runs. Use a disposable local cluster.

The local harness supplies minimal `auth.users` and `auth.uid()` stand-ins. It tests real SQL, transactions, concurrency, permissions, and persistence, but does not claim to test hosted Supabase Auth or the live PostgREST gateway. Service HTTP behavior is covered separately with mocked responses.

Coverage includes unassessed concepts, preference merging, returning-session memory, duplicate/conflicting submissions, concurrent writes, rollback after a simulated storage failure, review timing, mastery bounds and completion, source eligibility, immutable content, and cross-student access protection.
