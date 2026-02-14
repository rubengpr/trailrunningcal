import { describe, it, expect } from 'vitest';
import { raceRowToTrailRace } from './races';
import type { RaceRow, TrailRace } from '@/types/race.types';

describe('raceRowToTrailRace', () => {
  describe('complete transformation', () => {
    it('should transform all fields from RaceRow to TrailRace', () => {
      const row: RaceRow = {
        id: 'race-123',
        name: 'Ultra Trail Barcelona',
        date: '2024-06-15',
        distance_km: 100,
        elevation_gain_m: 5000,
        race_tiers: [{ price_eur: 75 }, { price_eur: 90 }],
        city: 'Barcelona',
        province: 'Barcelona',
        description: 'Amazing trail race in the mountains',
        map_url: 'https://example.com/map',
        image_path: '/images/race.jpg',
        services: ['parking', 'showers', 'medical'],
        results_urls: [
          { year: 2023, url: 'https://example.com/results/2023' },
          { year: 2024, url: 'https://example.com/results/2024' },
        ],
        sponsors: ['Sponsor A', 'Sponsor B'],
        organizer_id: 'org-456',
        website_url: 'https://example.com',
      };

      const result = raceRowToTrailRace(row);

      expect(result).toEqual({
        id: 'race-123',
        name: 'Ultra Trail Barcelona',
        date: '2024-06-15',
        distanceKm: 100,
        elevationGainM: 5000,
        priceEur: [{ price_eur: 75 }, { price_eur: 90 }],
        city: 'Barcelona',
        province: 'Barcelona',
        description: 'Amazing trail race in the mountains',
        mapUrl: 'https://example.com/map',
        imagePath: '/images/race.jpg',
        services: ['parking', 'showers', 'medical'],
        resultsUrls: [
          { year: 2023, url: 'https://example.com/results/2023' },
          { year: 2024, url: 'https://example.com/results/2024' },
        ],
        sponsors: ['Sponsor A', 'Sponsor B'],
        organizerId: 'org-456',
        websiteUrl: 'https://example.com',
      });
    });
  });

  describe('snake_case to camelCase conversion', () => {
    it('should convert distance_km to distanceKm', () => {
      const row: RaceRow = {
        id: '1',
        name: 'Test Race',
        date: null,
        distance_km: 50,
        elevation_gain_m: null,
        race_tiers: null,
        city: 'Test City',
        province: 'Test Province',
        description: null,
        organizer_id: null,
      };

      const result = raceRowToTrailRace(row);
      expect(result.distanceKm).toBe(50);
      expect(result).not.toHaveProperty('distance_km');
    });

    it('should convert elevation_gain_m to elevationGainM', () => {
      const row: RaceRow = {
        id: '1',
        name: 'Test Race',
        date: null,
        distance_km: 50,
        elevation_gain_m: 2500,
        race_tiers: null,
        city: 'Test City',
        province: 'Test Province',
        description: null,
        organizer_id: null,
      };

      const result = raceRowToTrailRace(row);
      expect(result.elevationGainM).toBe(2500);
      expect(result).not.toHaveProperty('elevation_gain_m');
    });

    it('should convert race_tiers to priceEur', () => {
      const row: RaceRow = {
        id: '1',
        name: 'Test Race',
        date: null,
        distance_km: 50,
        elevation_gain_m: null,
        race_tiers: [{ price_eur: 60 }],
        city: 'Test City',
        province: 'Test Province',
        description: null,
        organizer_id: null,
      };

      const result = raceRowToTrailRace(row);
      expect(result.priceEur).toEqual([{ price_eur: 60 }]);
      expect(result).not.toHaveProperty('race_tiers');
    });

    it('should convert map_url to mapUrl', () => {
      const row: RaceRow = {
        id: '1',
        name: 'Test Race',
        date: null,
        distance_km: 50,
        elevation_gain_m: null,
        race_tiers: null,
        city: 'Test City',
        province: 'Test Province',
        description: null,
        map_url: 'https://example.com/map',
        organizer_id: null,
      };

      const result = raceRowToTrailRace(row);
      expect(result.mapUrl).toBe('https://example.com/map');
      expect(result).not.toHaveProperty('map_url');
    });

    it('should convert image_path to imagePath', () => {
      const row: RaceRow = {
        id: '1',
        name: 'Test Race',
        date: null,
        distance_km: 50,
        elevation_gain_m: null,
        race_tiers: null,
        city: 'Test City',
        province: 'Test Province',
        description: null,
        image_path: '/images/race.jpg',
        organizer_id: null,
      };

      const result = raceRowToTrailRace(row);
      expect(result.imagePath).toBe('/images/race.jpg');
      expect(result).not.toHaveProperty('image_path');
    });

    it('should convert results_urls to resultsUrls', () => {
      const row: RaceRow = {
        id: '1',
        name: 'Test Race',
        date: null,
        distance_km: 50,
        elevation_gain_m: null,
        race_tiers: null,
        city: 'Test City',
        province: 'Test Province',
        description: null,
        results_urls: [{ year: 2024, url: 'https://example.com' }],
        organizer_id: null,
      };

      const result = raceRowToTrailRace(row);
      expect(result.resultsUrls).toEqual([{ year: 2024, url: 'https://example.com' }]);
      expect(result).not.toHaveProperty('results_urls');
    });

    it('should convert organizer_id to organizerId', () => {
      const row: RaceRow = {
        id: '1',
        name: 'Test Race',
        date: null,
        distance_km: 50,
        elevation_gain_m: null,
        race_tiers: null,
        city: 'Test City',
        province: 'Test Province',
        description: null,
        organizer_id: 'org-123',
      };

      const result = raceRowToTrailRace(row);
      expect(result.organizerId).toBe('org-123');
      expect(result).not.toHaveProperty('organizer_id');
    });

    it('should convert website_url to websiteUrl', () => {
      const row: RaceRow = {
        id: '1',
        name: 'Test Race',
        date: null,
        distance_km: 50,
        elevation_gain_m: null,
        race_tiers: null,
        city: 'Test City',
        province: 'Test Province',
        description: null,
        organizer_id: null,
        website_url: 'https://example.com',
      };

      const result = raceRowToTrailRace(row);
      expect(result.websiteUrl).toBe('https://example.com');
      expect(result).not.toHaveProperty('website_url');
    });
  });

  describe('null handling for optional fields', () => {
    it('should convert undefined date to null', () => {
      const row: RaceRow = {
        id: '1',
        name: 'Test Race',
        date: null,
        distance_km: 50,
        elevation_gain_m: null,
        race_tiers: null,
        city: 'Test City',
        province: 'Test Province',
        description: null,
        organizer_id: null,
      };

      const result = raceRowToTrailRace(row);
      expect(result.date).toBeNull();
    });

    it('should convert undefined elevation_gain_m to null', () => {
      const row: RaceRow = {
        id: '1',
        name: 'Test Race',
        date: null,
        distance_km: 50,
        elevation_gain_m: null,
        race_tiers: null,
        city: 'Test City',
        province: 'Test Province',
        description: null,
        organizer_id: null,
      };

      const result = raceRowToTrailRace(row);
      expect(result.elevationGainM).toBeNull();
    });

    it('should handle all optional fields as null', () => {
      const row: RaceRow = {
        id: '1',
        name: 'Test Race',
        date: null,
        distance_km: 50,
        elevation_gain_m: null,
        race_tiers: null,
        city: 'Test City',
        province: 'Test Province',
        description: null,
        map_url: null,
        image_path: null,
        services: null,
        results_urls: null,
        sponsors: null,
        organizer_id: null,
        website_url: null,
      };

      const result = raceRowToTrailRace(row);
      expect(result.date).toBeNull();
      expect(result.elevationGainM).toBeNull();
      expect(result.priceEur).toBeNull();
      expect(result.description).toBeNull();
      expect(result.mapUrl).toBeNull();
      expect(result.imagePath).toBeNull();
      expect(result.services).toBeNull();
      expect(result.resultsUrls).toBeNull();
      expect(result.sponsors).toBeNull();
      expect(result.organizerId).toBeNull();
      expect(result.websiteUrl).toBeNull();
    });
  });

  describe('array handling', () => {
    it('should preserve empty services array', () => {
      const row: RaceRow = {
        id: '1',
        name: 'Test Race',
        date: null,
        distance_km: 50,
        elevation_gain_m: null,
        race_tiers: null,
        city: 'Test City',
        province: 'Test Province',
        description: null,
        services: [],
        organizer_id: null,
      };

      const result = raceRowToTrailRace(row);
      expect(result.services).toEqual([]);
    });

    it('should preserve services array with multiple items', () => {
      const row: RaceRow = {
        id: '1',
        name: 'Test Race',
        date: null,
        distance_km: 50,
        elevation_gain_m: null,
        race_tiers: null,
        city: 'Test City',
        province: 'Test Province',
        description: null,
        services: ['parking', 'showers', 'medical', 'food'],
        organizer_id: null,
      };

      const result = raceRowToTrailRace(row);
      expect(result.services).toEqual(['parking', 'showers', 'medical', 'food']);
    });

    it('should preserve sponsors array', () => {
      const row: RaceRow = {
        id: '1',
        name: 'Test Race',
        date: null,
        distance_km: 50,
        elevation_gain_m: null,
        race_tiers: null,
        city: 'Test City',
        province: 'Test Province',
        description: null,
        sponsors: ['Sponsor A', 'Sponsor B', 'Sponsor C'],
        organizer_id: null,
      };

      const result = raceRowToTrailRace(row);
      expect(result.sponsors).toEqual(['Sponsor A', 'Sponsor B', 'Sponsor C']);
    });

    it('should preserve results_urls array with multiple years', () => {
      const row: RaceRow = {
        id: '1',
        name: 'Test Race',
        date: null,
        distance_km: 50,
        elevation_gain_m: null,
        race_tiers: null,
        city: 'Test City',
        province: 'Test Province',
        description: null,
        results_urls: [
          { year: 2022, url: 'https://example.com/2022' },
          { year: 2023, url: 'https://example.com/2023' },
          { year: 2024, url: 'https://example.com/2024' },
        ],
        organizer_id: null,
      };

      const result = raceRowToTrailRace(row);
      expect(result.resultsUrls).toHaveLength(3);
      expect(result.resultsUrls?.[0]).toEqual({ year: 2022, url: 'https://example.com/2022' });
    });
  });

  describe('data type preservation', () => {
    it('should preserve string types', () => {
      const row: RaceRow = {
        id: 'race-123',
        name: 'Test Race',
        date: '2024-06-15',
        distance_km: 50,
        elevation_gain_m: null,
        race_tiers: null,
        city: 'Barcelona',
        province: 'Barcelona',
        description: 'Test description',
        organizer_id: 'org-456',
      };

      const result = raceRowToTrailRace(row);
      expect(typeof result.id).toBe('string');
      expect(typeof result.name).toBe('string');
      expect(typeof result.date).toBe('string');
      expect(typeof result.city).toBe('string');
      expect(typeof result.province).toBe('string');
      expect(typeof result.description).toBe('string');
      expect(typeof result.organizerId).toBe('string');
    });

    it('should preserve number types', () => {
      const row: RaceRow = {
        id: '1',
        name: 'Test Race',
        date: null,
        distance_km: 100.5,
        elevation_gain_m: 5000,
        race_tiers: null,
        city: 'Test City',
        province: 'Test Province',
        description: null,
        organizer_id: null,
      };

      const result = raceRowToTrailRace(row);
      expect(typeof result.distanceKm).toBe('number');
      expect(typeof result.elevationGainM).toBe('number');
    });

    it('should preserve array types', () => {
      const row: RaceRow = {
        id: '1',
        name: 'Test Race',
        date: null,
        distance_km: 50,
        elevation_gain_m: null,
        race_tiers: [{ price_eur: 60 }],
        city: 'Test City',
        province: 'Test Province',
        description: null,
        services: ['parking'],
        sponsors: ['Sponsor'],
        organizer_id: null,
      };

      const result = raceRowToTrailRace(row);
      expect(Array.isArray(result.priceEur)).toBe(true);
      expect(Array.isArray(result.services)).toBe(true);
      expect(Array.isArray(result.sponsors)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle zero values correctly', () => {
      const row: RaceRow = {
        id: '1',
        name: 'Test Race',
        date: null,
        distance_km: 0,
        elevation_gain_m: 0,
        race_tiers: [{ price_eur: 0 }],
        city: 'Test City',
        province: 'Test Province',
        description: null,
        organizer_id: null,
      };

      const result = raceRowToTrailRace(row);
      expect(result.distanceKm).toBe(0);
      expect(result.elevationGainM).toBe(0);
      expect(result.priceEur?.[0].price_eur).toBe(0);
    });

    it('should handle very long strings', () => {
      const longDescription = 'A'.repeat(10000);
      const row: RaceRow = {
        id: '1',
        name: 'Test Race',
        date: null,
        distance_km: 50,
        elevation_gain_m: null,
        race_tiers: null,
        city: 'Test City',
        province: 'Test Province',
        description: longDescription,
        organizer_id: null,
      };

      const result = raceRowToTrailRace(row);
      expect(result.description).toBe(longDescription);
      expect(result.description?.length).toBe(10000);
    });

    it('should handle special characters in strings', () => {
      const row: RaceRow = {
        id: '1',
        name: 'Trail & Run™ 2024!',
        date: null,
        distance_km: 50,
        elevation_gain_m: null,
        race_tiers: null,
        city: 'Barcelona',
        province: 'Catalunya',
        description: 'Race with special chars: <>&"\'',
        organizer_id: null,
      };

      const result = raceRowToTrailRace(row);
      expect(result.name).toBe('Trail & Run™ 2024!');
      expect(result.description).toBe('Race with special chars: <>&"\'');
    });

    it('should handle decimal precision for distance', () => {
      const row: RaceRow = {
        id: '1',
        name: 'Test Race',
        date: null,
        distance_km: 42.195, // Marathon distance
        elevation_gain_m: null,
        race_tiers: null,
        city: 'Test City',
        province: 'Test Province',
        description: null,
        organizer_id: null,
      };

      const result = raceRowToTrailRace(row);
      expect(result.distanceKm).toBe(42.195);
    });
  });

  describe('immutability', () => {
    it('should not mutate the original row object', () => {
      const row: RaceRow = {
        id: '1',
        name: 'Test Race',
        date: '2024-06-15',
        distance_km: 50,
        elevation_gain_m: 2500,
        race_tiers: [{ price_eur: 60 }],
        city: 'Test City',
        province: 'Test Province',
        description: 'Test description',
        organizer_id: 'org-123',
      };

      const originalRow = { ...row };
      raceRowToTrailRace(row);

      expect(row).toEqual(originalRow);
    });

    it('should create a new object, not modify the input', () => {
      const row: RaceRow = {
        id: '1',
        name: 'Test Race',
        date: null,
        distance_km: 50,
        elevation_gain_m: null,
        race_tiers: null,
        city: 'Test City',
        province: 'Test Province',
        description: null,
        organizer_id: null,
      };

      const result = raceRowToTrailRace(row);
      expect(result).not.toBe(row);
    });
  });
});
