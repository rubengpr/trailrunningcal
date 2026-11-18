import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  span: { setAttribute: vi.fn(), setStatus: vi.fn(), recordException: vi.fn(), end: vi.fn() },
  start: vi.fn(),
}));
vi.mock('@latitude-data/telemetry', () => ({
  getLatitudeTracer: () => ({ startActiveSpan: mocks.start }),
}));
import { traceTool } from '@/lib/integrations/latitude/tracing';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.start.mockImplementation((_name, _options, callback) => callback(mocks.span));
});

describe('weather tool telemetry', () => {
  it('records tool arguments and results and closes the span', async () => {
    const weather = { temperatureC: 18 };
    await expect(traceTool('get_weather', 'call-1', '{"location":"Berga"}', async () => weather)).resolves.toBe(weather);
    expect(mocks.start).toHaveBeenCalledWith('get_weather', {
      attributes: {
        'gen_ai.operation.name': 'execute_tool', 'gen_ai.tool.name': 'get_weather',
        'gen_ai.tool.call.id': 'call-1', 'gen_ai.tool.call.arguments': '{"location":"Berga"}',
      },
    }, expect.any(Function));
    expect(mocks.span.setAttribute).toHaveBeenCalledWith('gen_ai.tool.call.result', JSON.stringify(weather));
    expect(mocks.span.setStatus).not.toHaveBeenCalled();
    expect(mocks.span.end).toHaveBeenCalledOnce();
  });

  it('marks handled tool failures as errors while preserving the result for the model', async () => {
    const failure = { error: 'weather_unavailable' };
    await expect(traceTool('get_weather', 'call-1', '{}', async () => failure)).resolves.toBe(failure);
    expect(mocks.span.setStatus).toHaveBeenCalledWith({ code: 2, message: 'weather_unavailable' });
    expect(mocks.span.end).toHaveBeenCalledOnce();
  });

  it('propagates cancellation and closes the span without logging private exception messages', async () => {
    const error = new DOMException('private details', 'AbortError');
    await expect(traceTool('get_weather', 'call-1', '{}', async () => { throw error; })).rejects.toBe(error);
    expect(mocks.span.setStatus).toHaveBeenCalledWith({ code: 2, message: 'AbortError' });
    expect(mocks.span.recordException).toHaveBeenCalledWith({ name: 'AbortError', message: 'Weather tool execution failed' });
    expect(mocks.span.end).toHaveBeenCalledOnce();
  });
});
