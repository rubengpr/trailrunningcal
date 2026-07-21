import type {
  TrailEventAgentEvent,
  TrailEventAgentRace,
} from '@/types/trail-event-agent.types';
import type { OpenRouterScrapeUsage } from '@/types/openrouter-scrape-usage.types';
import type { PageStats, ScrapeUsage } from '@/types/races-scrape-api.types';

export const DUMMY_SCRAPED_EVENT: TrailEventAgentEvent = {
  name: 'Trail dels Bastiments',
  description:
    'Trail dels Bastiments reúne varias distancias de montaña con salida en Castellar de n’Hug y recorridos de alta montaña por el entorno del Berguedà. La prueba combina pistas forestales, senderos técnicos y tramos abiertos con vistas al Prepirineo, pensados para corredores que buscan una jornada exigente pero accesible según la distancia elegida. La organización plantea el evento como una cita de pueblo, cercana y bien señalizada, con avituallamientos en puntos clave.\n\n' +
    'El programa incluye una opción larga para quienes quieren afrontar más desnivel, una distancia corta para perfiles menos experimentados y una caminata popular que mantiene el carácter montañero del evento. La propuesta destaca por su ambiente local, el paso por caminos tradicionales y una logística sencilla para participantes y acompañantes.',
  websiteUrl: 'https://example.com/trail-dels-bastiments',
};

export const DUMMY_SCRAPED_EVENT_RACES: TrailEventAgentRace[] = [
  {
    name: 'La llarga',
    date: '2026-09-14',
    city: "Castellar de n'Hug",
    province: 'Barcelona',
    distanceKm: 42,
    elevationGainM: 2800,
    tiers: [
      { priceEur: 45, endsAt: '2026-07-31' },
      { priceEur: 55, endsAt: '2026-08-31' },
    ],
  },
  {
    name: 'La curta',
    date: '2026-09-14',
    city: "Castellar de n'Hug",
    province: 'Barcelona',
    distanceKm: 21,
    elevationGainM: 1200,
    tiers: [],
  },
  {
    name: 'Caminada',
    date: '2026-09-14',
    city: "Castellar de n'Hug",
    province: 'Barcelona',
    distanceKm: 10,
    elevationGainM: null,
    tiers: [{ priceEur: 0, endsAt: null }],
  },
];

export const DUMMY_SCRAPE_MARKDOWN =
  '# Event dummy — vista previa\n\n' +
  'Aquest contingut és fictici per provar el layout, les mides i els botons de descàrrega.\n\n' +
  '## Secció de prova\n\n' +
  '- Línia 1\n' +
  '- Línia 2\n';

export const DUMMY_SCRAPE_USAGE: OpenRouterScrapeUsage = {
  promptTokens: 12_400,
  completionTokens: 890,
  totalTokens: 13_290,
  reasoningTokens: 0,
  cost: 0.035,
};

export const DUMMY_SPIDER_USAGE: ScrapeUsage = {
  totalCost: 0.015,
};

export const DUMMY_EVENT_RAW_MODEL_OUTPUT = JSON.stringify(
  {
    event: DUMMY_SCRAPED_EVENT,
    races: DUMMY_SCRAPED_EVENT_RACES,
    errorMessage: null,
  },
  null,
  2,
);

/** Milliseconds shown as "last run" duration after loading dummy data. */
export const DUMMY_LAST_RUN_DURATION_MS = 1_420;

/** Crawl HTTP stats for mock preview (success + error === total). */
export const DUMMY_CRAWL_PAGE_STATS: PageStats = {
  total: 7,
  successCount: 6,
  errorCount: 1,
};
