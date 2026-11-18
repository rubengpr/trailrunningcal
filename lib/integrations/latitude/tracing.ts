import { getLatitudeTracer } from '@latitude-data/telemetry';

export async function traceTool<T>(
  name: string,
  callId: string,
  argumentsText: string,
  execute: () => Promise<T>,
): Promise<T> {
  return getLatitudeTracer('weather').startActiveSpan(name, {
    attributes: {
      'gen_ai.operation.name': 'execute_tool',
      'gen_ai.tool.name': name,
      'gen_ai.tool.call.id': callId,
      'gen_ai.tool.call.arguments': argumentsText,
    },
  }, async span => {
    try {
      const result = await execute();
      span.setAttribute('gen_ai.tool.call.result', JSON.stringify(result));
      if (result && typeof result === 'object' && 'error' in result) {
        // OpenTelemetry's ERROR status code is 2. Keep the public tool error as the status.
        span.setStatus({ code: 2, message: String(result.error) });
      }
      return result;
    } catch (error) {
      const name = error instanceof Error ? error.name : 'UnknownError';
      span.setStatus({ code: 2, message: name });
      span.recordException({ name, message: 'Weather tool execution failed' });
      throw error;
    } finally {
      span.end();
    }
  });
}
