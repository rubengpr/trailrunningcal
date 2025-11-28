import type { MDXComponents } from 'mdx/types';

const components: MDXComponents = {
  h1: ({ children }) => (
    <h1 className="text-4xl font-bold mb-4 mt-8">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-3xl font-bold mb-3 mt-6">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-2xl font-bold mb-2 mt-4">{children}</h3>
  ),
  p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
  ul: ({ children }) => (
    <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>
  ),
  li: ({ children }) => <li className="ml-4">{children}</li>,
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
