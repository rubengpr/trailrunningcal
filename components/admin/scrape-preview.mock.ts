import type { TrailRace } from '@/types/trail-race-agent.types';
import type {
  TrailEventAgentEvent,
  TrailEventAgentRace,
} from '@/types/trail-event-agent.types';
import type { OpenRouterScrapeUsage } from '@/types/openrouter-scrape-usage.types';
import type { PageStats, ScrapeUsage } from '@/types/races-scrape-api.types';

export const DUMMY_SCRAPED_RACES: TrailRace[] = [
  {
    name: 'Trail dels Bastiments (prova)',
    date: '2025-09-14',
    city: "Castellar de n'Hug",
    province: 'Barcelona',
    description:
      'Prova de mitja distància amb sortida al centre del poble.\n\n' +
      'Inclou avituallaments líquids i sòlids als punts 12 km i 21 km.',
    distanceKm: 42,
    elevationGainM: 2800,
  },
  {
    name: 'Vertical de mostra — 10K',
    date: '2025-07-05',
    city: 'Ripoll',
    province: 'Girona',
    description:
      "Recorregut curt i tècnic pensat per provar el flux d'acceptació al panell.\n\n" +
      'Sense desnivell reportat a la font (cas null).',
    distanceKm: 10.5,
    elevationGainM: null,
  },
  {
    name: 'Marató de muntanya (dummy)',
    date: '2026-04-18',
    city: 'Tremp',
    province: 'Lleida',
    description:
      'Dades inventades només per desenvolupament.\n\n' +
      'Segon paràgraf per comprovar el salt de línia al preview.',
    distanceKm: 45,
    elevationGainM: 1950,
  },
];

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
  },
  {
    name: 'La curta',
    date: '2026-09-14',
    city: "Castellar de n'Hug",
    province: 'Barcelona',
    distanceKm: 21,
    elevationGainM: 1200,
  },
  {
    name: 'Caminada',
    date: '2026-09-14',
    city: "Castellar de n'Hug",
    province: 'Barcelona',
    distanceKm: 10,
    elevationGainM: null,
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

export const DUMMY_RAW_MODEL_OUTPUT = JSON.stringify(
  { races: DUMMY_SCRAPED_RACES },
  null,
  2,
);

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
