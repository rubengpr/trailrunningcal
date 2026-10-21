-- Standalone runs retain their own frozen selection, without creating a blog draft.
-- Existing draft-linked histories and their deletion semantics remain unchanged.
alter table public.blog_research_runs alter column draft_id drop not null;
create index blog_research_runs_independent_created_idx
  on public.blog_research_runs(created_at desc,id desc) where draft_id is null;

create function public.create_blog_research(p_input jsonb,p_provider text,p_model text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare r uuid; selected jsonb;
begin
  if jsonb_typeof(p_input) is distinct from 'object'
    or nullif(btrim(p_input->>'regionName'),'') is null
    or jsonb_typeof(p_input->'events') is distinct from 'array'
    or jsonb_typeof(p_input->'selection') is distinct from 'object'
    or p_input->'selection'->>'format' is distinct from 'regional-selection'
    or p_input->'selection'->>'regionName' is distinct from p_input->>'regionName'
    or jsonb_typeof(p_input->'selection'->'events') is distinct from 'array' then
    raise exception 'Invalid research selection' using errcode='22023';
  end if;
  selected := p_input->'events';
  if jsonb_array_length(selected) <> 5 or jsonb_array_length(p_input->'selection'->'events') <> 5
    or (select count(distinct (e->>'id')::uuid) from jsonb_array_elements(selected) e) <> 5
    or exists(select 1 from jsonb_array_elements(selected) e where nullif(btrim(e->>'name'),'') is null)
    or selected is distinct from (select jsonb_agg(jsonb_build_object('id',e->>'id','name',e->>'name') order by n)
      from jsonb_array_elements(p_input->'selection'->'events') with ordinality as events(e,n)) then
    raise exception 'Invalid research selection' using errcode='22023';
  end if;
  insert into public.blog_research_runs(input,provider,model) values(p_input,p_provider,p_model) returning id into r;
  insert into public.blog_research_results(run_id,event_id,event_name,position)
    select r,(e->>'id')::uuid,e->>'name',(n-1)::integer
    from jsonb_array_elements(selected) with ordinality as events(e,n);
  return r;
end $$;
revoke execute on function public.create_blog_research(jsonb,text,text) from public,anon,authenticated;
grant execute on function public.create_blog_research(jsonb,text,text) to service_role;

-- Legacy operations still lock the draft first; every run then serializes its own
-- transitions so parallel standalone completions aggregate progress atomically.
create or replace function public.begin_blog_research(p_run_id uuid, p_result_id uuid, p_workflow_id text)
returns void language plpgsql security invoker set search_path = '' as $$
declare parent uuid;
begin
  select draft_id into parent from public.blog_research_runs where id = p_run_id;
  if parent is not null then
    perform 1 from public.blog_drafts where id=parent for update;
    if not found then raise exception 'Draft not found'; end if;
  end if;
  perform 1 from public.blog_research_runs where id=p_run_id for update;
  if not found then raise exception 'Research not found'; end if;
  if not exists(select 1 from public.blog_research_runs where id = p_run_id and status in ('queued','running')) then
    raise exception 'Research state conflict';
  end if;
  update public.blog_research_results set status='running',started_at=coalesce(started_at,now())
    where id=p_result_id and run_id=p_run_id and status in ('queued','running');
  if not found then raise exception 'Research result conflict'; end if;
  update public.blog_research_runs set status='running',workflow_run_id=p_workflow_id where id=p_run_id;
  update public.blog_drafts set research_status='running' where id=parent;
end $$;

create or replace function public.finish_blog_research(p_run_id uuid, p_result_id uuid, p_dossier jsonb, p_metadata jsonb, p_error text)
returns void language plpgsql security invoker set search_path = '' as $$
declare parent uuid; pending integer; successful integer; total integer; final_status text;
begin
  select draft_id into parent from public.blog_research_runs where id=p_run_id;
  if parent is not null then
    perform 1 from public.blog_drafts where id=parent for update;
    if not found then raise exception 'Draft not found'; end if;
  end if;
  perform 1 from public.blog_research_runs where id=p_run_id for update;
  if not found then raise exception 'Research not found'; end if;
  -- Retried writes are idempotent; never replace a terminal result.
  update public.blog_research_results set
    status=case when p_error is null then 'completed' else 'failed' end,
    dossier=p_dossier, error_code=p_error, finished_at=now(),
    consulted_sources=coalesce(p_metadata->'consultedSources','[]'::jsonb),
    response_id=p_metadata->>'responseId',model=p_metadata->>'model',usage=p_metadata->'usage',
    search_calls=(p_metadata->>'searchCalls')::integer,duration_ms=(p_metadata->>'durationMs')::integer
    where id=p_result_id and run_id=p_run_id and status in ('queued','running');
  if not found then
    if exists(select 1 from public.blog_research_results where id=p_result_id and run_id=p_run_id and status in ('completed','failed')) then return; end if;
    raise exception 'Research result not found';
  end if;
  select count(*),count(*) filter(where status in ('queued','running')),count(*) filter(where status='completed')
    into total,pending,successful from public.blog_research_results where run_id=p_run_id;
  final_status := case when pending>0 then 'running' when successful=total then 'completed' when successful>0 then 'partial' else 'failed' end;
  update public.blog_research_runs set status=final_status,finished_at=case when pending=0 then now() else null end where id=p_run_id;
  update public.blog_drafts set research_status=final_status where id=parent;
end $$;

create or replace function public.fail_blog_research(p_run_id uuid, p_error text)
returns void language plpgsql security invoker set search_path = '' as $$
declare parent uuid; final_status text;
begin
  select draft_id into parent from public.blog_research_runs where id=p_run_id;
  if parent is not null then
    perform 1 from public.blog_drafts where id=parent for update;
    if not found then return; end if;
  end if;
  perform 1 from public.blog_research_runs where id=p_run_id for update;
  if not found then return; end if;
  if not exists(select 1 from public.blog_research_runs where id=p_run_id and status in ('queued','running')) then return; end if;
  update public.blog_research_results set status='failed',error_code=p_error,finished_at=now()
    where run_id=p_run_id and status in ('queued','running');
  final_status := case when exists(select 1 from public.blog_research_results where run_id=p_run_id and status='completed') then 'partial' else 'failed' end;
  update public.blog_research_runs set status=final_status,error_code=p_error,finished_at=now() where id=p_run_id;
  update public.blog_drafts set research_status=final_status where id=parent;
end $$;
