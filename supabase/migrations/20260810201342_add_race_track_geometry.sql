alter table public.races
add column track_geometry jsonb;

alter table public.races
add constraint races_track_geometry_shape_check
check (
  track_geometry is null
  or (
    jsonb_typeof(track_geometry) = 'object'
    and track_geometry ->> 'type' in ('LineString', 'MultiLineString')
    and jsonb_typeof(track_geometry -> 'coordinates') = 'array'
    and octet_length(track_geometry::text) <= 2097152
  )
);
