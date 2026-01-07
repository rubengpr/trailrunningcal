import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { Locale } from '@/i18n';

export interface BlogPostFrontmatter {
  title: string;
  excerpt: string;
  date: string;
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

/**
 * Scans content/blog/ directory and returns all blog posts from all locales
 * @returns Array of all blog posts, sorted by date (newest first)
 */
export function getAllBlogPosts(): BlogPost[] {
  // Check if posts directory exists
  if (!fs.existsSync(postsDirectory)) {
    console.warn(`Posts directory not found: ${postsDirectory}`);
    return [];
  }

  // Get all article folders in content/blog/
  const articleFolders = fs
    .readdirSync(postsDirectory, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  const allPosts: BlogPost[] = [];

  // For each article folder, check for es.mdx and ca.mdx files
  for (const articleFolder of articleFolders) {
    const articlePath = path.join(postsDirectory, articleFolder);

    // Check for both locale files
    const locales: Locale[] = ['es', 'ca'];
    for (const locale of locales) {
      const mdxFilePath = path.join(articlePath, `${locale}.mdx`);

      // Skip if file doesn't exist
      if (!fs.existsSync(mdxFilePath)) {
        continue;
      }

      try {
        const fileContents = fs.readFileSync(mdxFilePath, 'utf8');
        const { data, content } = matter(fileContents);

        // Validate required frontmatter fields
        if (!data.title || !data.slug || !data.translationKey || !data.image) {
          console.warn(
            `Post ${articleFolder}/${locale}.mdx is missing required frontmatter fields (title, slug, translationKey, or image)`,
          );
          continue;
        }

        // Validate translationKey matches folder name
        if (data.translationKey !== articleFolder) {
          console.warn(
            `Post ${articleFolder}/${locale}.mdx has translationKey "${data.translationKey}" but folder is "${articleFolder}". They should match.`,
          );
        }

        const post: BlogPost = {
          title: data.title,
          excerpt: data.excerpt || '',
          date: data.date || '',
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
        // Continue processing other files
      }
    }
  }

  // Sort by date, newest first
  // ISO dates parse reliably, but handle missing/invalid dates
  return allPosts.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    // Invalid dates become NaN, treat as 0 (oldest)
    const timeA = isNaN(dateA) ? 0 : dateA;
    const timeB = isNaN(dateB) ? 0 : dateB;
    return timeB - timeA;
  });
}

/**
 * Finds a blog post by its slug and locale
 * @param slug - The slug of the post
 * @param locale - The locale of the post
 * @returns The blog post or null if not found
 */
export function getPostBySlug(slug: string, locale: Locale): BlogPost | null {
  const allPosts = getAllBlogPosts();
  return (
    allPosts.find((post) => post.slug === slug && post.locale === locale) ||
    null
  );
}

/**
 * Gets all translations of an article by its translationKey
 * @param translationKey - The translationKey that links translations together
 * @returns Array of all translations of the article
 */
export function getPostTranslations(translationKey: string): BlogPost[] {
  const allPosts = getAllBlogPosts();
  return allPosts.filter((post) => post.translationKey === translationKey);
}

/**
 * Gets all blog posts for a specific locale
 * @param locale - The locale to filter by
 * @returns Array of posts for the locale, sorted by date (newest first)
 */
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
