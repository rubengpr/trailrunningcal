import { describe, it, expect } from 'vitest';
import { toOrganizer } from './organizers';

describe('toOrganizer', () => {
  describe('full row with all fields populated', () => {
    it('should map all snake_case fields to camelCase', () => {
      const row = {
        name: 'Trail Runners Club',
        website: 'https://example.com',
        facebook_url: 'https://facebook.com/trail',
        instagram_url: 'https://instagram.com/trail',
        youtube_url: 'https://youtube.com/trail',
        tiktok_url: 'https://tiktok.com/@trail',
      };

      const result = toOrganizer(row);

      expect(result).toEqual({
        name: 'Trail Runners Club',
        website: 'https://example.com',
        facebookUrl: 'https://facebook.com/trail',
        instagramUrl: 'https://instagram.com/trail',
        youtubeUrl: 'https://youtube.com/trail',
        tiktokUrl: 'https://tiktok.com/@trail',
      });
    });
  });

  describe('row with null social links', () => {
    it('should return null for social link fields, not undefined', () => {
      const row = {
        name: 'Trail Runners Club',
        website: 'https://example.com',
        facebook_url: null,
        instagram_url: null,
        youtube_url: null,
        tiktok_url: null,
      };

      const result = toOrganizer(row);

      expect(result.facebookUrl).toBeNull();
      expect(result.instagramUrl).toBeNull();
      expect(result.youtubeUrl).toBeNull();
      expect(result.tiktokUrl).toBeNull();
    });
  });

  describe('row with null name and website', () => {
    it('should return null for name and website fields', () => {
      const row = {
        name: null,
        website: null,
        facebook_url: null,
        instagram_url: null,
        youtube_url: null,
        tiktok_url: null,
      };

      const result = toOrganizer(row);

      expect(result.name).toBeNull();
      expect(result.website).toBeNull();
    });
  });

  describe('row with all null fields', () => {
    it('should return an object with all fields as null', () => {
      const row = {
        name: null,
        website: null,
        facebook_url: null,
        instagram_url: null,
        youtube_url: null,
        tiktok_url: null,
      };

      const result = toOrganizer(row);

      expect(result).toEqual({
        name: null,
        website: null,
        facebookUrl: null,
        instagramUrl: null,
        youtubeUrl: null,
        tiktokUrl: null,
      });
    });
  });
});
