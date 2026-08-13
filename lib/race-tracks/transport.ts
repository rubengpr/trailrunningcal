import {
  MAX_TRACK_SOURCE_POINTS,
} from '@/lib/race-tracks/limits';

const UNSAFE_XML_PATTERN = /<!\s*(?:DOCTYPE|ENTITY)\b/i;

function invalidTrack(): Error {
  return new Error('Invalid track file');
}

function getChildren(element: Element, name: string): Element[] {
  return Array.from(element.childNodes).flatMap((node) =>
    node.nodeType === 1 &&
    (node as Element).localName.toLowerCase() === name
      ? [node as Element]
      : [],
  );
}

function getName(element: Element): string | null {
  const name = getChildren(element, 'name')[0]?.textContent?.trim();
  return name ? name.slice(0, 200) : null;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function coordinate(
  point: Element,
  attribute: 'lat' | 'lon',
): number {
  const attributeValue = point.getAttribute(attribute)?.trim();
  if (!attributeValue) throw invalidTrack();
  const value = Number(attributeValue);
  const minimum = attribute === 'lat' ? -90 : -180;
  const maximum = attribute === 'lat' ? 90 : 180;
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw invalidTrack();
  }
  return round(value, 6);
}

function serializePoint(point: Element, tagName: 'trkpt' | 'rtept'): string {
  const longitude = coordinate(point, 'lon');
  const latitude = coordinate(point, 'lat');
  const elevationValue = getChildren(point, 'ele')[0]?.textContent?.trim();
  let elevation = '';
  if (elevationValue !== undefined) {
    if (!elevationValue) throw invalidTrack();
    const numericElevation = Number(elevationValue);
    if (!Number.isFinite(numericElevation)) throw invalidTrack();
    elevation = `<ele>${round(numericElevation, 1)}</ele>`;
  }

  return `<${tagName} lon="${longitude}" lat="${latitude}">${elevation}</${tagName}>`;
}

function serializeName(element: Element): string {
  const name = getName(element);
  return name ? `<name>${escapeXml(name)}</name>` : '';
}

function serializeTrack(track: Element): { xml: string; pointCount: number } {
  let pointCount = 0;
  const segments = getChildren(track, 'trkseg').map((segment) => {
    const points = getChildren(segment, 'trkpt').map((point) => {
      pointCount += 1;
      return serializePoint(point, 'trkpt');
    });
    return `<trkseg>${points.join('')}</trkseg>`;
  });

  return {
    xml: `<trk>${serializeName(track)}${segments.join('')}</trk>`,
    pointCount,
  };
}

function serializeRoute(route: Element): { xml: string; pointCount: number } {
  const points = getChildren(route, 'rtept').map((point) =>
    serializePoint(point, 'rtept'),
  );
  return {
    xml: `<rte>${serializeName(route)}${points.join('')}</rte>`,
    pointCount: points.length,
  };
}

export function normalizeTrackForTransport(xml: string): string {
  if (UNSAFE_XML_PATTERN.test(xml)) throw invalidTrack();

  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (
    document.documentElement?.localName.toLowerCase() !== 'gpx' ||
    document.getElementsByTagName('parsererror').length > 0
  ) {
    throw invalidTrack();
  }

  const tracks = getChildren(document.documentElement, 'trk').map(serializeTrack);
  const routes = getChildren(document.documentElement, 'rte').map(serializeRoute);
  const pointCount = [...tracks, ...routes].reduce(
    (total, item) => total + item.pointCount,
    0,
  );
  if (pointCount === 0 || pointCount > MAX_TRACK_SOURCE_POINTS) {
    throw invalidTrack();
  }

  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">' +
    tracks.map((track) => track.xml).join('') +
    routes.map((route) => route.xml).join('') +
    '</gpx>'
  );
}
