import { allowedLinks } from '@/lib/blog/links';
import { lengthRange } from '@/lib/blog/length-targets';
import { Parser } from 'htmlparser2';
import type { DeterministicResult, EvidenceSource, Finding, ScoringInput } from '@/types/blog-evaluation.types';

export function inspect(input: ScoringInput): DeterministicResult {
  const result: DeterministicResult = {
    points: { utility: 0, rigor: 0, structure: 0, metadata: 0, clarity: 0 },
    criticalErrors: [], observations: [],
    metrics: { text: '', headings: [], words: 0, lengths: { title: 0, seoTitle: 0, metaDescription: 0, slug: 0 }, keywordPresent: false },
  };
  const add = (code: string, field: EvidenceSource, explanation: string) => {
    result.criticalErrors.push({ code, field, explanation, evidence: [] });
  };
  const links = input.articleLinks?.length ? input.articleLinks : allowedLinks(input.generationContext);
  let heading: { level: number; text: string } | null = null;
  const allowed = new Set(['p','h2','h3','strong','em','ul','ol','li','table','thead','tbody','tr','th','td','blockquote','br','hr']);
  const parser = new Parser({
    onopentag(name, attrs) {
      const safeLink = name === 'a' && links.includes(attrs.href) && Object.keys(attrs).every(key => key === 'href');
      if (name === 'a' && !safeLink) add('links_not_allowed', 'article', '');
      else if (name === 'img') add('images_not_allowed', 'article', '');
      else if (name !== 'a' && !allowed.has(name) && !/^h[1-6]$/.test(name)) add('unsafe_html', 'article', '');
      if (Object.keys(attrs).length > 0 && !safeLink) add('unsafe_html', 'article', '');
      if (/^h[1-6]$/.test(name)) heading = { level: Number(name.slice(1)), text: '' };
      result.metrics.text += ' ';
    },
    ontext(text) { result.metrics.text += text; if (heading) heading.text += text; },
    onclosetag(name) {
      if (/^h[1-6]$/.test(name) && heading) { result.metrics.headings.push({ ...heading, text: heading.text.trim() }); heading = null; }
      result.metrics.text += ' ';
    },
  }, { decodeEntities: true });
  parser.end(input.contentHtml);
  result.metrics.text = result.metrics.text.replace(/\s+/g, ' ').trim();
  result.metrics.words = result.metrics.text ? result.metrics.text.split(/\s+/).length : 0;
  if (!result.metrics.text) add('empty_content', 'article', '');
  const headings = result.metrics.headings;
  const hasH2 = headings.some(h => h.level === 2);
  if (hasH2) result.points.structure += 2; else add('missing_h2', 'article', '');
  let seenH2 = false;
  const hierarchy = headings.every(h => {
    if (h.level === 2) { seenH2 = true; return true; }
    return h.level === 3 && seenH2;
  });
  if (hierarchy) result.points.structure += 2; else add('invalid_hierarchy', 'article', '');
  if (headings.every(h => h.text.length > 0)) result.points.structure += 1; else add('empty_heading', 'article', '');
  for (const field of ['title', 'seoTitle', 'metaDescription'] as const) {
    if (input[field].trim()) result.points.metadata += 2; else add('empty_metadata', field, '');
  }
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) result.points.metadata += 2; else add('invalid_slug', 'slug', '');
  if (Array.from(input.title.trim()).length < 20) add('short_title', 'title', '');
  if (!input.primaryKeyword.trim()) add('empty_keyword', 'primaryKeyword', '');
  for (const field of ['title','seoTitle','metaDescription','slug'] as const) {
    const count = Array.from(input[field].trim()).length;
    result.metrics.lengths[field] = count;
    const { min, max } = lengthRange(field, 'characters');
    if (count < min || count > max) result.observations.push({ code:'length_outside_target', field, explanation:String(count), evidence:[] });
  }
  const content = lengthRange('content', 'words');
  if (result.metrics.words < content.min || result.metrics.words > content.max) result.observations.push({ code:'length_outside_target', field:'article', explanation:String(result.metrics.words), evidence:[] });
  const words = input.primaryKeyword.trim().split(/\s+/).filter(Boolean).length;
  const keyword = lengthRange('primaryKeyword', 'words');
  if (words < keyword.min || words > keyword.max) result.observations.push({code:'keyword_length',field:'primaryKeyword',explanation:String(words),evidence:[]});
  const slugWords = input.slug.split('-').filter(Boolean).length;
  const slug = lengthRange('slug', 'words');
  if (slugWords < slug.min || slugWords > slug.max) result.observations.push({code:'slug_length',field:'slug',explanation:String(slugWords),evidence:[]});
  result.metrics.keywordPresent = !!input.primaryKeyword.trim() &&
    (input.title+' '+result.metrics.text).toLocaleLowerCase('es').includes(input.primaryKeyword.trim().toLocaleLowerCase('es'));
  if (!result.metrics.keywordPresent) result.observations.push({code:'keyword_not_literal',field:'primaryKeyword',explanation:'',evidence:[]});
  result.criticalErrors = deduplicate(result.criticalErrors);
  return result;
}

export function deduplicate(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter(finding => {
    const key = finding.code + ':' + finding.field;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}
