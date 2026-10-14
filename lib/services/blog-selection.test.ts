import { beforeEach, describe, expect, it, vi } from 'vitest';
import { context } from '@/tests/fixtures/blog-selection';
const mocks = vi.hoisted(() => ({selectedEvents: vi.fn(), listEvents: vi.fn()}));
vi.mock('@/lib/db/blog-events', () => mocks);
import { snapshot, list } from './blog-selection';
const input = {regionId: 'catalonia', eventIds: context.events.map(event => event.id)};
beforeEach(() => {vi.resetAllMocks(); mocks.selectedEvents.mockResolvedValue([...context.events].reverse());});
describe('manual event selection', () => {
  it('builds a source snapshot in selection order without trusting submitted data', async () => {
    expect(await snapshot(input)).toEqual(context);
    expect(mocks.selectedEvents).toHaveBeenCalledWith('catalonia', input.eventIds);
  });
  it.each(['andorra','ceuta','melilla','unknown'])('rejects region %s before querying', async regionId => {
    await expect(snapshot({...input, regionId})).rejects.toMatchObject({status: 422}); expect(mocks.selectedEvents).not.toHaveBeenCalled();
  });
  it.each([[], input.eventIds.slice(1), [...input.eventIds, input.eventIds[0]], input.eventIds.map(() => input.eventIds[0])].map(eventIds => ({eventIds})))('rejects invalid counts and duplicates', async ({eventIds}) => {
    await expect(snapshot({...input, eventIds})).rejects.toMatchObject({status: 422}); expect(mocks.selectedEvents).not.toHaveBeenCalled();
  });
  it('rejects deleted or moved events and empty modalities', async () => {
    mocks.selectedEvents.mockResolvedValueOnce(context.events.slice(1));
    await expect(snapshot(input)).rejects.toMatchObject({status: 422});
    mocks.selectedEvents.mockResolvedValueOnce(context.events.map(event => ({...event, races: []})));
    await expect(snapshot(input)).rejects.toMatchObject({status: 422});
  });
  it('keeps missing descriptions and elevation optional and propagates database errors', async () => {
    expect((await snapshot(input)).events[0].description).toBeNull();
    mocks.selectedEvents.mockRejectedValue(new Error('DB')); await expect(snapshot(input)).rejects.toThrow('DB');
  });
  it('delegates a trimmed search to the database', async () => {
    await list('catalonia',' Ultra ',2); expect(mocks.listEvents).toHaveBeenCalledWith('catalonia','Ultra',2);
  });
});
