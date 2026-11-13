import { marked } from 'marked';
import { getPostsForLocale } from '@/lib/content/blog-utils';
import { visibleText } from '@/lib/blog/writing/text';
import type { RecentIntroduction } from '@/types/blog-writing.types';

// Read MDX as data only; never evaluate components or expressions for this context.
export function getRecentIntroductions(): RecentIntroduction[] {
  return getPostsForLocale('es')
    .filter(post => Number.isFinite(Date.parse(post.date)) && Date.parse(post.date) <= Date.now())
    .map(post => {
      const paragraphs: string[] = [];
      for (const token of marked.lexer(post.content)) {
        if (token.type === 'heading' && token.depth >= 2) break;
        if (token.type === 'paragraph') {
          const text = visibleText(marked.parseInline(token.text, { async: false }));
          if (text) paragraphs.push(text);
        }
      }
      return { title: post.title, introduction: paragraphs.join('\n\n').slice(0, 2500) };
    })
    .filter(post => post.introduction.length > 0)
    .slice(0, 3);
}
