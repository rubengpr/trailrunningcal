create or replace function public.get_events_with_races()
returns table(
  id uuid,
  name text,
  slug text,
  website_url text,
  organizer_id uuid,
  description text,
  hero_image_filename text,
  updated_at timestamp with time zone,
  races jsonb
)
language sql
stable
security invoker
set search_path to ''
as $function$
  select
    e.id,
    e.name,
    e.slug,
    e.website_url,
    e.organizer_id,
    e.description,
    e.hero_image_filename,
    e.updated_at,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'event_id', r.event_id,
          'id', r.id,
          'name', r.name,
          'date', r.date,
          'distance_km', r.distance_km,
          'elevation_gain_m', r.elevation_gain_m,
          'city', r.city,
          'province', r.province,
          'map_url', r.map_url,
          'race_tiers', coalesce(t.tiers, '[]'::jsonb)
        )
        order by r.date nulls last, r.distance_km desc, r.name
      ) filter (where r.id is not null),
      '[]'::jsonb
    ) as races
  from public.events e
  left join public.races r on r.event_id = e.id
  left join lateral (
    select jsonb_agg(
      jsonb_build_object('price_eur', rt.price_eur)
      order by rt.price_eur nulls last
    ) as tiers
    from public.race_tiers rt
    where rt.race_id = r.id
  ) t on true
  group by
    e.id,
    e.name,
    e.slug,
    e.website_url,
    e.organizer_id,
    e.description,
    e.hero_image_filename,
    e.updated_at
  order by e.name;
$function$;
