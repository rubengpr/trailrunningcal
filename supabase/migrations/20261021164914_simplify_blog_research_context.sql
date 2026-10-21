-- Refuse migration while a durable execution still uses the former contract.
lock table public.blog_research_runs in access exclusive mode;
do $$ begin
  if exists(select 1 from public.blog_research_runs where status in ('queued','running')) then
    raise exception 'Wait for active research before migrating';
  end if;
end $$;
alter table public.blog_research_runs add column region_id text;
with regions(id,name) as (values ('andalusia','Andalucía'),('aragon','Aragón'),('asturias','Asturias'),('balearicIslands','Illes Balears'),('canaryIslands','Canarias'),('cantabria','Cantabria'),('castileAndLeon','Castilla y León'),('castileLaMancha','Castilla-La Mancha'),('catalonia','Cataluña'),('extremadura','Extremadura'),('galicia','Galicia'),('madrid','Madrid'),('murcia','Murcia'),('navarre','Navarra'),('basqueCountry','País Vasco'),('laRioja','La Rioja'),('valencianCommunity','Comunidad Valenciana'))
update public.blog_research_runs r set region_id=coalesce(
  r.input->'selection'->>'regionId',
  (select d.generation_context->>'regionId' from public.blog_drafts d where d.id=r.draft_id),
  (select id from regions where name=r.input->>'regionName'));
alter table public.blog_research_runs alter column region_id set not null;
alter table public.blog_research_runs add constraint blog_research_runs_region_id_check check(region_id in ('andalusia','aragon','asturias','balearicIslands','canaryIslands','cantabria','castileAndLeon','castileLaMancha','catalonia','extremadura','galicia','madrid','murcia','navarre','basqueCountry','laRioja','valencianCommunity'));
update public.blog_research_results set dossier=dossier-'eventName' where dossier ? 'eventName';
alter table public.blog_research_results drop column position;
alter table public.blog_research_runs drop column input;
drop function public.create_blog_research(jsonb,text,text);

create function public.create_blog_research(p_region_id text,p_events jsonb,p_provider text,p_model text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare r uuid;
begin
  if p_region_id is null or p_region_id not in ('andalusia','aragon','asturias','balearicIslands','canaryIslands','cantabria','castileAndLeon','castileLaMancha','catalonia','extremadura','galicia','madrid','murcia','navarre','basqueCountry','laRioja','valencianCommunity') or jsonb_typeof(p_events) is distinct from 'array' then
    raise exception 'Invalid research selection' using errcode='22023';
  end if;
  if jsonb_array_length(p_events)<>5 or
    (select count(distinct (e->>'id')::uuid) from jsonb_array_elements(p_events) e)<>5 or
    exists(select 1 from jsonb_array_elements(p_events) e where jsonb_typeof(e->'name') is distinct from 'string' or nullif(btrim(e->>'name'),'') is null) then
    raise exception 'Invalid research selection' using errcode='22023';
  end if;
  insert into public.blog_research_runs(region_id,provider,model) values(p_region_id,p_provider,p_model) returning id into r;
  insert into public.blog_research_results(run_id,event_id,event_name)
    select r,(e->>'id')::uuid,e->>'name' from jsonb_array_elements(p_events) e;
  return r;
end $$;
revoke execute on function public.create_blog_research(text,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.create_blog_research(text,jsonb,text,text) to service_role;

create or replace function public.claim_blog_research(p_draft_id uuid,p_event_ids uuid[],p_provider text,p_model text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare d public.blog_drafts; r uuid; selected jsonb;
begin
  select * into d from public.blog_drafts where id=p_draft_id for update;
  if not found then raise exception 'Draft not found' using errcode='P0002'; end if;
  if d.status<>'completed' or d.research_status in ('queued','running') then raise exception 'Research state conflict' using errcode='P0001'; end if;
  if d.generation_context is null or d.generation_context->>'format'<>'regional-selection'
    or cardinality(p_event_ids) is null or cardinality(p_event_ids) not between 1 and 5
    or (select count(distinct x) from unnest(p_event_ids) x)<>cardinality(p_event_ids) then
    raise exception 'Invalid research selection' using errcode='22023';
  end if;
  select jsonb_agg(jsonb_build_object('id',e->>'id','name',e->>'name')) into selected
    from jsonb_array_elements(d.generation_context->'events') e where (e->>'id')::uuid=any(p_event_ids);
  if coalesce(jsonb_array_length(selected),0)<>cardinality(p_event_ids) then raise exception 'Invalid research selection' using errcode='22023'; end if;
  insert into public.blog_research_runs(draft_id,region_id,provider,model)
    values(p_draft_id,d.generation_context->>'regionId',p_provider,p_model) returning id into r;
  insert into public.blog_research_results(run_id,event_id,event_name)
    select r,(e->>'id')::uuid,e->>'name' from jsonb_array_elements(selected) e;
  update public.blog_drafts set research_status='queued' where id=p_draft_id;
  return r;
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
    dossier=p_dossier-'eventName', error_code=p_error, finished_at=now(),
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


-- Existing INVOKER functions keep their backend-only ACL when replaced.
revoke execute on function public.claim_blog_research(uuid,uuid[],text,text),public.finish_blog_research(uuid,uuid,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.claim_blog_research(uuid,uuid[],text,text),public.finish_blog_research(uuid,uuid,jsonb,jsonb,text) to service_role;
