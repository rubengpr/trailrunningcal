alter table public.blog_drafts add column research_status text not null default 'not_started'
  check (research_status in ('not_started','queued','running','completed','partial','failed'));

create table public.blog_research_runs (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.blog_drafts(id) on delete cascade,
  input jsonb not null check (jsonb_typeof(input) = 'object'),
  provider text not null,
  model text not null,
  status text not null default 'queued' check (status in ('queued','running','completed','partial','failed')),
  workflow_run_id text,
  error_code text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index blog_research_runs_draft_created_idx on public.blog_research_runs(draft_id, created_at desc, id desc);
create unique index blog_research_runs_active_idx on public.blog_research_runs(draft_id) where status in ('queued','running');

create table public.blog_research_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.blog_research_runs(id) on delete cascade,
  event_id uuid not null,
  event_name text not null,
  position integer not null check (position between 0 and 4),
  status text not null default 'queued' check (status in ('queued','running','completed','failed')),
  dossier jsonb,
  consulted_sources jsonb not null default '[]' check (jsonb_typeof(consulted_sources) = 'array'),
  response_id text,
  model text,
  usage jsonb,
  search_calls integer,
  duration_ms integer,
  error_code text,
  started_at timestamptz,
  finished_at timestamptz,
  unique(run_id, event_id), unique(run_id, position),
  check ((status = 'completed' and dossier is not null and error_code is null) or status <> 'completed'),
  check (status <> 'failed' or error_code is not null)
);
alter table public.blog_research_runs enable row level security;
alter table public.blog_research_results enable row level security;
revoke all on public.blog_research_runs, public.blog_research_results from public, anon, authenticated;
grant select, insert, update, delete on public.blog_research_runs, public.blog_research_results to service_role;

-- Lock the parent first in every operation, serializing claims and deletion.
create function public.claim_blog_research(p_draft_id uuid, p_event_ids uuid[], p_provider text, p_model text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare d public.blog_drafts; r uuid; selected jsonb;
begin
  select * into d from public.blog_drafts where id = p_draft_id for update;
  if not found then raise exception 'Draft not found' using errcode = 'P0002'; end if;
  if d.status <> 'completed' or d.research_status in ('queued','running') then
    raise exception 'Research state conflict' using errcode = 'P0001';
  end if;
  if d.generation_context is null or d.generation_context->>'format' <> 'regional-selection'
    or cardinality(p_event_ids) not between 1 and 5
    or (select count(distinct x) from unnest(p_event_ids) x) <> cardinality(p_event_ids) then
    raise exception 'Invalid research selection' using errcode = '22023';
  end if;
  select jsonb_agg(jsonb_build_object('id', e->>'id', 'name', e->>'name') order by n) into selected
    from jsonb_array_elements(d.generation_context->'events') with ordinality as events(e,n)
    where (e->>'id')::uuid = any(p_event_ids);
  if coalesce(jsonb_array_length(selected),0) <> cardinality(p_event_ids) then
    raise exception 'Invalid research selection' using errcode = '22023';
  end if;
  insert into public.blog_research_runs(draft_id,input,provider,model)
    values(p_draft_id,jsonb_build_object('regionName',d.generation_context->>'regionName','events',selected),p_provider,p_model)
    returning id into r;
  insert into public.blog_research_results(run_id,event_id,event_name,position)
    select r,(e->>'id')::uuid,e->>'name',(n-1)::integer from jsonb_array_elements(selected) with ordinality as events(e,n);
  update public.blog_drafts set research_status = 'queued' where id = p_draft_id;
  return r;
end $$;

create function public.begin_blog_research(p_run_id uuid, p_result_id uuid, p_workflow_id text)
returns void language plpgsql security invoker set search_path = '' as $$
declare parent uuid;
begin
  select draft_id into parent from public.blog_research_runs where id = p_run_id;
  perform 1 from public.blog_drafts where id = parent for update;
  if not found then raise exception 'Draft not found'; end if;
  if not exists(select 1 from public.blog_research_runs where id = p_run_id and status in ('queued','running')) then
    raise exception 'Research state conflict';
  end if;
  update public.blog_research_results set status='running',started_at=coalesce(started_at,now())
    where id=p_result_id and run_id=p_run_id and status in ('queued','running');
  if not found then raise exception 'Research result conflict'; end if;
  update public.blog_research_runs set status='running',workflow_run_id=p_workflow_id where id=p_run_id;
  update public.blog_drafts set research_status='running' where id=parent;
end $$;

create function public.finish_blog_research(p_run_id uuid, p_result_id uuid, p_dossier jsonb, p_metadata jsonb, p_error text)
returns void language plpgsql security invoker set search_path = '' as $$
declare parent uuid; pending integer; successful integer; total integer; final_status text;
begin
  select draft_id into parent from public.blog_research_runs where id=p_run_id;
  perform 1 from public.blog_drafts where id=parent for update;
  if not found then raise exception 'Draft not found'; end if;
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

create function public.fail_blog_research(p_run_id uuid, p_error text)
returns void language plpgsql security invoker set search_path = '' as $$
declare parent uuid; final_status text;
begin
  select draft_id into parent from public.blog_research_runs where id=p_run_id;
  perform 1 from public.blog_drafts where id=parent for update;
  if not found then return; end if;
  if not exists(select 1 from public.blog_research_runs where id=p_run_id and status in ('queued','running')) then return; end if;
  update public.blog_research_results set status='failed',error_code=p_error,finished_at=now()
    where run_id=p_run_id and status in ('queued','running');
  final_status := case when exists(select 1 from public.blog_research_results where run_id=p_run_id and status='completed') then 'partial' else 'failed' end;
  update public.blog_research_runs set status=final_status,error_code=p_error,finished_at=now() where id=p_run_id;
  update public.blog_drafts set research_status=final_status where id=parent;
end $$;

revoke execute on function public.claim_blog_research(uuid,uuid[],text,text), public.begin_blog_research(uuid,uuid,text),
  public.finish_blog_research(uuid,uuid,jsonb,jsonb,text), public.fail_blog_research(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_blog_research(uuid,uuid[],text,text), public.begin_blog_research(uuid,uuid,text),
  public.finish_blog_research(uuid,uuid,jsonb,jsonb,text), public.fail_blog_research(uuid,text) to service_role;
