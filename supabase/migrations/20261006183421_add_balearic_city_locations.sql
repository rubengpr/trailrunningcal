-- Balearic race locations were missing from the coordinate lookup, so the public
-- calendar listed their events without rendering map markers.
-- Settlement coordinates from Nominatim / OpenStreetMap, retrieved 2026-10-06.
-- https://www.openstreetmap.org/copyright (ODbL)
-- Keep the race city names as lookup keys, including Ibiza and Vilafranca aliases.
insert into public.city_locations (city, province, latitude, longitude)
values
  ('Alaior', 'Illes Balears', 39.9337077, 4.1397673),
  ('Artà', 'Illes Balears', 39.6950088, 3.3506343),
  ('Bunyola', 'Illes Balears', 39.6961887, 2.6989574),
  ('Caimari', 'Illes Balears', 39.7711008, 2.9034496),
  ('Ciutadella', 'Illes Balears', 39.9920763, 3.8978496),
  ('Estellencs', 'Illes Balears', 39.6535102, 2.4810336),
  ('Ferreries', 'Illes Balears', 39.983348, 4.0109465),
  ('Fornalutx', 'Illes Balears', 39.782612, 2.7410901),
  ('Ibiza', 'Illes Balears', 38.910072, 1.430454),
  ('Randa', 'Illes Balears', 39.526761, 2.9150423),
  ('S''Arracó', 'Illes Balears', 39.5784279, 2.39134),
  ('Sant Antoni de Portmany', 'Illes Balears', 38.9830568, 1.3009485),
  ('Sant Joan', 'Illes Balears', 39.5971435, 3.0379931),
  ('Selva', 'Illes Balears', 39.7544816, 2.9007178),
  ('Sóller', 'Illes Balears', 39.7663047, 2.7150538),
  ('Valldemossa', 'Illes Balears', 39.7108465, 2.6230264),
  ('Vilafranca', 'Illes Balears', 39.5703083, 3.0889977)
on conflict (city, province) do nothing;
