import { describe, expect, it } from 'vitest';

import { sanitizeFailure } from './openai-provider';
import {
  description,
  event_name,
  gpx_download_url,
  json_schema,
  negative_case,
  overall,
  races,
  race_tiers,
} from './scorers';
import type {
  CaseType,
  EventResearchMetadata,
  EventResearchResult,
  TrailEventOutput,
} from './types';

const spanishPhrase =
  'La carrera por montaña se celebra en un entorno natural de la provincia y reúne a corredores que recorren senderos y caminos. ';

function paragraph(length: number): string {
  const text = spanishPhrase.repeat(Math.ceil(length / spanishPhrase.length)).slice(0, length);
  return text.endsWith(' ') ? `${text.slice(0, -1)}a` : text;
}

function descriptionText(length: number): string {
  const firstLength = Math.floor((length - 2) / 2);
  return `${paragraph(firstLength)}\n\n${paragraph(length - 2 - firstLength)}`;
}

function metadata(caseType: CaseType = 'valid-event'): EventResearchMetadata {
  return {
    caseType,
    datasetVersion: 'valencia-v0',
    inputMode: 'name-only',
    verifiedAt: '2026-08-20',
  };
}

function trailEvent(): TrailEventOutput {
  return {
    event: {
      name: 'Trail Nocturno Cabeço d’Or',
      description: descriptionText(600),
      websiteUrl: 'https://example.com/evento',
    },
    races: [
      {
        name: 'Trail',
        date: '2026-10-03',
        city: 'Alcoi',
        province: 'Alicante',
        distanceKm: 100,
        elevationGainM: 1000,
        gpxDownloadUrl: null,
        tiers: [{ priceEur: 20, endsAt: '2026-09-01' }],
      },
    ],
    errorMessage: null,
  };
}

function result(value: unknown = trailEvent()): EventResearchResult {
  return {
    result: value,
    failure: null,
    response: {
      id: 'response-id',
      model: 'gpt-5.4-mini-2026-03-17',
      status: 'completed',
      searchCallCount: 1,
      sources: ['https://example.com/source'],
    },
  };
}

function args(
  output: EventResearchResult,
  expected: unknown = trailEvent(),
  caseType: CaseType = 'valid-event',
) {
  return { output, expected, metadata: metadata(caseType) };
}

describe('event research scorers', () => {
  it('hard-gates invalid output and sanitized failures', () => {
    expect(json_schema(args(result({ unexpected: true })))).toBe(0);
    expect(overall(args({ result: null, failure: 'api_error', response: null }))).toBe(0);
  });

  it('scores valid and negative cases through their respective paths', () => {
    expect(negative_case(args(result()))).toBe(1);

    const outOfScope = trailEvent();
    outOfScope.races = [];
    outOfScope.errorMessage = 'La prueba está fuera del ámbito geográfico.';
    expect(negative_case(args(result(outOfScope), outOfScope, 'out-of-scope'))).toBe(1);
    expect(races(args(result(outOfScope), outOfScope, 'out-of-scope'))).toBe(1);
    expect(overall(args(result(outOfScope), outOfScope, 'out-of-scope'))).toBe(1);

    const notFound: TrailEventOutput = {
      event: null,
      races: [],
      errorMessage: 'No se ha identificado la carrera indicada.',
    };
    expect(negative_case(args(result(notFound), notFound, 'not-found'))).toBe(1);
    expect(races(args(result(notFound), notFound, 'not-found'))).toBe(1);
  });

  it('scores event names by canonical similarity and discourages appended locations', () => {
    const expected = trailEvent();
    const equivalent = structuredClone(expected);
    equivalent.event!.name = 'III TRAIL NOCTURNO CABECO D OR';
    expect(event_name(args(result(equivalent), expected))).toBe(1);

    const compacted = structuredClone(expected);
    compacted.event!.name = 'Trail Nocturno Cabeço d’Or 3CIMS';
    const compactedExpected = structuredClone(expected);
    compactedExpected.event!.name = 'Trail Nocturno Cabeço d’Or 3 Cims';
    expect(event_name(args(result(compacted), compactedExpected))).toBe(1);

    const appendedCity = structuredClone(expected);
    appendedCity.event!.name = 'Trail Nocturno Cabeço d’Or Alcoi';
    expect(event_name(args(result(appendedCity), expected))).toBe(0.8);

    const partial = structuredClone(expected);
    partial.event!.name = 'Trail Cabeço';
    expect(event_name(args(result(partial), expected))).toBeCloseTo((4 / 7) * 0.8 + 0.2);

    const unrelated = structuredClone(expected);
    unrelated.event!.name = 'Otro trail';
    expect(event_name(args(result(unrelated), expected))).toBe(0);
  });

  it('scores the race set and critical race fields, with elevation at ten percent', () => {
    const expected = trailEvent();
    const boundary = structuredClone(expected);
    boundary.races[0].distanceKm = 110;
    boundary.races[0].elevationGainM = 1100;
    expect(races(args(result(boundary), expected))).toBe(1);

    const wrongDate = structuredClone(expected);
    wrongDate.races[0].date = '2026-10-04';
    expect(races(args(result(wrongDate), expected))).toBeCloseTo(0.85);

    const elevationOutside = structuredClone(expected);
    elevationOutside.races[0].elevationGainM = 1101;
    expect(races(args(result(elevationOutside), expected))).toBeCloseTo(0.95);

    const invented = structuredClone(expected);
    invented.races.push({ ...structuredClone(expected.races[0]), distanceKm: 90 });
    expect(races(args(result(invented), expected))).toBeCloseTo(5 / 6);
  });

  it('matches tiers within two euros and requires exact deadlines', () => {
    const expected = trailEvent();
    const withinTolerance = structuredClone(expected);
    withinTolerance.races[0].tiers[0].priceEur = 22;
    expect(race_tiers(args(result(withinTolerance), expected))).toBe(1);

    const outsideTolerance = structuredClone(expected);
    outsideTolerance.races[0].tiers[0].priceEur = 22.01;
    expect(race_tiers(args(result(outsideTolerance), expected))).toBe(0);

    const wrongDate = structuredClone(expected);
    wrongDate.races[0].tiers[0].endsAt = '2026-09-02';
    expect(race_tiers(args(result(wrongDate), expected))).toBe(0);
  });

  it('scores valid GPX-download URLs for every valid-event race', () => {
    const expected = trailEvent();
    const withGpx = structuredClone(expected);
    withGpx.races[0].gpxDownloadUrl = 'https://example.com/routes/trail.gpx';
    expect(gpx_download_url(args(result(withGpx), expected))).toBe(1);

    const partial = structuredClone(expected);
    partial.races.push({
      ...structuredClone(expected.races[0]),
      distanceKm: 90,
      gpxDownloadUrl: null,
    });
    partial.races[0].gpxDownloadUrl = 'https://example.com/routes/trail.gpx';
    expect(gpx_download_url(args(result(partial), expected))).toBe(0.5);

    const invalid = structuredClone(expected);
    invalid.races[0].gpxDownloadUrl = 'ftp://example.com/routes/trail.gpx';
    expect(gpx_download_url(args(result(invalid), expected))).toBe(0);

    const outOfScope = trailEvent();
    outOfScope.races = [];
    outOfScope.errorMessage = 'La prueba está fuera del ámbito geográfico.';
    expect(gpx_download_url(args(result(outOfScope), outOfScope, 'out-of-scope'))).toBe(1);
  });

  it('applies stepped description-length penalties outside the inclusive range', () => {
    for (const length of [600, 1000]) {
      const actual = trailEvent();
      actual.event!.description = descriptionText(length);
      expect(description(args(result(actual), actual))).toBe(1);
    }

    for (const length of [599, 580, 1001, 1020]) {
      const actual = trailEvent();
      actual.event!.description = descriptionText(length);
      expect(description(args(result(actual), actual))).toBe(0.95);
    }

    for (const length of [579, 1021]) {
      const actual = trailEvent();
      actual.event!.description = descriptionText(length);
      expect(description(args(result(actual), actual))).toBe(0.9);
    }

    const firstPerson = trailEvent();
    firstPerson.event!.description = `${descriptionText(575)} Yo participo cada año.`;
    expect(description(args(result(firstPerson), firstPerson))).toBe(0);
  });

  it('uses the requested positive-case weighting', () => {
    expect(overall(args(result()))).toBe(1);

    const wrongName = trailEvent();
    wrongName.event!.name = 'Otro trail';
    expect(overall(args(result(wrongName), trailEvent()))).toBeCloseTo(0.9);
  });

  it('never exposes provider error details in failure classification', () => {
    expect(sanitizeFailure(new Error('secret provider detail'))).toBe('api_error');
    expect(
      sanitizeFailure(
        Object.assign(new Error('request timed out with secret'), {
          name: 'APIConnectionTimeoutError',
        }),
      ),
    ).toBe('timeout');
  });
});
