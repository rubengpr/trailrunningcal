insert into public.city_locations (city, province, latitude, longitude)
values (
  'San Martín de la Virgen del Moncayo',
  'Zaragoza',
  41.838333,
  -1.791944
)
on conflict (city, province) do nothing;
