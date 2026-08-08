import { describe, expect, it } from 'vitest';
import { getRaceMapEmbed } from '@/lib/races/map-url';

describe('getRaceMapEmbed', () => {
  it('accepts supported Wikiloc embed URLs', () => {
    const url =
      'https://es.wikiloc.com/wikiloc/embedv2.do?id=200387293&elevation=on&images=off&maptype=H';

    expect(getRaceMapEmbed(url)).toEqual({ provider: 'wikiloc', url });
  });

  it('accepts supported Komoot embed URLs', () => {
    const url = 'https://www.komoot.com/es-es/tour/2724447286/embed?profile=1';

    expect(getRaceMapEmbed(url)).toEqual({ provider: 'komoot', url });
  });

  it.each([
    null,
    '',
    'not-a-url',
    'http://es.wikiloc.com/wikiloc/embedv2.do?id=200387293',
    'https://example.com/wikiloc/embedv2.do?id=200387293',
    'https://es.wikiloc.com/wikiloc/embedv2.do?id=invalid',
    'https://www.komoot.com/es-es/tour/2724447286',
  ])('rejects unsupported map URL %s', (url) => {
    expect(getRaceMapEmbed(url)).toBeNull();
  });
});
