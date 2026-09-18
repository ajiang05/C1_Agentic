-- psql seed for an EXISTING Supabase Auth user. No fabricated auth.users records.
-- psql "$DATABASE_URL" -v demo_user_id='<auth-user-uuid>' -f backend/src/db/seeds/demo.sql
-- Every invocation creates a fresh demo course; it does not overwrite prior work.
begin;
select public.save_learning_preferences(:'demo_user_id'::uuid, '{"example_first":true,"hint_before_solution":true}');
select gen_random_uuid() as course_id, gen_random_uuid() as doc_id,
  gen_random_uuid() as passage_id, gen_random_uuid() as stack_id,
  gen_random_uuid() as dfs_id, gen_random_uuid() as content_id \gset
insert into public.courses(id,user_id,name)
values (:'course_id',:'demo_user_id','Algorithms — learning memory demo');
insert into public.documents(id,course_id,user_id,title,kind,status)
values (:'doc_id',:'course_id',:'demo_user_id','Sample graph notes','notes','ready');
insert into public.source_passages(id,document_id,course_id,user_id,content,section)
values (:'passage_id',:'doc_id',:'course_id',:'demo_user_id',
  'Depth-first search explores an unvisited neighbor before backtracking. Recursive DFS uses the call stack to remember pending calls. For edges A to B, A to C, and B to D, exploring B first gives traversal A, B, D, C.', 'DFS and the call stack');
insert into public.concepts(id,course_id,user_id,name,description,position) values
  (:'stack_id',:'course_id',:'demo_user_id','Call stack','Pending recursive calls',0),
  (:'dfs_id',:'course_id',:'demo_user_id','DFS','Depth-first traversal',1);
insert into public.concept_prerequisites values (:'dfs_id',:'stack_id',:'course_id',:'demo_user_id');
insert into public.concept_sources values
  (:'stack_id',:'passage_id',:'course_id',:'demo_user_id'),
  (:'dfs_id',:'passage_id',:'course_id',:'demo_user_id');
insert into public.learning_content(id,concept_id,course_id,user_id,explanation,question)
values (:'content_id',:'dfs_id',:'course_id',:'demo_user_id',
  'DFS follows B to D before returning to A and exploring C.',
  '{"type":"multiple_choice","prompt":"With edges A→B, A→C, B→D, after A then B, which node is visited next?","options":[{"id":"C","text":"C"},{"id":"D","text":"D"}]}');
insert into public.question_grading values (:'content_id',:'course_id',:'demo_user_id','{"option_id":"D"}','Visit the unvisited neighbor D before backtracking.');
insert into public.content_sources values (:'content_id',:'passage_id',:'course_id',:'demo_user_id');
commit;
select :'demo_user_id' as user_id, :'course_id' as course_id, :'content_id' as content_id;
