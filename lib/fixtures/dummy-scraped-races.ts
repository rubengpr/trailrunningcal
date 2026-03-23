import type { TrailRaceAgentRaceRow } from '@/types/trail-race-agent.types';

/**
 * Static rows for testing the scraped-races preview without invoking the scraper or AI.
 */
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
            'Recorregut curt i tècnic pensat per provar el flux d’acceptació al panell.\n\n' +
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
