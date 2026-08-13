import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';

const CHROME_PATH =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MOBILE_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36';
const MAP_HOSTS = {
  dem: 'tiles.mapterhorn.com',
  osm: 'tile.openstreetmap.org',
  satellite: 'geoserveis.icgc.cat',
};
const SCENARIOS = {
  'fast-4g': {
    cpuSlowdown: 1,
    downloadMbps: 20,
    latencyMs: 40,
    uploadMbps: 10,
  },
  'slow-4g': {
    cpuSlowdown: 1,
    downloadMbps: 8,
    latencyMs: 80,
    uploadMbps: 3,
  },
  '3g': {
    cpuSlowdown: 1,
    downloadMbps: 0.75,
    latencyMs: 300,
    uploadMbps: 0.25,
  },
  'slow-4g-4x-cpu': {
    cpuSlowdown: 4,
    downloadMbps: 8,
    latencyMs: 80,
    uploadMbps: 3,
  },
};

class CdpClient {
  constructor(url) {
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.socket = new WebSocket(url);
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener(
        'error',
        () => reject(new Error('Unable to connect to Chrome DevTools')),
        { once: true },
      );
    });
    this.socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }

      const key = `${message.sessionId ?? ''}:${message.method}`;
      for (const listener of this.listeners.get(key) ?? []) {
        listener(message.params ?? {});
      }
    });
  }

  close() {
    this.socket.close();
  }

  on(method, listener, sessionId = '') {
    const key = `${sessionId}:${method}`;
    const listeners = this.listeners.get(key) ?? new Set();
    listeners.add(listener);
    this.listeners.set(key, listeners);
    return () => listeners.delete(listener);
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    const promise = new Promise((resolve, reject) => {
      this.pending.set(id, { reject, resolve });
    });
    this.socket.send(
      JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }),
    );
    return promise;
  }
}

function parseArgs(argv) {
  const options = {
    mode: 'manual',
    output: 'event-map-benchmark.json',
    runs: 3,
    scenarios: Object.keys(SCENARIOS),
    timeoutMs: 35_000,
    url: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--mode') options.mode = argv[++index];
    else if (value === '--output') options.output = argv[++index];
    else if (value === '--runs') options.runs = Number(argv[++index]);
    else if (value === '--scenario') options.scenarios = [argv[++index]];
    else if (value === '--timeout-ms') options.timeoutMs = Number(argv[++index]);
    else if (value === '--url') options.url = argv[++index];
    else throw new Error(`Unknown argument: ${value}`);
  }

  if (!options.url) throw new Error('--url is required');
  if (!['auto', 'manual'].includes(options.mode)) {
    throw new Error('--mode must be auto or manual');
  }
  if (!Number.isInteger(options.runs) || options.runs < 1) {
    throw new Error('--runs must be a positive integer');
  }
  for (const scenario of options.scenarios) {
    if (!SCENARIOS[scenario]) throw new Error(`Unknown scenario: ${scenario}`);
  }
  return options;
}

function bytesPerSecond(megabitsPerSecond) {
  return (megabitsPerSecond * 1_000_000) / 8;
}

function percentile(values, fraction) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

function summarize(results) {
  return Object.fromEntries(
    Object.keys(SCENARIOS).flatMap((scenarioName) => {
      const runs = results.filter(({ scenario }) => scenario === scenarioName);
      if (runs.length === 0) return [];
      const readyRuns = runs.filter(({ outcome }) => outcome === 'ready');
      const measuredRuns = runs.filter(({ outcome }) => outcome !== 'runner-error');
      const failedRuns = runs.filter(({ outcome }) =>
        ['benchmark-timeout', 'failed', 'runner-error'].includes(outcome),
      );
      const values = (source, key) => source.map((run) => run[key] ?? 0);
      return [
        [
          scenarioName,
          {
            failures: failedRuns.length,
            medianAttemptMs: Math.round(
              percentile(values(measuredRuns, 'readinessMs'), 0.5),
            ),
            medianLongTaskMs: Math.round(
              percentile(values(measuredRuns, 'longTaskMs'), 0.5),
            ),
            medianMapBytes: Math.round(
              percentile(values(measuredRuns, 'mapBytes'), 0.5),
            ),
            medianReadinessMs: Math.round(
              percentile(values(readyRuns, 'readinessMs'), 0.5),
            ),
            medianTaskMs: Math.round(
              percentile(values(measuredRuns, 'taskMs'), 0.5),
            ),
            p95ReadinessMs: Math.round(
              percentile(values(readyRuns, 'readinessMs'), 0.95),
            ),
            runs: runs.length,
            suppressed: runs.filter(({ outcome }) => outcome === 'suppressed')
              .length,
          },
        ],
      ];
    }),
  );
}

async function waitForDevToolsUrl(child, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    let stderr = '';
    const timeout = setTimeout(() => {
      reject(new Error(`Chrome did not expose DevTools: ${stderr}`));
    }, timeoutMs);
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (!match) return;
      clearTimeout(timeout);
      resolve(match[1]);
    });
    child.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Chrome exited before startup with code ${code}: ${stderr}`));
    });
  });
}

async function evaluate(client, sessionId, expression) {
  const result = await client.send(
    'Runtime.evaluate',
    { awaitPromise: true, expression, returnByValue: true },
    sessionId,
  );
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? 'Browser evaluation failed');
  }
  return result.result.value;
}

async function waitForCondition(
  client,
  sessionId,
  expression,
  timeoutMs,
  intervalMs = 100,
) {
  const startedAt = performance.now();
  while (performance.now() - startedAt < timeoutMs) {
    const value = await evaluate(client, sessionId, expression);
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}

async function performanceMetrics(client, sessionId) {
  const { metrics } = await client.send('Performance.getMetrics', {}, sessionId);
  return Object.fromEntries(metrics.map(({ name, value }) => [name, value]));
}

async function runBenchmark({ mode, scenarioName, timeoutMs, url }) {
  const scenario = SCENARIOS[scenarioName];
  const profileDirectory = await mkdtemp(path.join(tmpdir(), 'event-map-benchmark-'));
  const chrome = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--no-first-run',
      '--no-default-browser-check',
      '--remote-debugging-port=0',
      `--user-data-dir=${profileDirectory}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );

  let client;
  try {
    const devToolsUrl = await waitForDevToolsUrl(chrome);
    client = new CdpClient(devToolsUrl);
    await client.connect();
    const { targetId } = await client.send('Target.createTarget', {
      url: 'about:blank',
    });
    const { sessionId } = await client.send('Target.attachToTarget', {
      flatten: true,
      targetId,
    });

    const requests = new Map();
    const providerRequests = { dem: 0, osm: 0, satellite: 0 };
    const providerZooms = { dem: {}, osm: {}, satellite: {} };
    const providerBytes = { dem: 0, osm: 0, satellite: 0 };
    client.on(
      'Network.requestWillBeSent',
      ({ request, requestId }) => {
        requests.set(requestId, request.url);
      },
      sessionId,
    );
    client.on(
      'Network.loadingFinished',
      ({ encodedDataLength, requestId }) => {
        const requestUrl = requests.get(requestId);
        if (!requestUrl) return;
        for (const [provider, host] of Object.entries(MAP_HOSTS)) {
          if (!requestUrl.includes(host)) continue;
          providerBytes[provider] += encodedDataLength;
          providerRequests[provider] += 1;
          const zoom = requestUrl.match(/\/(\d+)\/\d+\/\d+\.(?:png|webp)/)?.[1];
          if (zoom) {
            providerZooms[provider][zoom] =
              (providerZooms[provider][zoom] ?? 0) + 1;
          }
        }
      },
      sessionId,
    );

    await Promise.all([
      client.send('Page.enable', {}, sessionId),
      client.send('Runtime.enable', {}, sessionId),
      client.send('Network.enable', {}, sessionId),
      client.send('Performance.enable', {}, sessionId),
    ]);
    await client.send(
      'Emulation.setDeviceMetricsOverride',
      {
        deviceScaleFactor: 3,
        height: 844,
        mobile: true,
        screenHeight: 844,
        screenWidth: 390,
        width: 390,
      },
      sessionId,
    );
    await client.send(
      'Network.setUserAgentOverride',
      {
        platform: 'Android',
        userAgent: MOBILE_USER_AGENT,
      },
      sessionId,
    );
    await client.send(
      'Emulation.setCPUThrottlingRate',
      { rate: scenario.cpuSlowdown },
      sessionId,
    );
    await client.send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);
    await client.send('Network.clearBrowserCache', {}, sessionId);
    await client.send(
      'Page.addScriptToEvaluateOnNewDocument',
      {
        source: `
          window.__eventMapLongTasks = [];
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              window.__eventMapLongTasks.push({ duration: entry.duration, startTime: entry.startTime });
            }
          }).observe({ type: 'longtask', buffered: true });
          const NativeIntersectionObserver = window.IntersectionObserver;
          window.IntersectionObserver = class extends NativeIntersectionObserver {
            constructor(callback, options) {
              super(callback, options);
              this.eventMapCallback = callback;
            }
            observe(target) {
              super.observe(target);
              if (target.matches?.('[data-event-track-map-placeholder]')) {
                queueMicrotask(() => this.eventMapCallback([{
                  intersectionRatio: 1,
                  isIntersecting: true,
                  target,
                }], this));
              }
            }
          };
        `,
      },
      sessionId,
    );

    const benchmarkUrl = new URL(url);
    if (mode === 'auto') benchmarkUrl.searchParams.set('event-map-3d', 'auto');
    const domReady = new Promise((resolve) => {
      const unsubscribe = client.on(
        'Page.domContentEventFired',
        () => {
          unsubscribe();
          resolve();
        },
        sessionId,
      );
    });
    await client.send('Page.navigate', { url: benchmarkUrl.toString() }, sessionId);
    await domReady;

    const placeholderFound = await waitForCondition(
      client,
      sessionId,
      `document.querySelector('[data-event-track-map-placeholder]') !== null`,
      timeoutMs,
    );
    if (!placeholderFound) throw new Error('Map placeholder was not found');
    await evaluate(
      client,
      sessionId,
      `document.querySelector('[data-event-track-map-placeholder]').scrollIntoView({ block: 'center' }); true`,
    );
    const mapReady = await waitForCondition(
      client,
      sessionId,
      `(() => {
        const button = document.querySelector('[data-testid="event-track-map-terrain-toggle"]');
        return button && !button.disabled;
      })()`,
      timeoutMs,
    );
    if (!mapReady) {
      const diagnostic = await evaluate(
        client,
        sessionId,
        `(() => ({
          error: document.querySelector('[data-event-track-map-root]')?.textContent?.trim().slice(0, 200),
          mapRoot: Boolean(document.querySelector('[data-event-track-map-root]')),
          placeholder: Boolean(document.querySelector('[data-event-track-map-placeholder]')),
          terrainButton: document.querySelector('[data-testid="event-track-map-terrain-toggle"]')?.outerHTML,
          title: document.title,
          url: location.href,
        }))()`,
      );
      throw new Error(
        `Interactive map did not become ready: ${JSON.stringify(diagnostic)}`,
      );
    }

    requests.clear();
    for (const provider of Object.keys(providerBytes)) {
      providerBytes[provider] = 0;
      providerRequests[provider] = 0;
      providerZooms[provider] = {};
    }
    await client.send('Network.clearBrowserCache', {}, sessionId);
    await client.send(
      'Network.emulateNetworkConditions',
      {
        connectionType: scenarioName === '3g' ? 'cellular3g' : 'cellular4g',
        downloadThroughput: bytesPerSecond(scenario.downloadMbps),
        latency: scenario.latencyMs,
        offline: false,
        uploadThroughput: bytesPerSecond(scenario.uploadMbps),
      },
      sessionId,
    );
    const beforeMetrics = await performanceMetrics(client, sessionId);
    const browserStartedAt = await evaluate(
      client,
      sessionId,
      `performance.now()`,
    );
    const startedAt = performance.now();
    if (mode === 'manual') {
      await evaluate(
        client,
        sessionId,
        `document.querySelector('[data-testid="event-track-map-terrain-toggle"]').click(); true`,
      );
    }
    const outcome = await waitForCondition(
      client,
      sessionId,
      `(() => {
        const status = document.querySelector('[data-event-track-map-root]')?.dataset.terrainStatus;
        if (status === '3d') return 'ready';
        if (status === 'failed') return 'failed';
        if (${JSON.stringify(mode)} === 'auto') {
          const marks = performance.getEntriesByType('mark').map(({ name }) => name);
          if (marks.some((name) => name.startsWith('event-track-map-terrain-auto-') && name !== 'event-track-map-terrain-auto-requested')) {
            return 'suppressed';
          }
        }
        return '';
      })()`,
      timeoutMs,
    );
    const readinessMs = performance.now() - startedAt;
    const afterMetrics = await performanceMetrics(client, sessionId);
    const longTasks = await evaluate(
      client,
      sessionId,
      `(window.__eventMapLongTasks ?? []).filter(({ startTime }) => startTime >= ${browserStartedAt})`,
    );
    const mapBytes = Object.values(providerBytes).reduce(
      (total, value) => total + value,
      0,
    );

    return {
      cpuSlowdown: scenario.cpuSlowdown,
      downloadMbps: scenario.downloadMbps,
      longTaskCount: longTasks.length,
      longTaskMs: longTasks.reduce((total, { duration }) => total + duration, 0),
      mapBytes,
      mode,
      outcome: outcome ?? 'benchmark-timeout',
      providerBytes,
      providerRequests,
      providerZooms,
      readinessMs,
      scenario: scenarioName,
      taskMs: ((afterMetrics.TaskDuration ?? 0) - (beforeMetrics.TaskDuration ?? 0)) * 1_000,
      timestamp: new Date().toISOString(),
      url: benchmarkUrl.toString(),
    };
  } finally {
    client?.close();
    if (chrome.exitCode === null) {
      const exited = new Promise((resolve) => chrome.once('exit', resolve));
      chrome.kill('SIGTERM');
      await Promise.race([
        exited,
        new Promise((resolve) => setTimeout(resolve, 2_000)),
      ]);
    }
    await rm(profileDirectory, {
      force: true,
      maxRetries: 5,
      recursive: true,
      retryDelay: 100,
    });
  }
}

const options = parseArgs(process.argv.slice(2));
const results = [];
for (const scenarioName of options.scenarios) {
  for (let run = 1; run <= options.runs; run += 1) {
    process.stdout.write(`${scenarioName} ${run}/${options.runs}... `);
    try {
      const result = await runBenchmark({
        mode: options.mode,
        scenarioName,
        timeoutMs: options.timeoutMs,
        url: options.url,
      });
      results.push({ ...result, run });
      process.stdout.write(
        `${result.outcome}, ${(result.readinessMs / 1_000).toFixed(2)}s, ${(result.mapBytes / 1_048_576).toFixed(2)} MiB\n`,
      );
    } catch (error) {
      results.push({
        error: error instanceof Error ? error.message : String(error),
        mode: options.mode,
        outcome: 'runner-error',
        run,
        scenario: scenarioName,
        timestamp: new Date().toISOString(),
        url: options.url,
      });
      process.stdout.write(`runner-error: ${error.message}\n`);
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  mode: options.mode,
  results,
  scenarios: Object.fromEntries(
    options.scenarios.map((name) => [name, SCENARIOS[name]]),
  ),
  summary: summarize(results),
  url: options.url,
};
await writeFile(options.output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${options.output}`);
if (results.some(({ outcome }) => outcome === 'runner-error')) {
  process.exitCode = 1;
}
