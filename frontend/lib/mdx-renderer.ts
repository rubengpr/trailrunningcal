import fs from 'fs';
import matter from 'gray-matter';
import { evaluate } from '@mdx-js/mdx';
import { useMDXComponents } from '@/mdx-components';
import type { MDXComponents } from 'mdx/types';
import * as runtime from 'react/jsx-runtime';

/**
 * Reads an MDX file, strips frontmatter, and returns the compiled React component
 * @param filePath - Path to the MDX file
 * @returns Promise resolving to the compiled MDX component
 */
export async function renderMDXFile(filePath: string) {
  // Read the MDX file
  const fileContents = fs.readFileSync(filePath, 'utf8');

  // Strip frontmatter using gray-matter
  const { content } = matter(fileContents);

  // Get MDX components
  const components = useMDXComponents();

  // Compile MDX to React component
  const { default: MDXContent } = await evaluate(content, {
    ...runtime,
    development: process.env.NODE_ENV === 'development',
    useMDXComponents: () => components as MDXComponents,
  });

  return MDXContent;
}

