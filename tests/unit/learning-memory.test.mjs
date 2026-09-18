import test from 'node:test';
import assert from 'node:assert/strict';
import { createLearningMemoryService, MemoryServiceError } from '../../backend/src/services/learning-memory.mjs';
const userId = '00000000-0000-0000-0000-000000000001';
const courseId = '00000000-0000-0000-0000-000000000002';
const contentId = '00000000-0000-0000-0000-000000000003';
const attemptId = '00000000-0000-0000-0000-000000000004';
function mock(body = {}, status = 200) {
  const calls = [];
  const service = createLearningMemoryService({ url: 'https://example.supabase.co/', serviceRoleKey: 'test-secret',
    fetchImpl: async (url, options) => { calls.push({ url, ...options, body: JSON.parse(options.body) });
      return new Response(JSON.stringify(body), { status }); } });
  return { service, calls };
}
test('recordAttempt preserves the idempotency key and evaluator payload in one RPC', async () => {
  const expected = { duplicate: false, attempt: { id: attemptId } };
  const { service, calls } = mock(expected);
  const result = await service.recordAttempt({ userId, attemptId, contentId, studentAnswer: { choice: 'B' }, correct: false });
  assert.deepEqual(result, expected);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://example.supabase.co/rest/v1/rpc/record_learning_attempt');
  assert.equal(calls[0].body.p_attempt_id, attemptId);
  assert.equal(calls[0].body.p_correct, false);
  assert.deepEqual(calls[0].body.p_student_answer, { choice: 'B' });
  assert.equal(calls[0].headers.Authorization, 'Bearer test-secret');
});
test('preferences merge is delegated atomically and reads carry both ownership IDs', async () => {
  const { service, calls } = mock();
  await service.savePreferences(userId, { example_first: false });
  await service.getMemory(userId, courseId);
  assert.deepEqual(calls[0].body.p_preferences, { example_first: false });
  assert.deepEqual(calls[1].body, { p_user_id: userId, p_course_id: courseId });
});
test('invalid inputs never reach the database', async () => {
  const { service, calls } = mock();
  for (const preferences of [null, [], { arbitrary: true }, { explanation_length: null }, { preferred_session_length: 9 }]) {
    await assert.rejects(service.savePreferences(userId, preferences), TypeError);
  }
  const valid = { userId, attemptId, contentId, studentAnswer: 'B', correct: false };
  for (const patch of [{ correct: 'false' }, { confidence: NaN }, { confidence: 2 }, { studentAnswer: null },
    { studentAnswer: { value: Infinity } }, { relatedConceptId: 'invalid' }, { isReview: 1 }]) {
    await assert.rejects(service.recordAttempt({ ...valid, ...patch }), TypeError);
  }
  await assert.rejects(service.getMemory('invalid', courseId), TypeError);
  assert.equal(calls.length, 0);
});
test('database errors preserve status/code without exposing server details', async () => {
  const { service } = mock({ code: '22023', message: 'private answer and credentials' }, 400);
  await assert.rejects(service.getMemory(userId, courseId), error => {
    assert.ok(error instanceof MemoryServiceError);
    assert.equal(error.status, 400); assert.equal(error.code, '22023');
    assert.ok(!error.message.includes('private')); return true;
  });
});
test('network failures remain failures, never successful writes', async () => {
  const service = createLearningMemoryService({ url: 'https://example.supabase.co', serviceRoleKey: 'secret',
    fetchImpl: async () => { throw new Error('offline'); } });
  await assert.rejects(service.getMemory(userId, courseId), MemoryServiceError);
});
test('non-JSON responses fail clearly', async () => {
  const service = createLearningMemoryService({ url: 'https://example.supabase.co', serviceRoleKey: 'secret',
    fetchImpl: async () => new Response('Bad gateway', { status: 502 }) });
  await assert.rejects(service.getMemory(userId, courseId), error => error.status === 502);
});
