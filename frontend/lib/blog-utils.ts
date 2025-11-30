import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface BlogPostFrontmatter {
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  slug: string;
  image: string;
  imageAlt: string;
}

export interface BlogPost extends BlogPostFrontmatter {
  content: string;
  id: number; // You can derive this from the slug or file name
}

const postsDirectory = path.join(process.cwd(), 'app/[locale]/blog/(posts)');

export function getAllBlogPosts(): BlogPost[] {
  // Get all directories in the posts folder
  const postDirs = fs
    .readdirSync(postsDirectory, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  const allPosts = postDirs
    .map((slug, index) => {
      const fullPath = path.join(postsDirectory, slug, 'content.mdx');

      if (!fs.existsSync(fullPath)) {
        return null;
      }

      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(fileContents);

      // Validate required frontmatter fields
      if (!data.title || !data.slug || !data.image) {
        console.warn(
          `Post ${slug} is missing required frontmatter fields (title, slug, or image)`,
        );
        return null;
      }

      return {
        id: index + 1,
        title: data.title,
        excerpt: data.excerpt || '',
        date: data.date || '',
        readTime: data.readTime || '',
        slug: data.slug || slug,
        image: data.image,
        imageAlt: data.imageAlt || data.title,
        content,
      } as BlogPost;
    })
    .filter((post): post is BlogPost => post !== null)
    // Sort by date, newest first
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });

  return allPosts;
}

export function getBlogPostBySlug(slug: string): BlogPost | null {
  const allPosts = getAllBlogPosts();
  return allPosts.find((post) => post.slug === slug) || null;
}
