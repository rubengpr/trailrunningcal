export type RaceMapProvider = 'komoot' | 'wikiloc';

export interface RaceMapEmbed {
  provider: RaceMapProvider;
  url: string;
}

const WIKILOC_HOSTNAME_PATTERN = /(^|\.)wikiloc\.com$/i;
const WIKILOC_EMBED_PATH = '/wikiloc/embedv2.do';
const KOMOOT_HOSTNAME = 'www.komoot.com';
const KOMOOT_EMBED_PATH_PATTERN =
  /^\/(?:[a-z]{2}-[a-z]{2}\/)?(?:collection|tour)\/\d+\/embed$/i;

export function getRaceMapEmbed(value: string | null | undefined): RaceMapEmbed | null {
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' || url.username || url.password) {
    return null;
  }

  if (
    WIKILOC_HOSTNAME_PATTERN.test(url.hostname) &&
    url.pathname === WIKILOC_EMBED_PATH &&
    /^\d+$/.test(url.searchParams.get('id') ?? '')
  ) {
    return { provider: 'wikiloc', url: url.toString() };
  }

  if (
    url.hostname === KOMOOT_HOSTNAME &&
    KOMOOT_EMBED_PATH_PATTERN.test(url.pathname)
  ) {
    return { provider: 'komoot', url: url.toString() };
  }

  return null;
}
