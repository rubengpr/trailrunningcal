create or replace function public.delete_event_with_races(p_event_id uuid)
returns void
language plpgsql
security invoker
set search_path to ''
as $function$
begin
  delete from public.events
  where id = p_event_id;

  if not found then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;
end;
$function$;

revoke all on function public.delete_event_with_races(uuid) from public;
revoke all on function public.delete_event_with_races(uuid) from anon;
revoke all on function public.delete_event_with_races(uuid) from authenticated;
grant execute on function public.delete_event_with_races(uuid) to service_role;
