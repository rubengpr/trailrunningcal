import path from 'node:path';

export const RACE_DATA_FORMAT_VERSION = 'v1' as const;

export type RaceDataFormatVersion = typeof RACE_DATA_FORMAT_VERSION;

/** Repo-root-relative segment: `data/races/<race>/…` */
export const RACE_DATA_REPO_ROOT_SEGMENT = 'data' as const;
export const RACE_DATA_RACES_SEGMENT = 'races' as const;

export type RaceDataFileFormat = 'json' | 'markdown';

/** Removes legacy `http:--` / `https:--` URL-encoding prefix from a slug (host path only, e.g. `trailse-com`). */
export function stripRaceDataUrlEncodedSchemePrefix(slug: string): string {
  return slug.replace(/^(https|http):--/i, '');
}

/** Removes a single leading `www-` from the host-style slug (case-insensitive). */
export function stripRaceDataWwwHostPrefix(slug: string): string {
  return slug.replace(/^www-/i, '');
}

/**
 * Canonical host key for on-disk race files: no URL scheme encoding, no `www-` prefix.
 */
export function normalizeRaceDataDiskSlug(slug: string): string {
  return stripRaceDataWwwHostPrefix(stripRaceDataUrlEncodedSchemePrefix(slug.trim()));
}

/**
 * Folder name under `data/races/` for this race (normalized slug).
 */
export function raceDataRaceFolderName(slug: string): string {
  return normalizeRaceDataDiskSlug(slug);
}

/**
 * Directory path segments after `data/`: `races/<race>/<format>`.
 */
export function raceDataFormatDirParts(
  slug: string,
  format: RaceDataFileFormat,
): string[] {
  const race = raceDataRaceFolderName(slug);
  return [RACE_DATA_RACES_SEGMENT, race, format];
}

/**
 * Repo-relative directory: `data/races/<race>/<format>`.
 */
export function raceDataFormatDirPath(
  slug: string,
  format: RaceDataFileFormat,
): string {
  return path.join(
    RACE_DATA_REPO_ROOT_SEGMENT,
    ...raceDataFormatDirParts(slug, format),
  );
}

/**
 * Repo-relative path to the JSON crawl/agent file for a race.
 * Layout: `data/races/<race-name>/json/<race-name>-vN.json`.
 */
export function raceDataJsonFileRepoRelativePath(
  slug: string,
  version: string = RACE_DATA_FORMAT_VERSION,
): string {
  return path.join(
    raceDataFormatDirPath(slug, 'json'),
    `${raceDataArtifactBasename(slug, version)}.json`,
  );
}

/**
 * Repo-relative path to the markdown crawl file for a race.
 * Layout: `data/races/<race-name>/markdown/<race-name>-vN.md`.
 */
export function raceDataMarkdownFileRepoRelativePath(
  slug: string,
  version: string = RACE_DATA_FORMAT_VERSION,
): string {
  return path.join(
    raceDataFormatDirPath(slug, 'markdown'),
    `${raceDataArtifactBasename(slug, version)}.md`,
  );
}

/**
 * Basename (no extension) for a versioned race artifact under `json/` or `markdown/`.
 * The slug is normalized with {@link normalizeRaceDataDiskSlug} (scheme + `www-` stripped).
 */
export function raceDataArtifactBasename(
  slug: string,
  version: string = RACE_DATA_FORMAT_VERSION,
): string {
  const normalizedSlug = normalizeRaceDataDiskSlug(slug);
  if (normalizedSlug === '') {
    throw new Error('raceDataArtifactBasename: slug must be non-empty');
  }
  const trimmedVersion = version.trim();
  if (trimmedVersion === '') {
    throw new Error('raceDataArtifactBasename: version must be non-empty');
  }
  return `${normalizedSlug}-${trimmedVersion}`;
}

export function raceDataJsonFilename(
  slug: string,
  version: string = RACE_DATA_FORMAT_VERSION,
): string {
  return `${raceDataArtifactBasename(slug, version)}.json`;
}

export function raceDataMarkdownFilename(
  slug: string,
  version: string = RACE_DATA_FORMAT_VERSION,
): string {
  return `${raceDataArtifactBasename(slug, version)}.md`;
}
