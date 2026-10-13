import { Parser } from 'htmlparser2';

const blockTags = new Set(['p', 'h2', 'h3', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote', 'br', 'hr']);

export function countCharacters(html: string): number {
  const parts: string[] = [];
  const parser = new Parser({
    onopentag(name) { if (blockTags.has(name)) parts.push(' '); },
    ontext(text) { parts.push(text); },
    onclosetag(name) { if (blockTags.has(name)) parts.push(' '); },
  }, { decodeEntities: true });
  parser.end(html);
  return Array.from(parts.join('').replace(/\s+/g, ' ').trim()).length;
}
