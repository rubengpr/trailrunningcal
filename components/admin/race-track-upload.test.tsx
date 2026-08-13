// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  uploadRaceTrack: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (
    key: string,
    values?: Record<string, string | number>,
  ) => {
    if (key.startsWith('summary.') && values) {
      return `${key}:${values.geometryType}:${values.sourcePointCount ?? ''}:${values.pointCount}:${values.toleranceMeters ?? ''}:${values.segmentCount}`;
    }
    return key;
  },
}));
vi.mock('react-hot-toast', () => ({
  default: { error: mocks.toastError, success: mocks.toastSuccess },
}));
vi.mock('@/lib/api/race-tracks', () => ({
  uploadRaceTrack: mocks.uploadRaceTrack,
  TrackTransportSizeError: class TrackTransportSizeError extends Error {},
}));

import { RaceTrackUpload } from '@/components/admin/race-track-upload';
import { TrackTransportSizeError } from '@/lib/api/race-tracks';

const result = {
  raceId: 'race-1',
  eventSlug: 'pedraforca-xtrail',
  geometryType: 'LineString' as const,
  pointCount: 126,
  preSimplificationSizeBytes: 2048,
  removedPointCount: 0,
  segmentCount: 1,
  simplified: false,
  sourcePointCount: 126,
  sourceSizeBytes: 4096,
  normalizedSizeBytes: 2048,
  targetMet: true,
  toleranceMeters: null,
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.uploadRaceTrack.mockResolvedValue(result);
});

afterEach(cleanup);

describe('RaceTrackUpload', () => {
  it('explains why an unsaved race cannot upload', () => {
    render(
      <RaceTrackUpload
        raceName="Short"
        initialHasTrack={false}
      />,
    );

    expect(screen.getByText('saveFirst')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('uploads a new GPX immediately and renders its summary', async () => {
    render(
      <RaceTrackUpload
        raceId="race-1"
        raceName="Short"
        initialHasTrack={false}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'add' }).getAttribute('type'),
    ).toBe('button');
    fireEvent.change(screen.getByLabelText('inputLabel'), {
      target: { files: [new File(['track'], 'short.gpx')] },
    });

    await waitFor(() => {
      expect(mocks.uploadRaceTrack).toHaveBeenCalledOnce();
    });
    expect(mocks.uploadRaceTrack).toHaveBeenCalledWith(
      'race-1',
      expect.objectContaining({ name: 'short.gpx' }),
    );
    expect(
      await screen.findByText(
        'summary.normalized:geometry.LineString::126::1',
      ),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'replace' })).toBeTruthy();
  });

  it.each([
    [true, 'summary.simplified'],
    [false, 'summary.bestEffort'],
  ])('reports simplified geometry with targetMet=%s', async (targetMet, key) => {
    mocks.uploadRaceTrack.mockResolvedValue({
      ...result,
      pointCount: 8_000,
      removedPointCount: 4_000,
      simplified: true,
      sourcePointCount: 12_000,
      targetMet,
      toleranceMeters: targetMet ? 1.2 : 3,
    });
    render(
      <RaceTrackUpload
        raceId="race-1"
        raceName="Short"
        initialHasTrack={false}
      />,
    );

    fireEvent.change(screen.getByLabelText('inputLabel'), {
      target: { files: [new File(['track'], 'dense.gpx')] },
    });

    expect(
      await screen.findByText(
        `${key}:geometry.LineString:12000:8000:${targetMet ? 1.2 : 3}:1`,
      ),
    ).toBeTruthy();
  });

  it('requires confirmation before replacing a stored GPX', async () => {
    render(
      <RaceTrackUpload
        raceId="race-1"
        raceName="Short"
        initialHasTrack
      />,
    );

    fireEvent.change(screen.getByLabelText('inputLabel'), {
      target: { files: [new File(['track'], 'replacement.gpx')] },
    });

    expect(mocks.uploadRaceTrack).not.toHaveBeenCalled();
    expect(screen.getByText('confirm.title')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'confirm.replace' }));

    await waitFor(() => {
      expect(mocks.uploadRaceTrack).toHaveBeenCalledOnce();
    });
  });

  it('rejects invalid client files without making a request', () => {
    render(
      <RaceTrackUpload
        raceId="race-1"
        raceName="Short"
        initialHasTrack={false}
      />,
    );

    fireEvent.change(screen.getByLabelText('inputLabel'), {
      target: { files: [new File(['track'], 'short.txt')] },
    });

    expect(mocks.uploadRaceTrack).not.toHaveBeenCalled();
    expect(screen.getByText('errors.type')).toBeTruthy();
  });

  it('keeps a visible error state after an upload failure', async () => {
    mocks.uploadRaceTrack.mockRejectedValue(new Error('network'));
    render(
      <RaceTrackUpload
        raceId="race-1"
        raceName="Short"
        initialHasTrack={false}
      />,
    );

    fireEvent.change(screen.getByLabelText('inputLabel'), {
      target: { files: [new File(['track'], 'short.gpx')] },
    });

    expect(await screen.findByText('errors.upload')).toBeTruthy();
    expect(mocks.toastError).toHaveBeenCalledWith('errors.upload');
  });

  it('shows the normalized transport-size error', async () => {
    mocks.uploadRaceTrack.mockRejectedValue(new TrackTransportSizeError());
    render(
      <RaceTrackUpload
        raceId="race-1"
        raceName="Short"
        initialHasTrack={false}
      />,
    );

    fireEvent.change(screen.getByLabelText('inputLabel'), {
      target: { files: [new File(['track'], 'large.gpx')] },
    });

    expect(await screen.findByText('errors.transportSize')).toBeTruthy();
    expect(mocks.toastError).toHaveBeenCalledWith('errors.transportSize');
  });
});
