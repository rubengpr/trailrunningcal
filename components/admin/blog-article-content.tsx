import { createElement } from 'react';
import type { ReactNode } from 'react';
import { parseDocument } from 'htmlparser2';
import { Heading2, Heading3 } from 'lucide-react';
import { sanitizeContent } from '@/lib/blog/sanitize';

type ContentNode = ReturnType<typeof parseDocument>['children'][number];

function renderNode(node: ContentNode, key: string): ReactNode {
  if (node.type === 'text') return node.data;
  if (node.type !== 'tag') return null;
  if (node.name === 'br' || node.name === 'hr') return createElement(node.name, { key });
  const children = node.children.map((child, index) => renderNode(child, `${key}-${index}`));
  const Icon = node.name === 'h2' ? Heading2 : node.name === 'h3' ? Heading3 : null;
  if (Icon) {
    return createElement(node.name, { key },
      <span key="text">{children}</span>,
      <Icon key="icon" aria-hidden="true" className="ml-1.5 inline-block size-[0.85em] translate-y-[0.125em] align-baseline text-gray-400" />,
    );
  }
  return createElement(node.name, { key }, children);
}

export function BlogArticleContent({ html }: { html: string }) {
  const document = parseDocument(sanitizeContent(html));
  return (
    <div className="blog-article text-sm [&>p:first-child]:mt-0 [&_p]:my-4 [&_p]:leading-6 [&_p]:text-gray-700 [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:font-semibold [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-2 [&_table]:block [&_table]:overflow-x-auto [&_th]:border [&_th]:p-3 [&_td]:border [&_td]:p-3 [&_blockquote]:border-l-2 [&_blockquote]:pl-4">
      {document.children.map((node, index) => renderNode(node, String(index)))}
    </div>
  );
}
