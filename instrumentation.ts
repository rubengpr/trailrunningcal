import { initLogger } from 'braintrust';

declare global {
  var langfuseInstrumentationStarted: boolean | undefined;
  var latitudeInstrumentationStarted: boolean | undefined;
  var latitudeTelemetry: { flush(): Promise<void> } | undefined;
  var telemetryStarted: boolean | undefined;
}

function shouldStartLangfuse(): boolean {
  return Boolean(
    process.env.LANGFUSE_PUBLIC_KEY?.trim() &&
      process.env.LANGFUSE_SECRET_KEY?.trim(),
  );
}

function shouldStartLatitude(): boolean {
  return Boolean(
    process.env.LATITUDE_API_KEY?.trim() &&
      process.env.LATITUDE_PROJECT_SLUG?.trim(),
  );
}

function maskSensitiveData(data: unknown): unknown {
  if (typeof data !== 'string') return data;

  return data
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, '[redacted-email]')
    .replace(/\b(sk|pk)-[A-Za-z0-9_-]{10,}\b/gu, '$1-[redacted]')
    .replace(/(Bearer\s+)[A-Za-z0-9._-]+/giu, '$1[redacted]');
}

export async function startTelemetry(): Promise<{ flush(): Promise<void> } | undefined> {
  const startLangfuse = shouldStartLangfuse();
  const startLatitude = shouldStartLatitude();

  if ((startLangfuse || startLatitude) && !globalThis.telemetryStarted) {
    const [{ NodeSDK }, langfuse] = await Promise.all([
      import('@opentelemetry/sdk-node'),
      startLangfuse ? import('@langfuse/otel') : Promise.resolve(null),
    ]);

    const sdk = new NodeSDK({
      spanProcessors: langfuse
        ? [
            new langfuse.LangfuseSpanProcessor({
              environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
              exportMode: 'immediate',
              mask: ({ data }) => maskSensitiveData(data),
            }),
          ]
        : [],
    });
    sdk.start();
    globalThis.telemetryStarted = true;

    if (startLangfuse) {
      globalThis.langfuseInstrumentationStarted = true;
    }

    if (startLatitude) {
      const [
        { Latitude },
        { createOpenAIInstrumentation },
        { default: OpenAI },
      ] = await Promise.all([
        import('@latitude-data/telemetry'),
        import('@latitude-data/telemetry/instrumentations/openai'),
        import('openai'),
      ]);
      const latitude = new Latitude({
        apiKey: process.env.LATITUDE_API_KEY!,
        project: process.env.LATITUDE_PROJECT_SLUG!,
        instrumentations: [createOpenAIInstrumentation(OpenAI)],
        redact: {
          attributes: [
            /^gen_ai\.(?:input|output)\.messages$/u,
            /^gen_ai\.system_instructions$/u,
          ],
          mask: (_attribute, value) => String(maskSensitiveData(value)),
        },
      });
      await latitude.ready;
      globalThis.latitudeTelemetry = latitude;
      globalThis.latitudeInstrumentationStarted = true;
    }
  }

  return globalThis.latitudeTelemetry;
}

export async function register() {
  const isNodeRuntime = process.env.NEXT_RUNTIME === 'nodejs';

  if (isNodeRuntime) {
    await startTelemetry();
  }

  if (isNodeRuntime || process.env.NEXT_RUNTIME === 'edge') {
    initLogger({
      projectName: 'My Project',
    });
  }
}
