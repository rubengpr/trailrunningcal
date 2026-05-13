import { LatitudeSpanProcessor } from '@latitude-data/telemetry';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const provider = new NodeTracerProvider({
      spanProcessors: [
        new LatitudeSpanProcessor(
          process.env.LATITUDE_API_KEY!,
          process.env.LATITUDE_PROJECT_SLUG!,
        ),
      ],
    });

    provider.register();
  }
}
