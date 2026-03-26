import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  RACE_DATA_FORMAT_VERSION,
  normalizeRaceDataDiskSlug,
  raceDataArtifactBasename,
  raceDataJsonFileRepoRelativePath,
  raceDataJsonFilename,
  raceDataMarkdownFileRepoRelativePath,
  raceDataMarkdownFilename,
  stripRaceDataUrlEncodedSchemePrefix,
  stripRaceDataWwwHostPrefix,
} from './race-data-version';

describe('stripRaceDataUrlEncodedSchemePrefix', () => {
  it('strips https:-- and http:--', () => {
    expect(stripRaceDataUrlEncodedSchemePrefix('https:--trailse-com')).toBe(
      'trailse-com',
    );
    expect(stripRaceDataUrlEncodedSchemePrefix('http:--voltaperamola-cat')).toBe(
      'voltaperamola-cat',
    );
  });

  it('is a no-op when absent', () => {
    expect(stripRaceDataUrlEncodedSchemePrefix('trailse-com')).toBe(
      'trailse-com',
    );
  });
});

describe('stripRaceDataWwwHostPrefix', () => {
  it('strips leading www-', () => {
    expect(stripRaceDataWwwHostPrefix('www-bacanardtrail-com')).toBe(
      'bacanardtrail-com',
    );
  });

  it('is a no-op when absent', () => {
    expect(stripRaceDataWwwHostPrefix('trailse-com')).toBe('trailse-com');
  });
});

describe('normalizeRaceDataDiskSlug', () => {
  it('strips scheme then www-', () => {
    expect(normalizeRaceDataDiskSlug('https:--www-example-com')).toBe(
      'example-com',
    );
  });
});

describe('raceDataArtifactBasename', () => {
  it('appends default version', () => {
    expect(raceDataArtifactBasename('trailse-com')).toBe(
      `trailse-com-${RACE_DATA_FORMAT_VERSION}`,
    );
  });

  it('normalizes slug (scheme and www-)', () => {
    expect(raceDataArtifactBasename('https:--www-foo-com')).toBe(
      `foo-com-${RACE_DATA_FORMAT_VERSION}`,
    );
  });

  it('accepts explicit version', () => {
    expect(raceDataArtifactBasename('lloretrail', 'v2')).toBe('lloretrail-v2');
  });

  it('trims slug and version', () => {
    expect(raceDataArtifactBasename('  foo  ', '  v3  ')).toBe('foo-v3');
  });

  it('rejects empty slug', () => {
    expect(() => raceDataArtifactBasename('')).toThrow(
      'raceDataArtifactBasename: slug must be non-empty',
    );
  });

  it('rejects empty version', () => {
    expect(() => raceDataArtifactBasename('x', '')).toThrow(
      'raceDataArtifactBasename: version must be non-empty',
    );
  });
});

describe('raceDataJsonFilename / raceDataMarkdownFilename', () => {
  it('adds extension', () => {
    expect(raceDataJsonFilename('a')).toBe(`a-${RACE_DATA_FORMAT_VERSION}.json`);
    expect(raceDataMarkdownFilename('a')).toBe(
      `a-${RACE_DATA_FORMAT_VERSION}.md`,
    );
  });
});

describe('race data repo paths', () => {
  it('resolves json and markdown under races/<name>/<format>/', () => {
    expect(raceDataJsonFileRepoRelativePath('trailse-com')).toBe(
      path.join(
        'data',
        'races',
        'trailse-com',
        'json',
        `trailse-com-${RACE_DATA_FORMAT_VERSION}.json`,
      ),
    );
    expect(raceDataMarkdownFileRepoRelativePath('trailse-com')).toBe(
      path.join(
        'data',
        'races',
        'trailse-com',
        'markdown',
        `trailse-com-${RACE_DATA_FORMAT_VERSION}.md`,
      ),
    );
  });
});
