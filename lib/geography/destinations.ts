import { locales } from '@/i18n';
import { BASE_URL } from '@/lib/config';

export const GEOGRAPHY = {
  regions: {
    andalusia: { slug: 'andalucia' }, aragon: { slug: 'aragon' }, asturias: { slug: 'principado-de-asturias' }, balearicIslands: { slug: 'illes-balears' }, canaryIslands: { slug: 'canarias' }, cantabria: { slug: 'cantabria' }, castileAndLeon: { slug: 'castilla-y-leon' }, castileLaMancha: { slug: 'castilla-la-mancha' }, catalonia: { slug: 'cataluna' }, ceuta: { slug: 'ceuta' }, extremadura: { slug: 'extremadura' }, galicia: { slug: 'galicia' }, madrid: { slug: 'comunidad-de-madrid' }, melilla: { slug: 'melilla' }, murcia: { slug: 'region-de-murcia' }, navarre: { slug: 'navarra' }, basqueCountry: { slug: 'pais-vasco' }, laRioja: { slug: 'la-rioja' }, valencianCommunity: { slug: 'comunidad-valenciana' }, andorra: { slug: 'andorra' },
  },
  provinces: {
    aCoruna: { slug: 'a-coruna', regionId: 'galicia', dbName: 'A Coruña' }, albacete: { slug: 'albacete', regionId: 'castileLaMancha', dbName: 'Albacete' }, alicante: { slug: 'alicante', regionId: 'valencianCommunity', dbName: 'Alicante' }, almeria: { slug: 'almeria', regionId: 'andalusia', dbName: 'Almería' }, andorra: { slug: 'andorra', regionId: 'andorra', dbName: 'Andorra' }, araba: { slug: 'araba', regionId: 'basqueCountry', dbName: 'Araba' }, asturias: { slug: 'asturias', regionId: 'asturias', dbName: 'Asturias' }, avila: { slug: 'avila', regionId: 'castileAndLeon', dbName: 'Ávila' }, badajoz: { slug: 'badajoz', regionId: 'extremadura', dbName: 'Badajoz' }, barcelona: { slug: 'barcelona', regionId: 'catalonia', dbName: 'Barcelona' }, bizkaia: { slug: 'bizkaia', regionId: 'basqueCountry', dbName: 'Bizkaia' }, burgos: { slug: 'burgos', regionId: 'castileAndLeon', dbName: 'Burgos' }, caceres: { slug: 'caceres', regionId: 'extremadura', dbName: 'Cáceres' }, cadiz: { slug: 'cadiz', regionId: 'andalusia', dbName: 'Cádiz' }, cantabria: { slug: 'cantabria', regionId: 'cantabria', dbName: 'Cantabria' }, castellon: { slug: 'castellon', regionId: 'valencianCommunity', dbName: 'Castellón' }, ceuta: { slug: 'ceuta', regionId: 'ceuta', dbName: 'Ceuta' }, ciudadReal: { slug: 'ciudad-real', regionId: 'castileLaMancha', dbName: 'Ciudad Real' }, cordoba: { slug: 'cordoba', regionId: 'andalusia', dbName: 'Córdoba' }, cuenca: { slug: 'cuenca', regionId: 'castileLaMancha', dbName: 'Cuenca' }, gipuzkoa: { slug: 'gipuzkoa', regionId: 'basqueCountry', dbName: 'Gipuzkoa' }, girona: { slug: 'girona', regionId: 'catalonia', dbName: 'Girona' }, granada: { slug: 'granada', regionId: 'andalusia', dbName: 'Granada' }, guadalajara: { slug: 'guadalajara', regionId: 'castileLaMancha', dbName: 'Guadalajara' }, huelva: { slug: 'huelva', regionId: 'andalusia', dbName: 'Huelva' }, huesca: { slug: 'huesca', regionId: 'aragon', dbName: 'Huesca' }, illesBalears: { slug: 'illes-balears', regionId: 'balearicIslands', dbName: 'Illes Balears' }, jaen: { slug: 'jaen', regionId: 'andalusia', dbName: 'Jaén' }, laRioja: { slug: 'la-rioja', regionId: 'laRioja', dbName: 'La Rioja' }, lasPalmas: { slug: 'las-palmas', regionId: 'canaryIslands', dbName: 'Las Palmas' }, leon: { slug: 'leon', regionId: 'castileAndLeon', dbName: 'León' }, lleida: { slug: 'lleida', regionId: 'catalonia', dbName: 'Lleida' }, lugo: { slug: 'lugo', regionId: 'galicia', dbName: 'Lugo' }, madrid: { slug: 'madrid', regionId: 'madrid', dbName: 'Madrid' }, malaga: { slug: 'malaga', regionId: 'andalusia', dbName: 'Málaga' }, melilla: { slug: 'melilla', regionId: 'melilla', dbName: 'Melilla' }, murcia: { slug: 'murcia', regionId: 'murcia', dbName: 'Murcia' }, navarra: { slug: 'navarra', regionId: 'navarre', dbName: 'Navarra' }, ourense: { slug: 'ourense', regionId: 'galicia', dbName: 'Ourense' }, palencia: { slug: 'palencia', regionId: 'castileAndLeon', dbName: 'Palencia' }, pontevedra: { slug: 'pontevedra', regionId: 'galicia', dbName: 'Pontevedra' }, salamanca: { slug: 'salamanca', regionId: 'castileAndLeon', dbName: 'Salamanca' }, santaCruzDeTenerife: { slug: 'santa-cruz-de-tenerife', regionId: 'canaryIslands', dbName: 'Santa Cruz de Tenerife' }, segovia: { slug: 'segovia', regionId: 'castileAndLeon', dbName: 'Segovia' }, sevilla: { slug: 'sevilla', regionId: 'andalusia', dbName: 'Sevilla' }, soria: { slug: 'soria', regionId: 'castileAndLeon', dbName: 'Soria' }, tarragona: { slug: 'tarragona', regionId: 'catalonia', dbName: 'Tarragona' }, teruel: { slug: 'teruel', regionId: 'aragon', dbName: 'Teruel' }, toledo: { slug: 'toledo', regionId: 'castileLaMancha', dbName: 'Toledo' }, valencia: { slug: 'valencia', regionId: 'valencianCommunity', dbName: 'Valencia' }, valladolid: { slug: 'valladolid', regionId: 'castileAndLeon', dbName: 'Valladolid' }, zamora: { slug: 'zamora', regionId: 'castileAndLeon', dbName: 'Zamora' }, zaragoza: { slug: 'zaragoza', regionId: 'aragon', dbName: 'Zaragoza' },
  },
} as const;

export type RegionId = keyof typeof GEOGRAPHY.regions;
export type DestinationProvinceId = keyof typeof GEOGRAPHY.provinces;
export type Region = (typeof GEOGRAPHY.regions)[RegionId];
export type DestinationProvince = (typeof GEOGRAPHY.provinces)[DestinationProvinceId];

export const REGION_IDS = Object.keys(GEOGRAPHY.regions) as RegionId[];
export const DESTINATION_PROVINCE_IDS = Object.keys(GEOGRAPHY.provinces) as DestinationProvinceId[];
export const DESTINATION_PROVINCE_GROUPS = REGION_IDS.map((regionId) => ({
  regionId,
  provinceIds: DESTINATION_PROVINCE_IDS.filter(
    (provinceId) => GEOGRAPHY.provinces[provinceId].regionId === regionId,
  ),
})).filter((group) => group.provinceIds.length > 0);

export function getDestinationPath(locale: string, regionId: RegionId, provinceId: DestinationProvinceId): string {
  return `/${locale}/d/${GEOGRAPHY.regions[regionId].slug}/${GEOGRAPHY.provinces[provinceId].slug}`;
}

export function buildDestinationAlternateLinks(regionId: RegionId, provinceId: DestinationProvinceId): Record<string, string> {
  const alternates: Record<string, string> = {};
  for (const locale of locales) alternates[locale] = `${BASE_URL}${getDestinationPath(locale, regionId, provinceId)}`;
  alternates['x-default'] = `${BASE_URL}${getDestinationPath('es', regionId, provinceId)}`;
  return alternates;
}

export function getRegionBySlug(slug: string): { id: RegionId; region: Region } | null {
  const id = REGION_IDS.find((regionId) => GEOGRAPHY.regions[regionId].slug === slug);
  return id ? { id, region: GEOGRAPHY.regions[id] } : null;
}

export function getProvinceBySlug(slug: string): { id: DestinationProvinceId; province: DestinationProvince } | null {
  const id = DESTINATION_PROVINCE_IDS.find((provinceId) => GEOGRAPHY.provinces[provinceId].slug === slug);
  return id ? { id, province: GEOGRAPHY.provinces[id] } : null;
}

export function getDestinationBySlugs(regionSlug: string, provinceSlug: string): { regionId: RegionId; provinceId: DestinationProvinceId; region: Region; province: DestinationProvince } | null {
  const regionMatch = getRegionBySlug(regionSlug);
  const provinceMatch = getProvinceBySlug(provinceSlug);
  if (!regionMatch || !provinceMatch || provinceMatch.province.regionId !== regionMatch.id) return null;
  return { regionId: regionMatch.id, provinceId: provinceMatch.id, region: regionMatch.region, province: provinceMatch.province };
}

export function getProvinceByDbName(dbName: string): { id: DestinationProvinceId; province: DestinationProvince } | null {
  const id = DESTINATION_PROVINCE_IDS.find((provinceId) => GEOGRAPHY.provinces[provinceId].dbName === dbName);
  return id ? { id, province: GEOGRAPHY.provinces[id] } : null;
}
