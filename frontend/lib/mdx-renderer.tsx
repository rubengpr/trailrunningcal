import fs from 'fs';
import matter from 'gray-matter';
import { evaluate } from '@mdx-js/mdx';
import { components } from '@/mdx-components';
import type { MDXComponents } from 'mdx/types';
import * as runtime from 'react/jsx-runtime';
import React from 'react';
import type { Locale } from '@/i18n';

/**
 * Reads an MDX file, strips frontmatter, and returns the compiled React component
 * @param filePath - Path to the MDX file
 * @param locale - Locale for the blog post (defaults to 'es')
 * @returns Promise resolving to an object with the compiled MDX component and frontmatter
 */
export async function renderMDXFile(filePath: string, locale: Locale = 'es') {
  // Read the MDX file
  const fileContents = fs.readFileSync(filePath, 'utf8');

  // Extract frontmatter and content using gray-matter
  const { data: frontmatter, content } = matter(fileContents);

  // Create components with frontmatter data available to DateAuthorString
  const componentsWithFrontmatter = {
    ...components,
    DateAuthorString: () => {
      const DateAuthorStringComponent =
        components.DateAuthorString as React.ComponentType<{
          date?: string;
          author?: string;
          locale?: Locale;
        }>;
      return (
        <DateAuthorStringComponent
          date={frontmatter.date as string | undefined}
          author={frontmatter.author as string | undefined}
          locale={locale}
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

/**
 * Renders MDX from a content string instead of a file path
 * Useful when content is already loaded in memory (e.g., from blog-utils.ts)
 * @param content - MDX content string (with or without frontmatter)
 * @param frontmatter - Optional frontmatter object. If not provided, will be extracted from content
 * @param locale - Locale for the blog post (defaults to 'es')
 * @returns Promise resolving to the compiled React component
 */
export async function renderMDXFromString(
  content: string,
  frontmatter?: Record<string, unknown>,
  locale: Locale = 'es',
) {
  // Extract frontmatter from content if not provided
  let mdxContent: string;
  let mdxFrontmatter: Record<string, unknown>;

  if (frontmatter) {
    // Use provided frontmatter, content is already without frontmatter
    mdxContent = content;
    mdxFrontmatter = frontmatter;
  } else {
    // Extract frontmatter from content string
    const parsed = matter(content);
    mdxContent = parsed.content;
    mdxFrontmatter = parsed.data;
  }

  // Create components with frontmatter data available to DateAuthorString
  const componentsWithFrontmatter = {
    ...components,
    DateAuthorString: () => {
      const DateAuthorStringComponent =
        components.DateAuthorString as React.ComponentType<{
          date?: string;
          author?: string;
          locale?: Locale;
        }>;
      return (
        <DateAuthorStringComponent
          date={mdxFrontmatter.date as string | undefined}
          author={mdxFrontmatter.author as string | undefined}
          locale={locale}
        />
      );
    },
  };

  // Compile MDX to React component
  const { default: MDXContent } = await evaluate(mdxContent, {
    ...runtime,
    development: process.env.NODE_ENV === 'development',
    useMDXComponents: () => componentsWithFrontmatter as MDXComponents,
  });

  return MDXContent;
}
