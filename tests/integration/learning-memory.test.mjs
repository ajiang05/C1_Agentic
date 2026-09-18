import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
const exec = promisify(execFile);
const ids = Object.fromEntries(['user','other','course','otherCourse','concept','prerequisite','unsupported','doc','passage','content','otherConcept','otherContent'].map((name, i) => [name, `00000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`]));
const attemptId = n => `10000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const quote = value => `'${String(value).replaceAll("'", "''")}'`;

// Real PostgreSQL tests. Never run migrations against the supplied database:
// create a uniquely named disposable sibling database and delete only that sibling.
test('Supabase schema and persistent learning memory', { timeout: 120_000 }, async t => {
  assert.ok(process.env.TEST_DATABASE_URL, 'Set TEST_DATABASE_URL to a local PostgreSQL URL; see docs/database.md');
  const supplied = new URL(process.env.TEST_DATABASE_URL);
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(supplied.hostname), 'Integration tests require a local host');
  assert.match(supplied.pathname, /^\/c1_memory_test[a-z0-9_]*$/);
  const admin = new URL(supplied); admin.pathname = '/postgres';
  const name = `c1_memory_test_${process.pid}_${Date.now()}`;
  const database = new URL(supplied); database.pathname = `/${name}`;
  const run = async (sql, target = database) => {
    const { stdout } = await exec('psql', ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', target.toString(), '-c', sql], { maxBuffer: 5_000_000 });
    return stdout.trim();
  };
  const asService = sql => run(`set role service_role; ${sql}`);
  const asUser = (user, sql) => run(`set role authenticated; set request.jwt.claim.sub = ${quote(user)}; ${sql}`);
  const memory = async (user = ids.user, course = ids.course) => JSON.parse(await asService(`select public.get_learning_memory('${user}','${course}')`));
  const attempt = (n, correct = false, extra = '') => `select public.record_learning_attempt('${ids.user}','${attemptId(n)}','${ids.content}','"B"',${correct}${extra})`;
  await run(`create database ${name}`, admin);
  try {
    await run(`
      do $$ begin
        if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
        if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
        if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
      end $$;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema public, auth to anon,authenticated,service_role;
      grant execute on function auth.uid() to anon,authenticated,service_role;
    `);
    for (const migration of ['202609180001_learning_memory.sql','202609180002_memory_functions.sql']) {
      await run(await readFile(new URL(`../../supabase/migrations/${migration}`, import.meta.url), 'utf8'));
    }
    await run(`insert into auth.users(id) values ('${ids.user}'),('${ids.other}')`);
    await asService(`
      select public.save_learning_preferences('${ids.user}');
      select public.save_learning_preferences('${ids.other}');
      insert into public.courses(id,user_id,name) values
        ('${ids.course}','${ids.user}','Algorithms'),('${ids.otherCourse}','${ids.other}','Private course');
      insert into public.concepts(id,course_id,user_id,name,position) values
        ('${ids.concept}','${ids.course}','${ids.user}','DFS',1),
        ('${ids.prerequisite}','${ids.course}','${ids.user}','Call stack',0),
        ('${ids.unsupported}','${ids.course}','${ids.user}','No sources',2),
        ('${ids.otherConcept}','${ids.otherCourse}','${ids.other}','Private concept',0);
      insert into public.concept_prerequisites values ('${ids.concept}','${ids.prerequisite}','${ids.course}','${ids.user}');
      insert into public.documents(id,course_id,user_id,title,kind,status) values
        ('${ids.doc}','${ids.course}','${ids.user}','Graph notes','notes','ready');
      insert into public.source_passages(id,document_id,course_id,user_id,content,page_number) values
        ('${ids.passage}','${ids.doc}','${ids.course}','${ids.user}','DFS explores a branch using a stack.',12);
      insert into public.concept_sources values ('${ids.concept}','${ids.passage}','${ids.course}','${ids.user}');
      insert into public.learning_content(id,concept_id,course_id,user_id,explanation,question) values
        ('${ids.content}','${ids.concept}','${ids.course}','${ids.user}','Follow the stack.','{"prompt":"Which next?","options":["A","B"]}'),
        ('${ids.otherContent}','${ids.otherConcept}','${ids.otherCourse}','${ids.other}','Private','{}');
      insert into public.question_grading values ('${ids.content}','${ids.course}','${ids.user}','"A"','Choose A');
      insert into public.content_sources values ('${ids.content}','${ids.passage}','${ids.course}','${ids.user}');
    `);

    await t.test('fresh concepts are unassessed and default preferences persist', async () => {
      const state = await memory();
      assert.equal(state.concepts.length, 3);
      assert.equal(state.concepts[0].mastery_score, null);
      assert.equal(state.concepts[0].status, 'unassessed');
      assert.deepEqual(state.concepts[1].prerequisites, [ids.prerequisite]);
      assert.equal(state.recommended_review, null);
      assert.equal(state.profile.learning_preferences.example_first, true);
      await asService(`select public.save_learning_preferences('${ids.user}','{"example_first":false}')`);
      const reloaded = await memory();
      assert.equal(reloaded.profile.learning_preferences.example_first, false);
      assert.equal(reloaded.profile.learning_preferences.explanation_length, 'short');
      await assert.rejects(asService(`select public.save_learning_preferences('${ids.user}','{"explanation_length":null}')`));
      await assert.rejects(asService(`select public.save_learning_preferences('${ids.user}','{"unknown":1}')`));
    });

    await t.test('wrong answer is saved atomically and returns as a weak-topic review', async () => {
      const result = JSON.parse(await asService(attempt(1, false, `,'Try a stack','Possible call-stack gap','${ids.prerequisite}'`)));
      assert.equal(result.duplicate, false);
      assert.equal(result.attempt.mastery_after, 0.33333);
      const state = await memory(); // Separate connection simulates a returning session.
      assert.equal(state.concepts[1].attempts, 1);
      assert.equal(state.concepts[1].correct_attempts, 0);
      assert.equal(state.concepts[0].mastery_score, null, 'A diagnosis is not a prerequisite measurement');
      assert.equal(state.recommended_review.concept_id, ids.concept);
      assert.equal(state.recent_attempts[0].identified_misconception, 'Possible call-stack gap');
      assert.equal(state.recent_attempts[0].related_concept_id, ids.prerequisite);
    });

    await t.test('retries are idempotent and a changed retry is rejected', async () => {
      const query = attempt(1, false, `,'Try a stack','Possible call-stack gap','${ids.prerequisite}'`);
      assert.equal(JSON.parse(await asService(query)).duplicate, true);
      await assert.rejects(asService(attempt(1, true)));
      assert.equal((await memory()).concepts[1].attempts, 1);
    });

    await t.test('concurrent duplicate and distinct submissions do not lose updates', async () => {
      const duplicateResults = await Promise.all(Array.from({ length: 4 }, () => asService(attempt(2, true))));
      assert.equal(duplicateResults.map(JSON.parse).filter(r => !r.duplicate).length, 1);
      await Promise.all([3,4,5,6].map(n => asService(attempt(n, true))));
      const state = await memory();
      assert.equal(state.concepts[1].attempts, 6);
      assert.equal(state.concepts[1].correct_attempts, 5);
      assert.equal(state.concepts[1].mastery_score, 0.75);
      assert.equal(state.recommended_review, null, 'A successful review is not immediately due again');
    });

    await t.test('failure after the attempt insert rolls the whole operation back', async () => {
      await run(`create function public.test_fail_mastery() returns trigger language plpgsql as $$ begin raise exception 'simulated write failure'; end $$;
        create trigger test_fail before update on public.student_concept_mastery for each row execute function public.test_fail_mastery();`);
      try { await assert.rejects(asService(attempt(7, true))); }
      finally { await run('drop trigger test_fail on public.student_concept_mastery; drop function public.test_fail_mastery()'); }
      assert.equal(await run(`select count(*) from public.attempts where id='${attemptId(7)}'`), '0');
      assert.equal((await memory()).concepts[1].attempts, 6);
    });

    await t.test('RLS isolates students and browser roles cannot read keys or write scores', async () => {
      assert.equal(await asUser(ids.other, `select count(*) from public.learning_content where id='${ids.content}'`), '0');
      assert.equal(await asUser(ids.other, 'select count(*) from public.attempts'), '0');
      assert.equal(await asUser(ids.other, 'select count(*) from public.source_passages'), '0');
      await assert.rejects(asUser(ids.other, `select public.get_learning_memory('${ids.user}','${ids.course}')`));
      const own = JSON.parse(await asUser(ids.user, `select public.get_learning_memory('${ids.user}','${ids.course}')`));
      assert.equal(own.concepts[1].attempts, 6);
      await assert.rejects(asUser(ids.user, 'select * from public.question_grading'));
      await assert.rejects(asUser(ids.user, attempt(8, true)));
      await assert.rejects(asUser(ids.user, `select public.save_learning_preferences('${ids.user}','{}')`));
      await assert.rejects(asUser(ids.user, 'update public.student_concept_mastery set mastery_score=1'));
      await assert.rejects(run('set role anon; select * from public.profiles'));
      await assert.rejects(run(`set role anon; select public.get_learning_memory('${ids.user}','${ids.course}')`));
    });

    await t.test('backend rejects cross-student content and cross-course evidence', async () => {
      await assert.rejects(asService(`select public.record_learning_attempt('${ids.user}','${attemptId(9)}','${ids.otherContent}','"B"',true)`));
      await assert.rejects(asService(attempt(10, false, `,'','gap','${ids.otherConcept}'`)));
      await assert.rejects(asService(`insert into public.concept_sources values ('${ids.otherConcept}','${ids.passage}','${ids.otherCourse}','${ids.other}')`));
      await assert.rejects(asService(`update public.learning_content set explanation='changed' where id='${ids.content}'`));
      assert.equal((await memory()).concepts[1].attempts, 6);
    });

    await t.test('review timestamps, unsupported topics, and flags persist correctly', async () => {
      await asService(`update public.student_concept_mastery set next_review_at=now()-interval '1 day' where concept_id='${ids.concept}';
        insert into public.student_concept_mastery values ('${ids.user}','${ids.unsupported}','${ids.course}',0.1,1,0,now(),now());
        insert into public.content_flags(content_id,course_id,user_id,reason) values ('${ids.content}','${ids.course}','${ids.user}','Needs a clearer source explanation');`);
      assert.equal((await memory()).recommended_review.concept_id, ids.concept, 'Unsupported concepts are excluded');
      assert.equal(await asUser(ids.user, 'select count(*) from public.content_flags'), '1');
      assert.equal(await asUser(ids.other, 'select count(*) from public.content_flags'), '0');
      await asService(attempt(11, true, `,'Reviewed',null,null,null,true`));
      const state = await memory();
      assert.equal(state.recent_attempts[0].is_review, true);
      assert.equal(state.recommended_review, null);
    });

    await t.test('mastery completion threshold and preference patches stay consistent', async () => {
      await asService(attempt(12, true));
      const state = await memory();
      assert.equal(state.concepts[1].mastery_score, 0.8);
      assert.equal(state.concepts[1].status, 'completed');
      const daysUntilReview = (Date.parse(state.concepts[1].next_review_at) - Date.parse(state.concepts[1].last_reviewed)) / 86_400_000;
      assert.equal(daysUntilReview, 7);
      await Promise.all([
        asService(`select public.save_learning_preferences('${ids.user}','{"prefers_visuals":true}')`),
        asService(`select public.save_learning_preferences('${ids.user}','{"preferred_session_length":20}')`),
      ]);
      const preferences = (await memory()).profile.learning_preferences;
      assert.equal(preferences.prefers_visuals, true);
      assert.equal(preferences.preferred_session_length, 20);
      assert.equal(preferences.example_first, false);
      await assert.rejects(asService('update public.student_concept_mastery set mastery_score=1.1'));
    });
    await t.test('demo seed runs against an existing auth user without fabricated performance', async () => {
      await exec('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', database.toString(),
        '-v', `demo_user_id=${ids.user}`, '-f', 'backend/src/db/seeds/demo.sql']);
      assert.equal(await run(`select count(*) from public.courses where user_id='${ids.user}'`), '2');
      const demoCourse = await run(`select id from public.courses where name='Algorithms — learning memory demo'`);
      const state = await memory(ids.user, demoCourse);
      assert.equal(state.concepts.length, 2);
      assert.ok(state.concepts.every(concept => concept.has_sources && concept.status === 'unassessed'));
      assert.equal(state.recent_attempts.length, 0);
    });
  } finally {
    await run(`drop database ${name} with (force)`, admin);
  }
});
