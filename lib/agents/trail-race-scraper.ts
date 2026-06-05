import type { TrailEventAgentParsed } from '@/types/trail-event-agent.types';

function stripMarkdownJsonCodeFence(text: string): string {
  let s = text.trim();
  if (!s.startsWith('```')) {
    return s;
  }
  s = s.replace(/^```[^\n]*\r?\n?/, '');
  s = s.replace(/\r?\n?```\s*$/, '');
  return s.trim();
}

function tryParseTrailRaceJson(raw: string): TrailEventAgentParsed | null {
  try {
    return JSON.parse(raw) as TrailEventAgentParsed;
  } catch {
    return null;
  }
}

export function parseJsonOutputText(
  outputText: string,
): TrailEventAgentParsed | null {
  const fencedStripped = stripMarkdownJsonCodeFence(outputText);
  const direct = tryParseTrailRaceJson(fencedStripped);
  if (direct) {
    return direct;
  }

  const firstBrace = fencedStripped.indexOf('{');
  const lastBrace = fencedStripped.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return tryParseTrailRaceJson(
      fencedStripped.slice(firstBrace, lastBrace + 1),
    );
  }

  return null;
}
