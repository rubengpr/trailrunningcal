import { Parser } from 'htmlparser2';
import { normalizeText } from '@/lib/blog/writing/context';

export function visibleText(html: string, options: {excludeHeadings?:boolean} = {}): string {
  let headingDepth = 0;
  let text = '';
  const blocks = new Set([
    'p',
    'h2',
    'h3',
    'ul',
    'ol',
    'li',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'blockquote',
    'br',
    'hr',
  ]);
  const parser = new Parser(
    {
      onopentag: (name) => {
        if (/^h[1-6]$/.test(name)) headingDepth += 1;
        if (blocks.has(name)) text += ' ';
      },
      ontext: (value) => {
        if (!options.excludeHeadings || headingDepth === 0) text += value;
      },
      onclosetag: (name) => {
        if (/^h[1-6]$/.test(name)) headingDepth = Math.max(0,headingDepth-1);
        if (blocks.has(name)) text += ' ';
      },
    },
    { decodeEntities: true },
  );
  parser.end(html);
  return normalizeText(text);
}
