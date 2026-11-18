import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ create: vi.fn(), weather: vi.fn() }));
vi.mock('@/lib/integrations/openai/client', () => ({
  createOpenAIClient: () => ({ responses: { create: mocks.create } }),
}));
vi.mock('@/lib/integrations/open-meteo/client', () => ({ getCurrentWeather: mocks.weather }));
vi.mock('@/lib/integrations/langfuse/tracing', () => ({
  traceAiWorkflow: vi.fn((_options, execute) => execute()),
}));
vi.mock('@/lib/integrations/latitude/tracing', () => ({
  traceTool: vi.fn((_name, _id, _arguments, execute) => execute()),
}));

import { askWeather } from '@/lib/services/weather-assistant';
import { traceAiWorkflow } from '@/lib/integrations/langfuse/tracing';
import { traceTool } from '@/lib/integrations/latitude/tracing';

const call = (args = '{"location":"Berga"}', name = 'get_weather') => ({
  id: 'response-1', status: 'completed', output_text: '',
  output: [{ type: 'function_call', call_id: 'call-1', name, arguments: args }],
});
const final = { id: 'response-2', status: 'completed', output: [{ type: 'message' }], output_text: 'Hace 18 °C en Berga.' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('OPENAI_API_KEY', 'test-key');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('weather assistant loop', () => {
  it('executes the tool and links its output to the next response with instructions and tools', async () => {
    mocks.create.mockResolvedValueOnce(call()).mockResolvedValueOnce(final);
    mocks.weather.mockResolvedValue({ location: 'Berga, España', temperatureC: 18 });

    await expect(askWeather({ question: '¿Qué tiempo hace en Berga?', locale: 'es' }))
      .resolves.toEqual({ answer: final.output_text, usedWeather: true });
    expect(mocks.weather).toHaveBeenCalledWith('Berga', expect.any(AbortSignal));
    const first = mocks.create.mock.calls[0][0];
    const next = mocks.create.mock.calls[1][0];
    expect(first.input).toEqual([{ role: 'user', content: '¿Qué tiempo hace en Berga?' }]);
    expect(next).toMatchObject({ previous_response_id: 'response-1', instructions: first.instructions, tools: first.tools });
    expect(next.input).toEqual([{
      type: 'function_call_output', call_id: 'call-1',
      output: JSON.stringify({ location: 'Berga, España', temperatureC: 18 }),
    }]);
    expect(traceAiWorkflow).toHaveBeenCalledWith(expect.objectContaining({
      name: 'weather-assistant', tags: ['weather-assistant'],
      metadata: { feature: 'weather-assistant', locale: 'es' },
    }), expect.any(Function));
    expect(traceTool).toHaveBeenCalledWith('get_weather', 'call-1', '{"location":"Berga"}', expect.any(Function));
  });

  it('returns a clarification without executing weather when the model requests a location', async () => {
    mocks.create.mockResolvedValue({ ...final, output_text: '¿En qué localidad?' });
    const result = await askWeather({ question: '¿Qué tiempo hace?', locale: 'es' });
    expect(result).toEqual({ answer: '¿En qué localidad?', usedWeather: false });
    expect(mocks.weather).not.toHaveBeenCalled();
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it.each(['{', '{}', '{"location":""}', '{"location":123}', '{"location":"x"}'])('does not execute invalid tool arguments: %s', async args => {
    mocks.create.mockResolvedValueOnce(call(args)).mockResolvedValueOnce(final);
    await askWeather({ question: 'Berga', locale: 'es' });
    expect(mocks.weather).not.toHaveBeenCalled();
    expect(mocks.create.mock.calls[1][0].input[0].output).toContain('invalid_location_argument');
  });

  it('reports a missing location to the model instead of inventing data', async () => {
    mocks.create.mockResolvedValueOnce(call()).mockResolvedValueOnce(final);
    mocks.weather.mockResolvedValue(null);
    const result = await askWeather({ question: 'Berga', locale: 'es' });
    expect(result.usedWeather).toBe(false);
    expect(mocks.create.mock.calls[1][0].input[0].output).toContain('location_not_found');
  });

  it('returns a safe tool error when the weather provider fails', async () => {
    mocks.create.mockResolvedValueOnce(call()).mockResolvedValueOnce(final);
    mocks.weather.mockRejectedValue(new Error('private provider details'));
    await askWeather({ question: 'Berga', locale: 'es' });
    expect(mocks.create.mock.calls[1][0].input[0].output).toBe('{"error":"weather_unavailable"}');
  });

  it('never executes unknown tools', async () => {
    mocks.create.mockResolvedValue(call('{}', 'delete_event'));
    await expect(askWeather({ question: 'Berga', locale: 'es' })).rejects.toMatchObject({ status: 502 });
    expect(mocks.weather).not.toHaveBeenCalled();
  });

  it('bounds tool calls and forces a final response on the third model request', async () => {
    mocks.create.mockResolvedValueOnce(call()).mockResolvedValueOnce(call()).mockResolvedValueOnce(final);
    mocks.weather.mockResolvedValue(null);
    await askWeather({ question: 'Berga', locale: 'ca' });
    expect(mocks.create).toHaveBeenCalledTimes(3);
    expect(mocks.weather).toHaveBeenCalledTimes(2);
    expect(mocks.create.mock.calls[2][0].tool_choice).toBe('none');
    expect(mocks.create.mock.calls[0][0].instructions).toContain('Catalan');
  });

  it.each([
    { ...final, status: 'incomplete' },
    { ...final, output_text: '' },
  ])('rejects incomplete or empty final responses', async response => {
    mocks.create.mockResolvedValue(response);
    await expect(askWeather({ question: 'Berga', locale: 'es' })).rejects.toMatchObject({ status: 502 });
  });

  it('fails before external calls if the API key is missing', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    await expect(askWeather({ question: 'Berga', locale: 'es' })).rejects.toMatchObject({ status: 503 });
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
