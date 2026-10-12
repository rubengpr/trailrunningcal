alter table public.blog_drafts
  add column evaluation_status text not null default 'not_evaluated'
    check (evaluation_status in ('not_evaluated','queued','running','completed','failed')),
  add column evaluation_error_code text,
  add column evaluation_workflow_run_id text,
  add constraint blog_drafts_evaluation_error_check check (
    (evaluation_status = 'failed' and nullif(btrim(evaluation_error_code), '') is not null)
    or (evaluation_status <> 'failed' and evaluation_error_code is null)
  );

alter table public.blog_draft_evaluations
  add column critical_errors jsonb not null default '[]'::jsonb check (jsonb_typeof(critical_errors) = 'array'),
  add column recommendations jsonb not null default '[]'::jsonb check (jsonb_typeof(recommendations) = 'array');

create function public.complete_blog_evaluation(
  p_draft_id uuid, p_run_id text, p_score integer, p_criteria jsonb,
  p_critical_errors jsonb, p_recommendations jsonb
) returns void
language plpgsql security invoker set search_path = ''
as $function$
declare v_draft public.blog_drafts%rowtype;
begin
  select * into v_draft from public.blog_drafts where id = p_draft_id for update;
  if not found then raise exception 'Draft not found' using errcode = 'P0002'; end if;
  if v_draft.status <> 'completed' or
    v_draft.evaluation_workflow_run_id is distinct from p_run_id or
    v_draft.evaluation_status not in ('running','completed') then
    raise exception 'Evaluation state conflict' using errcode = '55000';
  end if;
  -- A replay after a committed transaction does not change the saved result.
  if v_draft.evaluation_status = 'completed' then return; end if;
  if p_score is null or p_score not between 0 and 100 or
    p_criteria is null or jsonb_typeof(p_criteria) <> 'array' or jsonb_array_length(p_criteria) <> 5 or
    p_critical_errors is null or jsonb_typeof(p_critical_errors) <> 'array' or
    p_recommendations is null or jsonb_typeof(p_recommendations) <> 'array' then
    raise exception 'Invalid evaluation' using errcode = '22023';
  end if;
  insert into public.blog_draft_evaluations(draft_id,score,criteria,critical_errors,recommendations,created_at)
    values(p_draft_id,p_score,p_criteria,p_critical_errors,p_recommendations,now())
    on conflict(draft_id) do update set score=excluded.score,criteria=excluded.criteria,
      critical_errors=excluded.critical_errors,recommendations=excluded.recommendations,created_at=excluded.created_at;
  update public.blog_drafts set evaluation_status='completed',evaluation_error_code=null,updated_at=now()
    where id=p_draft_id;
end;
$function$;
revoke all on function public.complete_blog_evaluation(uuid,text,integer,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.complete_blog_evaluation(uuid,text,integer,jsonb,jsonb,jsonb) to service_role;
