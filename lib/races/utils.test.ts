import { describe, it, expect } from 'vitest';
import {
  generateRaceSlug,
  getRaceBySlug,
  getAllRaceSlugs,
  getDisplayPrice,
} from './utils';
import type { TrailRace } from '@/types/race.types';

describe('generateRaceSlug', () => {
  describe('basic transformations', () => {
    it('should convert to lowercase', () => {
      expect(generateRaceSlug('ULTRA TRAIL')).toBe('ultra-trail');
      expect(generateRaceSlug('Trail Running')).toBe('trail-running');
    });

    it('should convert spaces to hyphens', () => {
      expect(generateRaceSlug('Trail Running Race')).toBe('trail-running-race');
      expect(generateRaceSlug('Ultra Trail Barcelona')).toBe('ultra-trail-barcelona');
    });

    it('should remove special characters', () => {
      expect(generateRaceSlug('Trail & Run')).toBe('trail-run');
      expect(generateRaceSlug('Race@2024')).toBe('race-2024');
      expect(generateRaceSlug('Ultra/Trail')).toBe('ultra-trail');
    });

    it('should preserve numbers', () => {
      expect(generateRaceSlug('Trail 100km')).toBe('trail-100km');
      expect(generateRaceSlug('Race 2024')).toBe('race-2024');
    });
  });

  describe('diacritics handling', () => {
    it('should remove Spanish diacritics', () => {
      expect(generateRaceSlug('Carrera de Montaña')).toBe('carrera-de-montana');
      expect(generateRaceSlug('Pirineo Atlético')).toBe('pirineo-atletico');
      expect(generateRaceSlug('Málaga Trail')).toBe('malaga-trail');
      expect(generateRaceSlug('José Martínez')).toBe('jose-martinez');
    });

    it('should remove Catalan diacritics', () => {
      expect(generateRaceSlug('Montserrat Trail')).toBe('montserrat-trail');
      expect(generateRaceSlug('Cursa de Montanya')).toBe('cursa-de-montanya');
      expect(generateRaceSlug('Marató Catalunya')).toBe('marato-catalunya');
    });

    it('should handle ñ correctly', () => {
      expect(generateRaceSlug('España Trail')).toBe('espana-trail');
      expect(generateRaceSlug('Montaña Pirenaica')).toBe('montana-pirenaica');
    });

    it('should handle mixed diacritics', () => {
      expect(generateRaceSlug('Pirineo Catalán Español')).toBe('pirineo-catalan-espanol');
    });
  });

  describe('special symbols removal', () => {
    it('should remove registered trademark symbol', () => {
      expect(generateRaceSlug('Ultra Trail®')).toBe('ultra-trail');
    });

    it('should remove copyright symbol', () => {
      expect(generateRaceSlug('Trail Race©')).toBe('trail-race');
    });

    it('should remove trademark symbol', () => {
      expect(generateRaceSlug('Mountain Run™')).toBe('mountain-run');
    });
  });

  describe('hyphen normalization', () => {
    it('should collapse multiple spaces to single hyphen', () => {
      expect(generateRaceSlug('Trail   Running')).toBe('trail-running');
      expect(generateRaceSlug('Ultra    Trail    Race')).toBe('ultra-trail-race');
    });

    it('should remove leading hyphens', () => {
      expect(generateRaceSlug(' Trail Running')).toBe('trail-running');
      expect(generateRaceSlug('  Ultra Trail')).toBe('ultra-trail');
    });

    it('should remove trailing hyphens', () => {
      expect(generateRaceSlug('Trail Running ')).toBe('trail-running');
      expect(generateRaceSlug('Ultra Trail  ')).toBe('ultra-trail');
    });

    it('should remove both leading and trailing hyphens', () => {
      expect(generateRaceSlug(' Trail Running ')).toBe('trail-running');
    });

    it('should replace multiple consecutive special characters with single hyphen', () => {
      expect(generateRaceSlug('Trail & Run!')).toBe('trail-run');
      expect(generateRaceSlug('Ultra@Trail#Race')).toBe('ultra-trail-race');
    });
  });

  describe('edge cases', () => {
    it('should handle missing names', () => {
      expect(generateRaceSlug(null)).toBe('');
      expect(generateRaceSlug(undefined)).toBe('');
    });

    it('should handle empty string', () => {
      expect(generateRaceSlug('')).toBe('');
    });

    it('should handle string with only special characters', () => {
      expect(generateRaceSlug('!@#$%^&*()')).toBe('');
    });

    it('should handle string with only spaces', () => {
      expect(generateRaceSlug('   ')).toBe('');
    });

    it('should handle single character', () => {
      expect(generateRaceSlug('a')).toBe('a');
      expect(generateRaceSlug('A')).toBe('a');
    });

    it('should handle numbers only', () => {
      expect(generateRaceSlug('100')).toBe('100');
      expect(generateRaceSlug('2024')).toBe('2024');
    });

    it('should handle mixed alphanumeric', () => {
      expect(generateRaceSlug('100km trail')).toBe('100km-trail');
    });
  });

  describe('idempotency', () => {
    it('should produce same result when run twice', () => {
      const input = 'Ultra Trail® Barcelona';
      const firstRun = generateRaceSlug(input);
      const secondRun = generateRaceSlug(firstRun);
      expect(firstRun).toBe(secondRun);
    });

    it('should produce same result for already-slugified input', () => {
      const slug = 'ultra-trail-barcelona';
      expect(generateRaceSlug(slug)).toBe(slug);
    });
  });

  describe('real-world examples', () => {
    it('should handle typical Spanish race names', () => {
      expect(generateRaceSlug('Ultra Trail Montserrat')).toBe('ultra-trail-montserrat');
      expect(generateRaceSlug('Marató dels Pirineus')).toBe('marato-dels-pirineus');
      expect(generateRaceSlug('Trail Cap de Creus')).toBe('trail-cap-de-creus');
    });

    it('should handle race names with distances', () => {
      expect(generateRaceSlug('Ultra Trail 100km')).toBe('ultra-trail-100km');
      expect(generateRaceSlug('Marathon 42k')).toBe('marathon-42k');
    });
  });
});

describe('getRaceBySlug', () => {
  const mockRaces: TrailRace[] = [
    {
      id: '1',
      name: 'Ultra Trail Barcelona',
      date: '2024-06-15',
      distanceKm: 100,
      elevationGainM: 5000,
      city: 'Barcelona',
      province: 'Barcelona',
      description: null,
      organizerId: null,
    },
    {
      id: '2',
      name: 'Marató dels Pirineus',
      date: '2024-07-20',
      distanceKm: 42,
      elevationGainM: 2500,
      city: 'Tremp',
      province: 'Lleida',
      description: null,
      organizerId: null,
    },
    {
      id: '3',
      name: 'Trail Montserrat®',
      date: '2024-05-10',
      distanceKm: 25,
      elevationGainM: 1200,
      city: 'Monistrol',
      province: 'Barcelona',
      description: null,
      organizerId: null,
    },
  ];

  it('should find race by exact slug match', () => {
    const race = getRaceBySlug('ultra-trail-barcelona', mockRaces);
    expect(race).not.toBeNull();
    expect(race?.id).toBe('1');
    expect(race?.name).toBe('Ultra Trail Barcelona');
  });

  it('should find race with diacritics', () => {
    const race = getRaceBySlug('marato-dels-pirineus', mockRaces);
    expect(race).not.toBeNull();
    expect(race?.id).toBe('2');
    expect(race?.name).toBe('Marató dels Pirineus');
  });

  it('should find race with special symbols removed', () => {
    const race = getRaceBySlug('trail-montserrat', mockRaces);
    expect(race).not.toBeNull();
    expect(race?.id).toBe('3');
    expect(race?.name).toBe('Trail Montserrat®');
  });

  it('should return null when race not found', () => {
    const race = getRaceBySlug('non-existent-race', mockRaces);
    expect(race).toBeNull();
  });

  it('should return null for empty slug', () => {
    const race = getRaceBySlug('', mockRaces);
    expect(race).toBeNull();
  });

  it('should return null when races array is empty', () => {
    const race = getRaceBySlug('ultra-trail-barcelona', []);
    expect(race).toBeNull();
  });

  it('should handle case-insensitive matching (via slug generation)', () => {
    // The slug is generated from the race name, so this tests the full flow
    const race = getRaceBySlug('ultra-trail-barcelona', mockRaces);
    expect(race).not.toBeNull();
  });
});

describe('getAllRaceSlugs', () => {
  const mockRaces: TrailRace[] = [
    {
      id: '1',
      name: 'Ultra Trail Barcelona',
      date: '2024-06-15',
      distanceKm: 100,
      elevationGainM: 5000,
      city: 'Barcelona',
      province: 'Barcelona',
      description: null,
      organizerId: null,
    },
    {
      id: '2',
      name: 'Marató dels Pirineus',
      date: '2024-07-20',
      distanceKm: 42,
      elevationGainM: 2500,
      city: 'Tremp',
      province: 'Lleida',
      description: null,
      organizerId: null,
    },
  ];

  it('should return array of slugs for all races', () => {
    const slugs = getAllRaceSlugs(mockRaces);
    expect(slugs).toEqual([
      'ultra-trail-barcelona',
      'marato-dels-pirineus',
    ]);
  });

  it('should return empty array for empty races array', () => {
    const slugs = getAllRaceSlugs([]);
    expect(slugs).toEqual([]);
  });

  it('should handle races with special characters', () => {
    const racesWithSpecialChars: TrailRace[] = [
      { ...mockRaces[0], name: 'Trail & Run®' },
    ];
    const slugs = getAllRaceSlugs(racesWithSpecialChars);
    expect(slugs).toEqual(['trail-run']);
  });
});

describe('getDisplayPrice', () => {
  it('should return first price from array', () => {
    const priceArray = [{ price_eur: 50 }, { price_eur: 60 }];
    expect(getDisplayPrice(priceArray)).toBe(50);
  });

  it('should return null for null input', () => {
    expect(getDisplayPrice(null)).toBeNull();
  });

  it('should return null for undefined input', () => {
    expect(getDisplayPrice(undefined)).toBeNull();
  });

  it('should return null for empty array', () => {
    expect(getDisplayPrice([])).toBeNull();
  });

  it('should handle single price in array', () => {
    const priceArray = [{ price_eur: 75 }];
    expect(getDisplayPrice(priceArray)).toBe(75);
  });

  it('should handle zero price', () => {
    const priceArray = [{ price_eur: 0 }];
    expect(getDisplayPrice(priceArray)).toBe(0);
  });

  it('should return null for non-array input', () => {
    expect(getDisplayPrice('not-an-array' as unknown as Array<{ price_eur: number }>)).toBeNull();
  });
});
