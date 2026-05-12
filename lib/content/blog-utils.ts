import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { Locale } from '@/i18n';

export interface BlogPostFrontmatter {
  title: string;
  excerpt: string;
  date: string;
  dateModified?: string;
  readTime: string;
  slug: string;
  translationKey: string;
  image: string;
  imageAlt: string;
}

export interface BlogPost extends BlogPostFrontmatter {
  content: string;
  locale: Locale;
  filePath: string;
}

const postsDirectory = path.join(process.cwd(), 'content/blog');

export function getAllBlogPosts(): BlogPost[] {
  if (!fs.existsSync(postsDirectory)) {
    console.warn(`Posts directory not found: ${postsDirectory}`);
    return [];
  }

  const articleFolders = fs
    .readdirSync(postsDirectory, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  const allPosts: BlogPost[] = [];

  for (const articleFolder of articleFolders) {
    const articlePath = path.join(postsDirectory, articleFolder);

    const locales: Locale[] = ['es', 'ca'];
    for (const locale of locales) {
      const mdxFilePath = path.join(articlePath, `${locale}.mdx`);

      if (!fs.existsSync(mdxFilePath)) {
        continue;
      }

      try {
        const fileContents = fs.readFileSync(mdxFilePath, 'utf8');
        const { data, content } = matter(fileContents);

        if (!data.title || !data.slug || !data.translationKey || !data.image) {
          console.warn(
            `Post ${articleFolder}/${locale}.mdx is missing required frontmatter fields (title, slug, translationKey, or image)`,
          );
          continue;
        }

        if (data.translationKey !== articleFolder) {
          console.warn(
            `Post ${articleFolder}/${locale}.mdx has translationKey "${data.translationKey}" but folder is "${articleFolder}". They should match.`,
          );
        }

        const post: BlogPost = {
          title: data.title,
          excerpt: data.excerpt || '',
          date: data.date || '',
          dateModified: data.dateModified || undefined,
          readTime: data.readTime || '',
          slug: data.slug,
          translationKey: data.translationKey,
          image: data.image,
          imageAlt: data.imageAlt || data.title,
          content,
          locale,
          filePath: mdxFilePath,
        };

        allPosts.push(post);
      } catch (error) {
        console.error(
          `Error reading post ${articleFolder}/${locale}.mdx:`,
          error,
        );
      }
    }
  }

  return allPosts.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    const timeA = isNaN(dateA) ? 0 : dateA;
    const timeB = isNaN(dateB) ? 0 : dateB;
    return timeB - timeA;
  });
}

export function getPostBySlug(slug: string, locale: Locale): BlogPost | null {
  const allPosts = getAllBlogPosts();
  return (
    allPosts.find((post) => post.slug === slug && post.locale === locale) ||
    null
  );
}

export function getPostTranslations(translationKey: string): BlogPost[] {
  const allPosts = getAllBlogPosts();
  return allPosts.filter((post) => post.translationKey === translationKey);
}

export function getPostsForLocale(locale: Locale): BlogPost[] {
  const allPosts = getAllBlogPosts();
  return allPosts
    .filter((post) => post.locale === locale)
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      const timeA = isNaN(dateA) ? 0 : dateA;
      const timeB = isNaN(dateB) ? 0 : dateB;
      return timeB - timeA;
    });
}
