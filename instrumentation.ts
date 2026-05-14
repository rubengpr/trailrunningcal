import OpenAI from 'openai';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import {
  LatitudeSpanProcessor,
  registerLatitudeInstrumentations,
} from '@latitude-data/telemetry';

export async function register() {
  const apiKey = process.env.LATITUDE_API_KEY;
  const projectSlug = process.env.LATITUDE_PROJECT_SLUG;

  if (!apiKey || !projectSlug) return;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const provider = new NodeTracerProvider({
      spanProcessors: [new LatitudeSpanProcessor(apiKey, projectSlug)],
    });
    provider.register();

    await registerLatitudeInstrumentations({
      instrumentations: ['openai'],
      modules: { openai: OpenAI },
      tracerProvider: provider,
    });
  }
}
