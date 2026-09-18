begin;

-- Called only by the trusted backend after verifying the student's identity.
create function public.save_learning_preferences(p_user_id uuid, p_preferences jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare result public.profiles;
begin
  if p_preferences is null or jsonb_typeof(p_preferences) <> 'object' then
    raise exception 'Preferences must be an object' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_object_keys(p_preferences) as k(key)
    where key not in ('example_first','prefers_visuals','explanation_length','preferred_session_length','hint_before_solution'))
    or (p_preferences ? 'example_first' and jsonb_typeof(p_preferences->'example_first') <> 'boolean')
    or (p_preferences ? 'prefers_visuals' and jsonb_typeof(p_preferences->'prefers_visuals') <> 'boolean')
    or (p_preferences ? 'hint_before_solution' and jsonb_typeof(p_preferences->'hint_before_solution') <> 'boolean')
    or (p_preferences ? 'explanation_length' and p_preferences->>'explanation_length' not in ('short','moderate','detailed'))
    or (p_preferences ? 'explanation_length' and jsonb_typeof(p_preferences->'explanation_length') <> 'string')
    or (p_preferences ? 'preferred_session_length' and p_preferences->'preferred_session_length' not in ('5'::jsonb,'10'::jsonb,'15'::jsonb,'20'::jsonb)) then
    raise exception 'Unsupported preference key or value' using errcode = '22023';
  end if;
  insert into public.profiles(id) values (p_user_id) on conflict (id) do nothing;
  update public.profiles set learning_preferences = learning_preferences || p_preferences,
    updated_at = now() where id = p_user_id returning * into result;
  return to_jsonb(result);
end $$;

create function public.record_learning_attempt(
  p_user_id uuid, p_attempt_id uuid, p_content_id uuid, p_student_answer jsonb,
  p_correct boolean, p_feedback text default '', p_misconception text default null,
  p_related_concept_id uuid default null, p_confidence numeric default null,
  p_is_review boolean default false
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  content public.learning_content;
  prior public.attempts;
  saved public.attempts;
  score numeric;
  recorded_at timestamptz;
  review_at timestamptz;
begin
  if p_user_id is null or p_attempt_id is null or p_content_id is null
    or p_student_answer is null or p_student_answer = 'null'::jsonb
    or p_correct is null or p_is_review is null or p_feedback is null
    or (p_confidence is not null and not (p_confidence between 0 and 1)) then
    raise exception 'Invalid attempt input' using errcode = '22023';
  end if;

  -- Serializes a student's writes, including retries and simultaneous answers.
  perform 1 from public.profiles where id = p_user_id for update;
  if not found then raise exception 'Student profile not found' using errcode = 'P0002'; end if;
  select * into prior from public.attempts where id = p_attempt_id;
  if found then
    if prior.user_id <> p_user_id or prior.content_id <> p_content_id
      or prior.student_answer is distinct from p_student_answer
      or prior.correct is distinct from p_correct
      or prior.feedback is distinct from p_feedback
      or prior.identified_misconception is distinct from p_misconception
      or prior.related_concept_id is distinct from p_related_concept_id
      or prior.confidence is distinct from p_confidence
      or prior.is_review is distinct from p_is_review then
      raise exception 'Attempt ID already used with a different payload' using errcode = '22023';
    end if;
    return jsonb_build_object('attempt', to_jsonb(prior), 'duplicate', true);
  end if;

  select * into content from public.learning_content where id = p_content_id and user_id = p_user_id;
  if not found then raise exception 'Learning content not found for student' using errcode = 'P0002'; end if;
  if p_related_concept_id is not null and not exists (
    select 1 from public.concepts where id = p_related_concept_id
      and course_id = content.course_id and user_id = p_user_id
  ) then raise exception 'Related concept must belong to the same course' using errcode = '22023'; end if;

  -- Beta(1,1) smoothed correctness ratio. Missing rows mean unassessed.
  select (correct_attempts + p_correct::integer + 1)::numeric / (attempts + 3)
    into score from public.student_concept_mastery
    where user_id = p_user_id and concept_id = content.concept_id;
  if not found then score := (p_correct::integer + 1)::numeric / 3; end if;
  score := round(score, 5);
  recorded_at := clock_timestamp();
  review_at := recorded_at + case when not p_correct then interval '0 seconds'
    when score < 0.6 then interval '1 day'
    when score < 0.8 then interval '3 days' else interval '7 days' end;

  insert into public.attempts(id,user_id,course_id,content_id,concept_id,student_answer,correct,
    feedback,identified_misconception,related_concept_id,confidence,is_review,mastery_after,created_at)
  values (p_attempt_id,p_user_id,content.course_id,p_content_id,content.concept_id,p_student_answer,p_correct,
    p_feedback,p_misconception,p_related_concept_id,p_confidence,p_is_review,score,recorded_at)
  returning * into saved;

  insert into public.student_concept_mastery(user_id,concept_id,course_id,mastery_score,attempts,
    correct_attempts,last_reviewed,next_review_at)
  values(p_user_id,content.concept_id,content.course_id,score,1,p_correct::integer,recorded_at,review_at)
  on conflict (user_id,concept_id) do update set
    mastery_score = excluded.mastery_score,
    attempts = public.student_concept_mastery.attempts + 1,
    correct_attempts = public.student_concept_mastery.correct_attempts + p_correct::integer,
    last_reviewed = excluded.last_reviewed, next_review_at = excluded.next_review_at;

  -- Diagnosing a prerequisite does not fabricate a measured score for it.
  return jsonb_build_object('attempt', to_jsonb(saved), 'duplicate', false);
end $$;

create function public.get_learning_memory(p_user_id uuid, p_course_id uuid)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
  if not exists (select 1 from public.courses where id = p_course_id and user_id = p_user_id) then
    raise exception 'Course not found for student' using errcode = 'P0002';
  end if;
  select jsonb_build_object(
    'course_id', p_course_id,
    'profile', (select to_jsonb(p) from public.profiles p where p.id = p_user_id),
    'concepts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',c.id,'name',c.name,'position',c.position,
        'mastery_score',m.mastery_score,'attempts',coalesce(m.attempts,0),
        'correct_attempts',coalesce(m.correct_attempts,0),'last_reviewed',m.last_reviewed,
        'next_review_at',m.next_review_at,
        'has_sources',exists(select 1 from public.concept_sources s where s.concept_id=c.id),
        'status',case when m.mastery_score >= 0.8 then 'completed'
          when m.attempts > 0 then 'in_progress' else 'unassessed' end,
        'prerequisites',coalesce((select jsonb_agg(cp.prerequisite_id order by cp.prerequisite_id)
          from public.concept_prerequisites cp where cp.concept_id=c.id),'[]'::jsonb)
      ) order by c.position)
      from public.concepts c left join public.student_concept_mastery m
        on m.concept_id=c.id and m.user_id=p_user_id
      where c.course_id=p_course_id and c.user_id=p_user_id
    ), '[]'::jsonb),
    'recent_attempts', coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc, a.id)
      from (select * from public.attempts where user_id=p_user_id and course_id=p_course_id
        order by created_at desc,id limit 20) a),'[]'::jsonb),
    'recommended_review', (
      select jsonb_build_object('concept_id',c.id,'name',c.name,'mastery_score',m.mastery_score,
        'due_at',m.next_review_at,'reason',case when m.mastery_score < 0.6 then 'weak_topic' else 'scheduled_review' end)
      from public.student_concept_mastery m join public.concepts c on c.id=m.concept_id
      where m.user_id=p_user_id and m.course_id=p_course_id and m.next_review_at <= now()
        and exists(select 1 from public.concept_sources s where s.concept_id=c.id)
      order by m.mastery_score asc,m.next_review_at asc,c.position asc limit 1
    )
  ) into result;
  return result;
end $$;

revoke all on function public.save_learning_preferences(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.record_learning_attempt(uuid,uuid,uuid,jsonb,boolean,text,text,uuid,numeric,boolean) from public,anon,authenticated;
revoke all on function public.get_learning_memory(uuid,uuid) from public,anon,authenticated;
grant execute on function public.save_learning_preferences(uuid,jsonb) to service_role;
grant execute on function public.record_learning_attempt(uuid,uuid,uuid,jsonb,boolean,text,text,uuid,numeric,boolean) to service_role;
-- SECURITY INVOKER means authenticated reads still obey every underlying RLS policy.
grant execute on function public.get_learning_memory(uuid,uuid) to service_role,authenticated;

commit;
