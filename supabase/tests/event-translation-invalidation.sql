begin;

do $test$
declare
  v_event_id uuid;
  v_source text := E'Original Spanish description.\n\nSecond paragraph.';
  v_new_source text := E'Updated Spanish description.\n\nSecond paragraph.';
  v_entries jsonb;
begin
  insert into public.events (name, slug, description)
  values ('Translation regression test', 'translation-regression-' || gen_random_uuid(), v_source)
  returning id into v_event_id;

  select jsonb_agg(jsonb_build_object(
    'event_id', v_event_id, 'locale', locale, 'description', 'Translated copy', 'source', v_source
  ))
  into v_entries
  from unnest(array['ca', 'en', 'fr']) as locales(locale);

  perform * from public.insert_event_translations_for_source(v_entries);
  update public.events set description = v_source where id = v_event_id;
  if (select count(*) from public.event_translations where event_id = v_event_id) <> 3 then
    raise exception 'An unchanged description removed its translations';
  end if;

  update public.events set description = v_new_source where id = v_event_id;
  if exists (select 1 from public.event_translations where event_id = v_event_id) then
    raise exception 'Changing the source left stale translations';
  end if;

  begin
    perform * from public.insert_event_translations_for_source(v_entries);
    raise exception 'Promotion accepted translations for an outdated source';
  exception when sqlstate 'P0005' then
    null;
  end;

  v_entries := jsonb_build_array(jsonb_build_object(
    'event_id', v_event_id, 'locale', 'en', 'description', 'Updated translation', 'source', v_new_source
  ));
  perform * from public.insert_event_translations_for_source(v_entries);
  if not exists (select 1 from public.event_translations where event_id = v_event_id and locale = 'en') then
    raise exception 'Promotion did not save the updated translation';
  end if;

  update public.events set description = null where id = v_event_id;
  if exists (select 1 from public.event_translations where event_id = v_event_id) then
    raise exception 'Clearing the source left stale translations';
  end if;
end;
$test$;

rollback;
