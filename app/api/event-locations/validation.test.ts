import { describe, expect, it } from 'vitest';
import { parseEventMapLocations } from './validation';

describe('parseEventMapLocations', () => {
  it('trims and deduplicates location pairs', () => {
    expect(parseEventMapLocations({
      locations: [
        { city: ' Girona ', province: ' Girona ' },
        { city: 'Girona', province: 'Girona' },
      ],
    })).toEqual([{ city: 'Girona', province: 'Girona' }]);
  });

  it('rejects malformed locations', () => {
    expect(() => parseEventMapLocations({
      locations: [{ city: 'Girona' }],
    })).toThrow('Invalid location');
  });

  it('rejects batches above the server limit', () => {
    expect(() => parseEventMapLocations({
      locations: Array.from({ length: 501 }, (_, index) => ({
        city: `City ${index}`,
        province: 'Province',
      })),
    })).toThrow('Too many locations');
  });
});
