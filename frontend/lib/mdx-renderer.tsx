import fs from 'fs';
import matter from 'gray-matter';
import { evaluate } from '@mdx-js/mdx';
import { components } from '@/mdx-components';
import type { MDXComponents } from 'mdx/types';
import * as runtime from 'react/jsx-runtime';
import React from 'react';

/**
 * Reads an MDX file, strips frontmatter, and returns the compiled React component
 * @param filePath - Path to the MDX file
 * @returns Promise resolving to an object with the compiled MDX component and frontmatter
 */
export async function renderMDXFile(filePath: string) {
  // Read the MDX file
  const fileContents = fs.readFileSync(filePath, 'utf8');

  // Extract frontmatter and content using gray-matter
  const { data: frontmatter, content } = matter(fileContents);

  // Create components with frontmatter data available to DateAuthorString
  const componentsWithFrontmatter = {
    ...components,
    DateAuthorString: () => {
      const DateAuthorStringComponent = components.DateAuthorString as React.ComponentType<{
        date?: string;
        author?: string;
      }>;
      return (
        <DateAuthorStringComponent
          date={frontmatter.date}
          author={frontmatter.author}
        />
      );
    },
  };

  // Compile MDX to React component
  const { default: MDXContent } = await evaluate(content, {
    ...runtime,
    development: process.env.NODE_ENV === 'development',
    useMDXComponents: () => componentsWithFrontmatter as MDXComponents,
  });

  return MDXContent;
}

