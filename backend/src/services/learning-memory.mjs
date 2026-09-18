/** Server-only learning memory backed by Supabase PostgREST RPCs. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuid(value, name) {
  if (typeof value !== 'string' || !UUID.test(value)) throw new TypeError(`${name} must be a UUID`);
  return value;
}

function text(value, name, nullable = false) {
  if (nullable && value === null) return value;
  if (typeof value !== 'string') throw new TypeError(`${name} must be a string`);
  return value;
}

export class MemoryServiceError extends Error {
  constructor(message, { status = null, code = null, cause } = {}) {
    super(message, { cause });
    this.name = 'MemoryServiceError';
    this.status = status;
    this.code = code;
  }
}

/**
 * userId must come from verified server auth, never an untrusted request body.
 * This service accepts evaluator results, not grades supplied by the browser.
 * @param {{url?: string, serviceRoleKey?: string, fetchImpl?: typeof fetch, timeoutMs?: number}} options
 */
export function createLearningMemoryService({
  url = process.env.SUPABASE_URL,
  serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY,
  fetchImpl = globalThis.fetch,
  timeoutMs = 10_000,
} = {}) {
  if (!url || !serviceRoleKey) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  const base = new URL(url);
  if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw new TypeError('Invalid Supabase URL');
  }
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) throw new TypeError('timeoutMs must be a positive integer');
  const endpoint = `${base.origin}${base.pathname.replace(/\/$/, '')}/rest/v1/rpc/`;

  async function rpc(name, payload) {
    let response;
    try {
      response = await fetchImpl(`${endpoint}${name}`, {
        method: 'POST',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (cause) {
      throw new MemoryServiceError('Learning memory request failed; retry with the same attempt ID and payload', { cause });
    }
    let body;
    try { body = await response.json(); } catch {
      throw new MemoryServiceError('Learning memory returned an invalid response', { status: response.status });
    }
    if (!response.ok) {
      // Avoid propagating server details, user answers, or credentials into logs/UI.
      throw new MemoryServiceError('Learning memory operation failed', {
        status: response.status,
        code: typeof body?.code === 'string' ? body.code : null,
      });
    }
    return body;
  }

  return Object.freeze({
    /**
     * Create a profile with defaults, or atomically merge a preference patch.
     * @returns {Promise<import('../../../shared/contracts/learning-memory.d.ts').Profile>}
     */
    async savePreferences(userId, preferences = {}) {
      uuid(userId, 'userId');
      if (!preferences || Array.isArray(preferences) || typeof preferences !== 'object') {
        throw new TypeError('preferences must be an object');
      }
      const validators = {
        example_first: value => typeof value === 'boolean',
        prefers_visuals: value => typeof value === 'boolean',
        hint_before_solution: value => typeof value === 'boolean',
        explanation_length: value => ['short', 'moderate', 'detailed'].includes(value),
        preferred_session_length: value => [5, 10, 15, 20].includes(value),
      };
      for (const [key, value] of Object.entries(preferences)) {
        if (!Object.hasOwn(validators, key) || !validators[key](value)) throw new TypeError(`Invalid preference: ${key}`);
      }
      return rpc('save_learning_preferences', { p_user_id: userId, p_preferences: preferences });
    },

    /**
     * @param {import('../../../shared/contracts/learning-memory.d.ts').EvaluatedAttempt} attempt
     * @returns {Promise<import('../../../shared/contracts/learning-memory.d.ts').AttemptResult>}
     */
    async recordAttempt(attempt) {
      const {
        userId, attemptId, contentId, studentAnswer, correct,
        feedback = '', misconception = null, relatedConceptId = null,
        confidence = null, isReview = false,
      } = attempt;
      uuid(userId, 'userId'); uuid(attemptId, 'attemptId'); uuid(contentId, 'contentId');
      if (relatedConceptId !== null) uuid(relatedConceptId, 'relatedConceptId');
      if (typeof correct !== 'boolean' || typeof isReview !== 'boolean') throw new TypeError('correct and isReview must be booleans');
      if (studentAnswer === undefined || studentAnswer === null) throw new TypeError('studentAnswer is required');
      const answerJson = JSON.stringify(studentAnswer, (_key, value) => {
        if (value === undefined || typeof value === 'function' || typeof value === 'symbol'
          || (typeof value === 'number' && !Number.isFinite(value))) throw new TypeError('studentAnswer must be JSON serializable');
        return value;
      });
      if (!answerJson || answerJson === 'null') throw new TypeError('studentAnswer is required');
      if (confidence !== null && (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)) {
        throw new TypeError('confidence must be between 0 and 1');
      }
      text(feedback, 'feedback'); text(misconception, 'misconception', true);
      return rpc('record_learning_attempt', {
        p_user_id: userId, p_attempt_id: attemptId, p_content_id: contentId,
        p_student_answer: JSON.parse(answerJson), p_correct: correct,
        p_feedback: feedback, p_misconception: misconception,
        p_related_concept_id: relatedConceptId, p_confidence: confidence, p_is_review: isReview,
      });
    },

    /**
     * Reload a course's persisted profile, concepts, recent attempts, and due review.
     * @returns {Promise<import('../../../shared/contracts/learning-memory.d.ts').LearningMemory>}
     */
    async getMemory(userId, courseId) {
      return rpc('get_learning_memory', {
        p_user_id: uuid(userId, 'userId'), p_course_id: uuid(courseId, 'courseId'),
      });
    },
  });
}
