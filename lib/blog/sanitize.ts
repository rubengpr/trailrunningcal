import sanitizeHtml from 'sanitize-html';

const allowedTags = ['p', 'h2', 'h3', 'strong', 'em', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote', 'br', 'hr'];

export function sanitizeContent(html: string): string {
  return sanitizeHtml(html, { allowedTags, allowedAttributes: {} });
}
