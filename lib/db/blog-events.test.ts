import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({from: vi.fn(), select: vi.fn(), in: vi.fn(), ilike: vi.fn(), order: vi.fn(), range: vi.fn(), result: {data: [] as unknown[], count: 0, error: null as Error | null}}));
vi.mock('@/lib/supabase/server', () => ({createAdminClient: () => ({from: mocks.from})}));
import { listEvents, selectedEvents } from './blog-events';
const query = {...mocks, then: (resolve: (value: typeof mocks.result) => unknown) => Promise.resolve(mocks.result).then(resolve)};
const row = {id: 'event', name: 'Evento', slug: 'evento', description: '<p>Una <strong>descripción</strong>.</p>', races: [
  {id: 'race1', name: 'Trail', city: 'Bagà', province: 'Barcelona', distance_km: 21, elevation_gain_m: null},
  {id: 'race2', name: 'Ultra', city: 'Girona', province: 'Girona', distance_km: 60, elevation_gain_m: 2000},
]};
beforeEach(() => {
  vi.clearAllMocks();
  for (const method of [mocks.from, mocks.select, mocks.in, mocks.ilike, mocks.order]) method.mockReturnValue(query);
  mocks.result = {data: [row], count: 51, error: null};
  mocks.range.mockImplementation(() => Promise.resolve(mocks.result));
});
describe('regional event lookup', () => {
  it('pages unique parent events while filtering embedded modalities across all community provinces', async () => {
    const page = await listEvents('catalonia','Ultra',2);
    expect(mocks.select).toHaveBeenCalledWith(expect.stringContaining('races!inner'), {count: 'exact'});
    expect(mocks.in).toHaveBeenCalledWith('races.province', ['Barcelona','Girona','Lleida','Tarragona']);
    expect(mocks.order.mock.calls).toEqual([['name'],['id']]); expect(mocks.range).toHaveBeenCalledWith(50,99);
    expect(page.events).toHaveLength(1); expect(page.events[0].races).toHaveLength(2);
    expect(page.events[0].description).toBe('Una descripción.');
    expect(page.events[0].races.find(race => race.id === 'race1')?.elevationGainM).toBeNull();
    expect(page.pagination).toEqual({page: 2, pageSize: 50, total: 51, totalPages: 2});
  });
  it('escapes wildcard search characters and excludes dates and prices from editorial context', async () => {
    await listEvents('catalonia','_%',1);
    expect(mocks.ilike).toHaveBeenCalledWith('name','%\\_\\%%');
    expect(mocks.select.mock.calls[0][0]).not.toMatch(/price/);
    expect((await listEvents('catalonia','',1)).events[0].races[0]).not.toHaveProperty('date');
  });
  it('checks selected IDs and still scopes modalities to the community', async () => {
    const result = await selectedEvents('catalonia',['event']);
    expect(mocks.in).toHaveBeenCalledWith('id',['event']); expect(result[0].races.some(race => race.province === 'Girona')).toBe(true);
  });
  it('returns an empty page and propagates database failures', async () => {
    mocks.result = {data: [], count: 0, error: null}; expect((await listEvents('aragon','',1)).events).toEqual([]);
    mocks.result.error = new Error('DB'); await expect(selectedEvents('aragon',['id'])).rejects.toThrow('DB');
  });
});

it('selects the relevant edition without sending dates or duplicate historical modalities', async () => {
  mocks.result = {data: [{...row, races: [
    {...row.races[0], id: 'old', date: '2020-01-01'},
    {...row.races[0], id: 'future', date: '2090-01-01'},
  ]}], count: 1, error: null};
  const page = await listEvents('catalonia','',1);
  expect(page.events[0].races.map(race => race.id)).toEqual(['future']);
  expect(page.events[0].races[0]).not.toHaveProperty('date');
});
