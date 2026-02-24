import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Dirent } from 'fs';

const mockExistsSync = vi.fn();
const mockReaddirSync = vi.fn();
const mockReadFileSync = vi.fn();

vi.mock('fs', () => ({
  default: {
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
    readdirSync: (...args: unknown[]) => mockReaddirSync(...args),
    readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
  },
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  readdirSync: (...args: unknown[]) => mockReaddirSync(...args),
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
}));

import { getAllBlogPosts, getPostBySlug, getPostsForLocale } from './blog-utils';

const ES_POST_CONTENT = `---
title: "Test Post ES"
excerpt: "An excerpt"
date: "2025-06-15"
readTime: "5 min"
slug: "test-post"
translationKey: "test-article"
image: "/images/test.jpg"
imageAlt: "Test image"
---
Content here`;

const CA_POST_CONTENT = `---
title: "Test Post CA"
excerpt: "Un extracte"
date: "2025-06-15"
readTime: "5 min"
slug: "test-post-ca"
translationKey: "test-article"
image: "/images/test.jpg"
imageAlt: "Test image"
---
Contingut aquí`;

const OLDER_ES_POST_CONTENT = `---
title: "Older Post ES"
excerpt: "An excerpt"
date: "2024-01-01"
readTime: "3 min"
slug: "older-post"
translationKey: "older-article"
image: "/images/older.jpg"
imageAlt: "Older image"
---
Older content`;

function makeDirent(name: string): Dirent {
  return {
    name,
    isDirectory: () => true,
    isFile: () => false,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    isSymbolicLink: () => false,
    path: '',
    parentPath: '',
  } as unknown as Dirent;
}

beforeEach(() => {
  vi.clearAllMocks();

  mockExistsSync.mockImplementation((filePath: unknown) => {
    const p = String(filePath);
    if (p.endsWith('content/blog')) return true;
    if (p.includes('test-article') && p.endsWith('es.mdx')) return true;
    if (p.includes('test-article') && p.endsWith('ca.mdx')) return true;
    if (p.includes('older-article') && p.endsWith('es.mdx')) return true;
    return false;
  });

  mockReaddirSync.mockReturnValue([
    makeDirent('test-article'),
    makeDirent('older-article'),
  ]);

  mockReadFileSync.mockImplementation((filePath: unknown) => {
    const p = String(filePath);
    if (p.includes('test-article') && p.endsWith('es.mdx')) return ES_POST_CONTENT;
    if (p.includes('test-article') && p.endsWith('ca.mdx')) return CA_POST_CONTENT;
    if (p.includes('older-article') && p.endsWith('es.mdx')) return OLDER_ES_POST_CONTENT;
    return '';
  });
});

describe('getAllBlogPosts', () => {
  it('should return posts sorted newest first', () => {
    const posts = getAllBlogPosts();
    expect(posts.length).toBeGreaterThan(0);
    for (let i = 0; i < posts.length - 1; i++) {
      const dateA = new Date(posts[i].date).getTime();
      const dateB = new Date(posts[i + 1].date).getTime();
      expect(dateA).toBeGreaterThanOrEqual(dateB);
    }
  });

  it('should return empty array when posts directory does not exist', () => {
    mockExistsSync.mockReturnValue(false);
    expect(getAllBlogPosts()).toEqual([]);
  });

  it('should return empty array when there are no article folders', () => {
    mockReaddirSync.mockReturnValue([]);
    expect(getAllBlogPosts()).toEqual([]);
  });
});

describe('getPostsForLocale', () => {
  it('should return only posts matching the es locale', () => {
    const posts = getPostsForLocale('es');
    expect(posts.length).toBeGreaterThan(0);
    posts.forEach((post) => expect(post.locale).toBe('es'));
  });

  it('should return only posts matching the ca locale', () => {
    const posts = getPostsForLocale('ca');
    expect(posts.length).toBeGreaterThan(0);
    posts.forEach((post) => expect(post.locale).toBe('ca'));
  });

  it('should return empty array when no files exist for any locale', () => {
    mockExistsSync.mockReturnValue(false);
    expect(getPostsForLocale('es')).toEqual([]);
    expect(getPostsForLocale('ca')).toEqual([]);
  });
});

describe('getPostBySlug', () => {
  it('should return the matching post for valid slug and locale', () => {
    const post = getPostBySlug('test-post', 'es');
    expect(post).not.toBeNull();
    expect(post?.slug).toBe('test-post');
    expect(post?.locale).toBe('es');
  });

  it('should return null for a non-existent slug', () => {
    expect(getPostBySlug('nonexistent-slug', 'es')).toBeNull();
  });

  it('should return null for a valid slug but wrong locale', () => {
    // test-post slug only exists in es, not ca (ca has test-post-ca)
    expect(getPostBySlug('test-post', 'ca')).toBeNull();
  });
});
