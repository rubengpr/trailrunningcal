import { describe, expect, it } from 'vitest';
import { getTerrainAutoLoadDecision } from '@/lib/maps/terrain-loading';

describe('getTerrainAutoLoadDecision', () => {
  it('allows automatic terrain when no constrained hints are present', () => {
    expect(
      getTerrainAutoLoadDecision({
        connection: { effectiveType: '4g', saveData: false },
        deviceMemory: 4,
      }),
    ).toEqual({ enabled: true, reason: 'eligible' });
  });

  it.each(['slow-2g', '2g', '3g'])('blocks automatic terrain on %s', (effectiveType) => {
    expect(
      getTerrainAutoLoadDecision({ connection: { effectiveType } }),
    ).toEqual({ enabled: false, reason: 'constrained-network' });
  });

  it('blocks automatic terrain when Data Saver is enabled', () => {
    expect(
      getTerrainAutoLoadDecision({
        connection: { effectiveType: '4g', saveData: true },
      }),
    ).toEqual({ enabled: false, reason: 'save-data' });
  });

  it('blocks automatic terrain on devices with at most 2 GB of memory', () => {
    expect(getTerrainAutoLoadDecision({ deviceMemory: 2 })).toEqual({
      enabled: false,
      reason: 'constrained-device',
    });
  });

  it.each([
    ['all hints', {}],
    ['device memory', { connection: { effectiveType: '4g' } }],
    ['connection', { deviceMemory: 4 }],
  ])('blocks automatic terrain when %s are missing', (_label, hints) => {
    expect(getTerrainAutoLoadDecision(hints)).toEqual({
      enabled: false,
      reason: 'insufficient-signals',
    });
  });
});
