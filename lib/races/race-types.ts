export const RACE_CATEGORY_SLUGS = [
  'ultra-trail',
  'maraton',
  'media-maraton',
  'marcha',
  'km-vertical',
  'backyard',
] as const;

export type RaceCategorySlug = (typeof RACE_CATEGORY_SLUGS)[number];

const PRIMARY_RACE_CATEGORY_PRIORITY: RaceCategorySlug[] = [
  'marcha',
  'backyard',
  'km-vertical',
  'ultra-trail',
  'maraton',
  'media-maraton',
];

export type RaceDisplayCategoryKey =
  | 'ultra'
  | 'maraton'
  | 'media'
  | 'marcha'
  | 'vk'
  | 'backyard'
  | 'trail'
  | 'sprint';

export type RaceCategoryLabelKey = Exclude<RaceDisplayCategoryKey, 'trail' | 'sprint'>;

export interface RaceCategoryConfig {
  slug: RaceCategorySlug;
  namespace: string;
  labelKey: RaceCategoryLabelKey;
  matches: (race: RaceCategoryInput) => boolean;
}

type RaceCategoryInput = {
  name: string | null;
  distanceKm: number;
  elevationGainM: number | null;
};

const VK_KEYWORDS = ['kilómetro vertical', 'quilòmetre vertical', 'km vertical'];
const MARCHA_KEYWORDS = ['marcha', 'marxa', 'caminada'];
const VK_DISTANCE_MAX = 4;
const VK_ELEVATION_MIN = 600;

function normalizedName(race: Pick<RaceCategoryInput, 'name'>): string {
  return race.name?.toLowerCase() ?? '';
}

export function isNonCompetitiveRace(
  race: Pick<RaceCategoryInput, 'name'>,
): boolean {
  return MARCHA_KEYWORDS.some((keyword) =>
    normalizedName(race).includes(keyword),
  );
}

function isVkRace(race: RaceCategoryInput): boolean {
  const lowerName = normalizedName(race);
  const hasKeyword =
    VK_KEYWORDS.some((kw) => lowerName.includes(kw)) ||
    lowerName.includes(' kv ') ||
    lowerName.startsWith('kv ') ||
    lowerName.endsWith(' kv');
  const hasRatio =
    race.distanceKm < VK_DISTANCE_MAX &&
    race.elevationGainM !== null &&
    race.elevationGainM >= VK_ELEVATION_MIN;

  return hasKeyword || hasRatio;
}

export const RACE_CATEGORY_CONFIGS: Record<RaceCategorySlug, RaceCategoryConfig> = {
  marcha: {
    slug: 'marcha',
    namespace: 'marcha',
    labelKey: 'marcha',
    matches: isNonCompetitiveRace,
  },
  backyard: {
    slug: 'backyard',
    namespace: 'backyard',
    labelKey: 'backyard',
    matches: (race) => normalizedName(race).includes('backyard'),
  },
  'km-vertical': {
    slug: 'km-vertical',
    namespace: 'kmVertical',
    labelKey: 'vk',
    matches: isVkRace,
  },
  'ultra-trail': {
    slug: 'ultra-trail',
    namespace: 'ultraTrail',
    labelKey: 'ultra',
    matches: (race) => race.distanceKm >= 50,
  },
  maraton: {
    slug: 'maraton',
    namespace: 'maraton',
    labelKey: 'maraton',
    matches: (race) => race.distanceKm >= 40 && race.distanceKm < 50,
  },
  'media-maraton': {
    slug: 'media-maraton',
    namespace: 'mediaMaraton',
    labelKey: 'media',
    matches: (race) => race.distanceKm >= 20 && race.distanceKm <= 24,
  },
};

export function isRaceCategorySlug(value: string): value is RaceCategorySlug {
  return RACE_CATEGORY_SLUGS.includes(value as RaceCategorySlug);
}

export function getTypePath(locale: string, typeSlug: RaceCategorySlug): string {
  return `/${locale}/t/${typeSlug}`;
}

export function getRaceCategoryConfig(slug: RaceCategorySlug): RaceCategoryConfig {
  return RACE_CATEGORY_CONFIGS[slug];
}

export function getRaceCategorySlugsForRace(
  race: RaceCategoryInput,
): RaceCategorySlug[] {
  return RACE_CATEGORY_SLUGS.filter((slug) => getRaceCategoryConfig(slug).matches(race));
}

export function getPrimaryPublicRaceCategory(
  race: RaceCategoryInput,
): RaceCategoryConfig | null {
  const slug = PRIMARY_RACE_CATEGORY_PRIORITY.find((categorySlug) =>
    getRaceCategoryConfig(categorySlug).matches(race),
  );
  return slug ? getRaceCategoryConfig(slug) : null;
}

export function getRaceDisplayCategoryKey(
  race: RaceCategoryInput,
): RaceDisplayCategoryKey {
  const publicCategory = getPrimaryPublicRaceCategory(race);
  if (publicCategory) {
    return publicCategory.labelKey;
  }

  if (race.distanceKm >= 20) return 'media';
  if (race.distanceKm >= 10) return 'trail';
  return 'sprint';
}
