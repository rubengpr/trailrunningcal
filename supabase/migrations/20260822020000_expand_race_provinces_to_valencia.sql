alter table public.races
  drop constraint if exists races_province_check;

alter table public.races
  add constraint races_province_check
  check (
    province = any (
      array[
        'Barcelona',
        'Tarragona',
        'Girona',
        'Lleida',
        'Andorra',
        'Alicante',
        'Castellón',
        'Valencia'
      ]
    )
  );
