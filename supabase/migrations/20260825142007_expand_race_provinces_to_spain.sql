alter table public.races
  drop constraint if exists races_province_check;

alter table public.races
  add constraint races_province_check
  check (
    province = any (
      array[
        'A Coruña',
        'Albacete',
        'Alicante',
        'Almería',
        'Andorra',
        'Araba/Álava',
        'Asturias',
        'Ávila',
        'Badajoz',
        'Barcelona',
        'Bizkaia',
        'Burgos',
        'Cáceres',
        'Cádiz',
        'Cantabria',
        'Castellón',
        'Ceuta',
        'Ciudad Real',
        'Córdoba',
        'Cuenca',
        'Gipuzkoa',
        'Girona',
        'Granada',
        'Guadalajara',
        'Huelva',
        'Huesca',
        'Illes Balears',
        'Jaén',
        'La Rioja',
        'Las Palmas',
        'León',
        'Lleida',
        'Lugo',
        'Madrid',
        'Málaga',
        'Melilla',
        'Murcia',
        'Navarra',
        'Ourense',
        'Palencia',
        'Pontevedra',
        'Salamanca',
        'Santa Cruz de Tenerife',
        'Segovia',
        'Sevilla',
        'Soria',
        'Tarragona',
        'Teruel',
        'Toledo',
        'Valencia',
        'Valladolid',
        'Zamora',
        'Zaragoza'
      ]
    )
  );
