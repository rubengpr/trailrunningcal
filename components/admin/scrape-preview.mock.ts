import type { TrailRaceAgentRaceRow } from '@/types/trail-race-agent.types';
import type { OpenRouterScrapeUsage } from '@/types/openrouter-scrape-usage.types';
import type { PageStats } from '@/types/races-scrape-api.types';

export const DUMMY_SCRAPED_RACES: TrailRaceAgentRaceRow[] = [
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
};

export const DUMMY_RAW_MODEL_OUTPUT = JSON.stringify({ races: DUMMY_SCRAPED_RACES }, null, 2);

/** Milliseconds shown as "last run" duration after loading dummy data. */
export const DUMMY_LAST_RUN_DURATION_MS = 1_420;

/** Crawl HTTP stats for mock preview (success + error === total). */
export const DUMMY_CRAWL_PAGE_STATS: PageStats = {
    total: 7,
    successCount: 6,
    errorCount: 1,
};
