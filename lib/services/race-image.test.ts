import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import { deleteRaceImage, uploadRaceImage } from './race-image';

const ORGANIZER_ID = 'organizer-1';
const RACE_ID = 'race-1';
const EXISTING_FILENAME = 'main-100.webp';

function imageFile(): File {
  return {
    type: 'image/webp',
    size: 3,
    arrayBuffer: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer),
  } as unknown as File;
}

function createClient(input?: {
  uploadError?: unknown;
  removeErrors?: unknown[];
  updateErrors?: unknown[];
}) {
  const upload = vi.fn().mockResolvedValue({ error: input?.uploadError ?? null });
  const removeErrors = [...(input?.removeErrors ?? [])];
  const remove = vi.fn().mockImplementation(async () => ({
    error: removeErrors.shift() ?? null,
  }));
  const updateErrors = [...(input?.updateErrors ?? [])];
  const updates: Array<Record<string, unknown>> = [];
  const update = vi.fn().mockImplementation((value: Record<string, unknown>) => {
    updates.push(value);
    const secondEq = vi.fn().mockResolvedValue({
      error: updateErrors.shift() ?? null,
    });
    return {
      eq: vi.fn().mockReturnValue({ eq: secondEq }),
    };
  });

  const client = {
    from: vi.fn().mockReturnValue({ update }),
    storage: {
      from: vi.fn().mockReturnValue({ upload, remove }),
    },
  } as unknown as SupabaseClient;

  return { client, upload, remove, update, updates };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('uploadRaceImage', () => {
  it('persists the new filename before removing the previous file', async () => {
    const { client, upload, remove, update, updates } = createClient();

    const filename = await uploadRaceImage(client, {
      organizerId: ORGANIZER_ID,
      raceId: RACE_ID,
      existingFilename: EXISTING_FILENAME,
      file: imageFile(),
    });

    expect(filename).toMatch(/^main-\d+\.webp$/);
    expect(updates).toEqual([{ hero_image_filename: filename }]);
    expect(remove).toHaveBeenCalledWith([
      `${ORGANIZER_ID}/${RACE_ID}/${EXISTING_FILENAME}`,
    ]);
    expect(upload.mock.invocationCallOrder[0]).toBeLessThan(
      update.mock.invocationCallOrder[0]!,
    );
    expect(update.mock.invocationCallOrder[0]).toBeLessThan(
      remove.mock.invocationCallOrder[0]!,
    );
  });

  it('keeps the previous image when the new upload fails', async () => {
    const { client, remove, update } = createClient({
      uploadError: { message: 'upload failed' },
    });

    await expect(uploadRaceImage(client, {
      organizerId: ORGANIZER_ID,
      raceId: RACE_ID,
      existingFilename: EXISTING_FILENAME,
      file: imageFile(),
    })).rejects.toThrow('Failed to upload image');

    expect(update).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('removes the new file instead of the previous file when persistence fails', async () => {
    const { client, remove } = createClient({
      updateErrors: [{ message: 'update failed' }],
    });

    await expect(uploadRaceImage(client, {
      organizerId: ORGANIZER_ID,
      raceId: RACE_ID,
      existingFilename: EXISTING_FILENAME,
      file: imageFile(),
    })).rejects.toThrow('Failed to update race');

    const [[removedPaths]] = remove.mock.calls;
    expect(removedPaths).toHaveLength(1);
    expect(removedPaths[0]).not.toContain(EXISTING_FILENAME);
  });
});

describe('deleteRaceImage', () => {
  it('does not remove the file when clearing the database reference fails', async () => {
    const { client, remove } = createClient({
      updateErrors: [{ message: 'update failed' }],
    });

    await expect(deleteRaceImage(
      client,
      ORGANIZER_ID,
      RACE_ID,
      EXISTING_FILENAME,
    )).rejects.toThrow('Failed to delete image');

    expect(remove).not.toHaveBeenCalled();
  });

  it('restores the database reference when storage deletion fails', async () => {
    const { client, updates } = createClient({
      removeErrors: [{ message: 'remove failed' }],
    });

    await expect(deleteRaceImage(
      client,
      ORGANIZER_ID,
      RACE_ID,
      EXISTING_FILENAME,
    )).rejects.toThrow('Failed to delete image');

    expect(updates).toEqual([
      { hero_image_filename: null },
      { hero_image_filename: EXISTING_FILENAME },
    ]);
  });
});
