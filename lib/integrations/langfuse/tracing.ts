import { observeOpenAI, type LangfuseConfig } from '@langfuse/openai';
import { propagateAttributes, startActiveObservation } from '@langfuse/tracing';
import { capture } from '@latitude-data/telemetry';

interface TraceWorkflowOptions<T> {
  name: string;
  input: unknown;
  metadata: Record<string, string>;
  output: (result: T) => unknown;
  tags: string[];
}

export function isLangfuseTracingEnabled(): boolean {
  return Boolean(
    process.env.LANGFUSE_PUBLIC_KEY?.trim() &&
      process.env.LANGFUSE_SECRET_KEY?.trim(),
  );
}

function isLatitudeTracingEnabled(): boolean {
  return Boolean(
    process.env.LATITUDE_API_KEY?.trim() &&
      process.env.LATITUDE_PROJECT_SLUG?.trim(),
  );
}

export function observeLangfuseOpenAI<T extends object>(
  client: T,
  config?: LangfuseConfig,
): T {
  return isLangfuseTracingEnabled() ? observeOpenAI(client, config) : client;
}

function getTracingEnvironment(): string {
  return process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development';
}

async function captureLatitudeWorkflow<T>(
  options: TraceWorkflowOptions<T>,
  execute: () => Promise<T>,
): Promise<T> {
  if (!isLatitudeTracingEnabled()) {
    return execute();
  }

  return await capture(options.name, execute, {
    metadata: {
      ...options.metadata,
      environment: getTracingEnvironment(),
    },
    tags: options.tags,
  });
}

export async function traceAiWorkflow<T>(
  options: TraceWorkflowOptions<T>,
  execute: () => Promise<T>,
): Promise<T> {
  const executeWithLatitude = () => captureLatitudeWorkflow(options, execute);

  if (!isLangfuseTracingEnabled()) {
    return executeWithLatitude();
  }

  return startActiveObservation(
    options.name,
    async (observation) => {
      observation.update({ input: options.input });

      return propagateAttributes(
        {
          environment: getTracingEnvironment(),
          metadata: options.metadata,
          tags: options.tags,
          traceName: options.name,
        },
        async () => {
          try {
            const result = await executeWithLatitude();
            observation.update({ output: options.output(result) });
            return result;
          } catch (error) {
            observation.update({
              output: {
                errorType: error instanceof Error ? error.name : 'UnknownError',
                status: 'failed',
              },
            });
            throw error;
          }
        },
      );
    },
    { asType: 'chain' },
  );
}
