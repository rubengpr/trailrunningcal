create table public.event_translations (
  event_id uuid not null references public.events(id) on delete cascade,
  locale text not null check (locale in ('ca', 'en', 'fr')),
  description text not null check (length(trim(description)) > 0),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  primary key (event_id, locale)
);

alter table public.event_translations enable row level security;

create policy "Public event translations are readable"
  on public.event_translations
  for select
  to anon, authenticated
  using (true);

grant select on public.event_translations to anon, authenticated;
grant select, insert, update, delete on public.event_translations to service_role;
