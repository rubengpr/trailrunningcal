import sanitizeHtml from 'sanitize-html';

const allowedTags = ['p', 'h2', 'h3', 'strong', 'em', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote', 'br', 'hr'];

export function sanitizeContent(html: string, links: readonly string[] = []): string {
  return sanitizeHtml(html, { allowedTags: links.length ? [...allowedTags, 'a'] : allowedTags, allowedAttributes: links.length ? {a: ['href']} : {},
    transformTags: {a: (_tag, attributes) => { const attribs: Record<string, string> = {}; if (links.includes(attributes.href)) attribs.href = attributes.href; return {tagName: 'a', attribs}; }},
    allowedSchemes: [], allowProtocolRelative: false,
  });
}
