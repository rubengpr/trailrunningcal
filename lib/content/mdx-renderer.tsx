import fs from 'fs';
import matter from 'gray-matter';
import { evaluate } from '@mdx-js/mdx';
import { components } from '@/mdx-components';
import type { MDXComponents } from 'mdx/types';
import * as runtime from 'react/jsx-runtime';
import React from 'react';
import type { Locale } from '@/i18n';

export async function renderMDXFile(filePath: string, locale: Locale = 'es') {
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data: frontmatter, content } = matter(fileContents);

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

  const { default: MDXContent } = await evaluate(content, {
    ...runtime,
    development: process.env.NODE_ENV === 'development',
    useMDXComponents: () => componentsWithFrontmatter as MDXComponents,
  });

  return MDXContent;
}
