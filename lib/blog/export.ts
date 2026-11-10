import TurndownService from 'turndown';
import { tables } from 'turndown-plugin-gfm';
import matter from 'gray-matter';
import { compile } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import { textBlocks } from '@/lib/blog/article-blocks';
import { sanitizeContent } from '@/lib/blog/sanitize';
import { visibleText } from '@/lib/blog/writing/text';
import { allowedLinks } from '@/lib/blog/links';
import { validDate } from '@/lib/blog/publication';
import { ValidationError } from '@/lib/errors';
import type { DraftDetail } from '@/types/blog-draft-record.types';
import type { ArticleBlock } from '@/types/blog-article-block.types';
import type { ExportFile } from '@/types/blog-export.types';

export function prepareDocument(draft: DraftDetail): { blocks: ArticleBlock[]; paths: string[] } {
  if (draft.status !== 'completed') throw new ValidationError('article_incomplete', 422);
  const publication = draft.publication;
  if (![draft.title, draft.seoTitle, draft.metaDescription].every(value => value?.trim()) ||
      !draft.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug)) throw new ValidationError('missing_metadata', 422);
  if (!publication?.author?.trim() || !publication.date || !validDate(publication.date)) throw new ValidationError('missing_publication', 422);
  if (!publication.imagePath) throw new ValidationError('missing_cover', 422);
  const links = draft.articleLinks?.length ? draft.articleLinks : allowedLinks(draft.generationContext);
  const blocks = draft.articleDocument?.blocks ?? textBlocks(draft.contentHtml ?? '', links);
  if (!blocks.some(block => block.type === 'text' && visibleText(block.html).trim())) throw new ValidationError('empty_article', 422);
  if (!publication.imageAlt?.trim() || blocks.some(block => block.type === 'image' && !block.alt.trim())) throw new ValidationError('missing_alt', 422);
  if (blocks.some(block => block.type === 'image' && (!Number.isSafeInteger(block.metadata.width) || block.metadata.width < 1 || !Number.isSafeInteger(block.metadata.height) || block.metadata.height < 1))) throw new ValidationError('invalid_images', 422);
  return { blocks, paths: [...new Set([publication.imagePath, ...blocks.flatMap(block => block.type === 'image' ? [block.path] : [])])] };
}

// MDX interprets braces, JSX and top-level import/export as executable syntax.
function escapeText(value: string): string {
  return value.replace(/[{}<>]/g, char => `&#${char.codePointAt(0)};`)
    .replace(/^(\s*)(import|export)(?=\s)/gm, (_match, space: string, word: string) => `${space}&#${word.codePointAt(0)};${word.slice(1)}`);
}
function attribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/{/g, '&#123;').replace(/}/g, '&#125;').replace(/\r?\n/g, '&#10;');
}
function markdown(html: string, links: readonly string[]): string {
  const converter = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', emDelimiter: '*', codeBlockStyle: 'fenced' });
  converter.use(tables);
  converter.addRule('headerless-table', {
    filter: node => node.nodeName === 'TABLE' && !(node as HTMLTableElement).querySelector('th, thead'),
    replacement: (_content, node) => {
      const rows = Array.from((node as HTMLTableElement).rows).map(row => Array.from(row.cells).map(cell =>
        converter.turndown(cell.innerHTML).replace(/\|/g, '\\|').replace(/\n/g, ' ')));
      const columns = Math.max(0, ...rows.map(row => row.length));
      if (!columns) return '';
      const line = (cells: string[]) => `| ${Array.from({ length: columns }, (_, i) => cells[i] ?? '').join(' | ')} |`;
      return `\n\n${[line([]), line(Array(columns).fill('---')), ...rows.map(line)].join('\n')}\n\n`;
    },
  });
  converter.addRule('safe-table-cell', {
    filter: ['th', 'td'],
    replacement: (content, node) => {
      const first = node.parentNode?.firstChild === node;
      return `${first ? '| ' : ' '}${content.replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`;
    },
  });
  const standardEscape = converter.escape.bind(converter);
  converter.escape = text => escapeText(standardEscape(text));
  return converter.turndown(sanitizeContent(html, links));
}

interface SyntaxNode { type: string; name?: string; value?: unknown; attributes?: Array<{type: string; name?: string; value?: unknown}>; children?: SyntaxNode[] }
function safeSyntax() {
  return (tree: SyntaxNode) => {
    function check(node: SyntaxNode) {
      if (['mdxjsEsm', 'mdxFlowExpression', 'mdxTextExpression'].includes(node.type)) throw new Error('Executable MDX is forbidden');
      if (['mdxJsxFlowElement', 'mdxJsxTextElement'].includes(node.type)) {
        const attributes: Record<string, string[]> = {
          DateAuthorString: [], BlogHeaderImage: ['src', 'alt'], BlogImage: ['src', 'alt', 'width', 'height', 'caption'],
        };
        if (!node.name || !Object.hasOwn(attributes, node.name) || node.attributes?.some(item =>
          item.type !== 'mdxJsxAttribute' || !attributes[node.name!].includes(item.name ?? '') || typeof item.value !== 'string')) {
          throw new Error('Unsupported MDX component');
        }
      }
      node.children?.forEach(check);
    }
    check(tree);
  };
}

export async function renderDocument(draft: DraftDetail, blocks: ArticleBlock[], urls: Map<string, string>): Promise<ExportFile> {
  const publication = draft.publication!;
  function imageUrl(path: string): string {
    const url = urls.get(path);
    if (!url || !url.startsWith('https://')) throw new ValidationError('invalid_images', 422);
    return attribute(url);
  }
  const links = draft.articleLinks?.length ? draft.articleLinks : allowedLinks(draft.generationContext);
  const body = blocks.map(block => block.type === 'text' ? markdown(block.html, links) :
    `<BlogImage src="${imageUrl(block.path)}" alt="${attribute(block.alt)}" width="${block.metadata.width}" height="${block.metadata.height}"${block.caption ? ` caption="${attribute(block.caption)}"` : ''} />`).join('\n\n');
  const text = blocks.filter(block => block.type === 'text').map(block => visibleText(block.html)).join(' ');
  const minutes = Math.max(1, Math.ceil((text.trim().match(/\S+/g)?.length ?? 0) / 200));
  const title = new TurndownService().escape(draft.title!);
  const content = `# ${escapeText(title)}\n\n<DateAuthorString />\n\n<BlogHeaderImage src="${imageUrl(publication.imagePath!)}" alt="${attribute(publication.imageAlt!)}" />\n\n${body}\n`;
  try { await compile(content, { remarkPlugins: [remarkGfm, safeSyntax] }); }
  catch (error) { console.error('Blog export compilation failed', { id: draft.id, error }); throw new ValidationError('invalid_document', 422); }
  return {
    filename: `${draft.slug}.mdx`,
    content: matter.stringify(content, {
      title: draft.title, slug: draft.slug, seoTitle: draft.seoTitle, excerpt: draft.metaDescription,
      author: publication.author, date: publication.date, translationKey: draft.slug,
      image: urls.get(publication.imagePath!), imageAlt: publication.imageAlt, readTime: `${minutes} min`,
    }),
  };
}
