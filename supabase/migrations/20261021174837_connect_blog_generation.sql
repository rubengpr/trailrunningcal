-- Keep the originating investigation explicit; unrelated later research cannot change provenance.
alter table public.blog_drafts
  add column generation_research_run_id uuid references public.blog_research_runs(id) on delete set null,
  add column article_links jsonb not null default '[]'::jsonb,
  add column article_references jsonb not null default '[]'::jsonb;
create index blog_drafts_generation_research_run_idx on public.blog_drafts(generation_research_run_id);

create function public.create_blog_generation(p_region_id text,p_events jsonb,p_provider text,p_model text,p_instructions text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare d uuid; r uuid;
begin
  -- create_blog_research validates region and distinct event identities; any failure rolls back the draft too.
  insert into public.blog_drafts(instructions,research_status) values(p_instructions,'queued') returning id into d;
  r := public.create_blog_research(p_region_id,p_events,p_provider,p_model);
  update public.blog_research_runs set draft_id=d where id=r;
  update public.blog_drafts set generation_research_run_id=r where id=d;
  return d;
end $$;

create function public.fail_blog_generation(p_draft_id uuid,p_error text)
returns void language plpgsql security invoker set search_path='' as $$
declare d public.blog_drafts;
begin
  select * into d from public.blog_drafts where id=p_draft_id for update;
  if not found or d.status='completed' then return; end if;
  if d.generation_research_run_id is not null then
    perform public.fail_blog_research(d.generation_research_run_id,p_error);
  end if;
  update public.blog_drafts set status='failed',error_code=p_error,updated_at=now() where id=p_draft_id;
end $$;
revoke execute on function public.create_blog_generation(text,jsonb,text,text,text),public.fail_blog_generation(uuid,text) from public,anon,authenticated;
grant execute on function public.create_blog_generation(text,jsonb,text,text,text),public.fail_blog_generation(uuid,text) to service_role;
