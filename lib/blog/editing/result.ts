import Ajv from 'ajv';
import { marked } from 'marked';
import { GenerationError, renderContent } from '@/lib/blog/content';
import { visibleText } from '@/lib/blog/writing/text';
import { normalizeText, prepare as prepareContext } from '@/lib/blog/writing/context';
import { inspectQuality } from '@/lib/blog/writing/quality';
import { writingLinks } from '@/lib/blog/links';
import type { EditingInput, EditingRequest, EditingResponse } from '@/types/blog-editing.types';

const text = (markdown: string) => visibleText(marked.parse(markdown, { async: false }));
const invalid = () => { throw new GenerationError('invalid_content'); };

export function prepare(request: EditingRequest): EditingInput {
  const { input } = prepareContext(request.context);
  let section = '';
  const blocks = marked.lexer(request.source.article.contentMarkdown).map((token, index) => {
    if (token.type === 'heading' && token.depth === 2) section = text(token.raw);
    let editable = token.type === 'paragraph';
    marked.walkTokens([token], inline => { if (inline.type === 'link') editable = false; });
    return { id: `block-${index}`, section, editable, markdown: token.raw };
  });
  const references = request.source.references.map((reference, index) => {
    const event = request.context.events.find(event => event.eventId === reference.eventId);
    const blockIds = blocks.filter(block => normalizeText(block.section) === normalizeText(event?.eventName ?? '') && text(block.markdown).includes(normalizeText(reference.excerpt))).map(block => block.id);
    if (!blockIds.length) invalid();
    return { id: `reference-${index}`, excerpt: reference.excerpt, blockIds };
  });
  if (!blocks.some(block => block.editable)) invalid();
  return { regionName: input.regionName, title: request.source.article.title, blocks, references, events: input.events };
}

export function schema(input: EditingInput) {
  const string = { type: 'string', minLength: 1, maxLength: 100_000 };
  return {
    type: 'object', additionalProperties: false, required: ['edits', 'references'],
    properties: {
      edits: { type: 'array', minItems: input.blocks.filter(block => block.editable).length, maxItems: input.blocks.filter(block => block.editable).length, items: { type: 'object', additionalProperties: false, required: ['id', 'markdown'], properties: { id: { type: 'string', enum: input.blocks.filter(block => block.editable).map(block => block.id) }, markdown: string } } },
      references: { type: 'array', minItems: input.references.length, maxItems: input.references.length, items: { type: 'object', additionalProperties: false, required: ['id', 'blockId', 'excerpt'], properties: { id: { type: 'string', ...(input.references.length ? { enum: input.references.map(reference => reference.id) } : {}) }, blockId: { type: 'string', enum: input.blocks.map(block => block.id) }, excerpt: { ...string, maxLength: 2000 } } } },
    },
  };
}

function inlineShape(markdown: string): string[] {
  const tokens = marked.lexer(markdown.trim());
  if (tokens.length !== 1 || tokens[0].type !== 'paragraph') invalid();
  const shape: string[] = [];
  marked.walkTokens(tokens, token => {
    if (!['paragraph', 'text', 'strong', 'em', 'escape', 'br'].includes(token.type)) invalid();
    if (['strong', 'em', 'br'].includes(token.type)) shape.push(token.type);
  });
  return shape;
}

export function apply(value: unknown, request: EditingRequest, input: EditingInput) {
  if (!new Ajv().compile<EditingResponse>(schema(input))(value)) invalid();
  const response = value as EditingResponse;
  const expected = input.blocks.filter(block => block.editable);
  if (response.edits.length !== expected.length || new Set(response.edits.map(edit => edit.id)).size !== expected.length || response.references.length !== input.references.length || new Set(response.references.map(reference => reference.id)).size !== input.references.length) invalid();
  const edits = new Map(response.edits.map(edit => [edit.id, edit.markdown.trim()]));
  const blocks = input.blocks.map(block => {
    if (!block.editable) return block;
    const markdown = edits.get(block.id)!;
    if (!markdown || /https?:\/\/|www\./i.test(markdown) || JSON.stringify(inlineShape(markdown)) !== JSON.stringify(inlineShape(block.markdown))) invalid();
    return { ...block, markdown };
  });
  const contentMarkdown = blocks.map(block => block.markdown.trim()).filter(Boolean).join('\n\n');
  // A style edit cannot introduce or remove numeric facts. Repetition is irrelevant.
  const numbers = (markdown: string) => new Set(text(markdown).match(/\d+(?:[.,]\d+)*/g) ?? []);
  const originalNumbers = numbers(request.source.article.contentMarkdown);
  const revisedNumbers = numbers(contentMarkdown);
  if (originalNumbers.size !== revisedNumbers.size || [...originalNumbers].some(number => !revisedNumbers.has(number))) invalid();
  const references = input.references.map((original, index) => {
    const revised = response.references.find(reference => reference.id === original.id)!;
    const block = blocks.find(block => block.id === revised.blockId)!;
    const oldBlock = input.blocks.find(block => block.id === original.blockIds[0])!;
    const excerpt = normalizeText(revised.excerpt);
    if (!excerpt || !block || block.section !== oldBlock.section || !text(block.markdown).includes(excerpt)) invalid();
    return { ...request.source.references[index], excerpt };
  });
  const article = { ...request.source.article, contentMarkdown };
  return { article, contentHtml: renderContent(contentMarkdown, writingLinks(request.context)), references, quality: inspectQuality(article, request.context.events) };
}
