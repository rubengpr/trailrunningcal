import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildHomeAlternateLinks,
  buildBlogListingAlternateLinks,
  buildBlogPostAlternateLinks,
  buildContactAlternateLinks,
  buildRaceAlternateLinks,
} from './alternate-links';
import { BASE_URL } from '@/lib/config';
import * as blogUtils from './blog-utils';
import type { BlogPost } from './blog-utils';

// Mock blog-utils
vi.mock('./blog-utils', () => ({
  getPostBySlug: vi.fn(),
  getPostTranslations: vi.fn(),
}));

describe('buildHomeAlternateLinks', () => {
  it('should return correct alternate links for home page', () => {
    const result = buildHomeAlternateLinks();

    expect(result).toEqual({
      es: `${BASE_URL}/es`,
      ca: `${BASE_URL}/ca`,
      'x-default': `${BASE_URL}/es`,
    });
  });

  it('should always set x-default to Spanish', () => {
    const result = buildHomeAlternateLinks();
    expect(result['x-default']).toBe(result.es);
  });

  it('should include all required locales (es, ca, x-default)', () => {
    const result = buildHomeAlternateLinks();

    expect(result.es).toBeDefined();
    expect(result.ca).toBeDefined();
    expect(result['x-default']).toBeDefined();
  });

  it('should use correct BASE_URL in all links', () => {
    const result = buildHomeAlternateLinks();

    expect(result.es).toContain(BASE_URL);
    expect(result.ca).toContain(BASE_URL);
    expect(result['x-default']).toContain(BASE_URL);
  });
});

describe('buildBlogListingAlternateLinks', () => {
  it('should return correct alternate links for blog listing page', () => {
    const result = buildBlogListingAlternateLinks();

    expect(result).toEqual({
      es: `${BASE_URL}/es/blog`,
      ca: `${BASE_URL}/ca/blog`,
      'x-default': `${BASE_URL}/es/blog`,
    });
  });

  it('should always set x-default to Spanish', () => {
    const result = buildBlogListingAlternateLinks();
    expect(result['x-default']).toBe(result.es);
  });

  it('should include all required locales (es, ca, x-default)', () => {
    const result = buildBlogListingAlternateLinks();

    expect(result.es).toBeDefined();
    expect(result.ca).toBeDefined();
    expect(result['x-default']).toBeDefined();
  });

  it('should use correct BASE_URL in all links', () => {
    const result = buildBlogListingAlternateLinks();

    expect(result.es).toContain(BASE_URL);
    expect(result.ca).toContain(BASE_URL);
    expect(result['x-default']).toContain(BASE_URL);
  });

  it('should include /blog path in all URLs', () => {
    const result = buildBlogListingAlternateLinks();

    expect(result.es).toContain('/blog');
    expect(result.ca).toContain('/blog');
    expect(result['x-default']).toContain('/blog');
  });
});

describe('buildBlogPostAlternateLinks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return undefined if post not found', () => {
    vi.mocked(blogUtils.getPostBySlug).mockReturnValue(null);

    const result = buildBlogPostAlternateLinks('es', 'non-existent-slug');

    expect(result).toBeUndefined();
    expect(blogUtils.getPostBySlug).toHaveBeenCalledWith(
      'non-existent-slug',
      'es',
    );
  });

  it('should return correct alternate links for blog post with both translations', () => {
    const mockPost: BlogPost = {
      locale: 'es',
      slug: 'test-post-es',
      translationKey: 'test-post',
      title: 'Test Post',
      excerpt: 'Test excerpt',
      date: '2024-01-01',
      readTime: '5 min',
      image: '/test.jpg',
      imageAlt: 'Test image',
      content: 'Test content',
      filePath: '/path/to/es.mdx',
    };

    const mockTranslations: BlogPost[] = [
      { ...mockPost, locale: 'es', slug: 'test-post-es' },
      { ...mockPost, locale: 'ca', slug: 'test-post-ca' },
    ];

    vi.mocked(blogUtils.getPostBySlug).mockReturnValue(mockPost);
    vi.mocked(blogUtils.getPostTranslations).mockReturnValue(mockTranslations);

    const result = buildBlogPostAlternateLinks('es', 'test-post-es');

    expect(result).toEqual({
      es: `${BASE_URL}/es/blog/test-post-es`,
      ca: `${BASE_URL}/ca/blog/test-post-ca`,
      'x-default': `${BASE_URL}/es/blog/test-post-es`,
    });
  });

  it('should always set x-default to Spanish translation', () => {
    const mockPost: BlogPost = {
      locale: 'ca',
      slug: 'test-post-ca',
      translationKey: 'test-post',
      title: 'Test Post',
      excerpt: 'Test excerpt',
      date: '2024-01-01',
      readTime: '5 min',
      image: '/test.jpg',
      imageAlt: 'Test image',
      content: 'Test content',
      filePath: '/path/to/ca.mdx',
    };

    const mockTranslations: BlogPost[] = [
      { ...mockPost, locale: 'es', slug: 'test-post-es' },
      { ...mockPost, locale: 'ca', slug: 'test-post-ca' },
    ];

    vi.mocked(blogUtils.getPostBySlug).mockReturnValue(mockPost);
    vi.mocked(blogUtils.getPostTranslations).mockReturnValue(mockTranslations);

    const result = buildBlogPostAlternateLinks('ca', 'test-post-ca');

    // Even when viewing Catalan version, x-default should point to Spanish
    expect(result?.['x-default']).toBe(`${BASE_URL}/es/blog/test-post-es`);
    expect(result?.['x-default']).toBe(result?.es);
  });

  it('should include all translations in alternate links', () => {
    const mockPost: BlogPost = {
      locale: 'es',
      slug: 'test-post-es',
      translationKey: 'test-post',
      title: 'Test Post',
      excerpt: 'Test excerpt',
      date: '2024-01-01',
      readTime: '5 min',
      image: '/test.jpg',
      imageAlt: 'Test image',
      content: 'Test content',
      filePath: '/path/to/es.mdx',
    };

    const mockTranslations: BlogPost[] = [
      { ...mockPost, locale: 'es', slug: 'test-post-es' },
      { ...mockPost, locale: 'ca', slug: 'test-post-ca' },
    ];

    vi.mocked(blogUtils.getPostBySlug).mockReturnValue(mockPost);
    vi.mocked(blogUtils.getPostTranslations).mockReturnValue(mockTranslations);

    const result = buildBlogPostAlternateLinks('es', 'test-post-es');

    expect(result?.es).toBeDefined();
    expect(result?.ca).toBeDefined();
    expect(result?.['x-default']).toBeDefined();
  });

  it('should use correct BASE_URL and blog path in all URLs', () => {
    const mockPost: BlogPost = {
      locale: 'es',
      slug: 'test-post-es',
      translationKey: 'test-post',
      title: 'Test Post',
      excerpt: 'Test excerpt',
      date: '2024-01-01',
      readTime: '5 min',
      image: '/test.jpg',
      imageAlt: 'Test image',
      content: 'Test content',
      filePath: '/path/to/es.mdx',
    };

    const mockTranslations: BlogPost[] = [
      { ...mockPost, locale: 'es', slug: 'test-post-es' },
      { ...mockPost, locale: 'ca', slug: 'test-post-ca' },
    ];

    vi.mocked(blogUtils.getPostBySlug).mockReturnValue(mockPost);
    vi.mocked(blogUtils.getPostTranslations).mockReturnValue(mockTranslations);

    const result = buildBlogPostAlternateLinks('es', 'test-post-es');

    expect(result?.es).toContain(BASE_URL);
    expect(result?.es).toContain('/blog');
    expect(result?.ca).toContain(BASE_URL);
    expect(result?.ca).toContain('/blog');
    expect(result?.['x-default']).toContain(BASE_URL);
    expect(result?.['x-default']).toContain('/blog');
  });

  it('should call getPostTranslations with correct translationKey', () => {
    const mockPost: BlogPost = {
      locale: 'es',
      slug: 'test-post-es',
      translationKey: 'test-post-key',
      title: 'Test Post',
      excerpt: 'Test excerpt',
      date: '2024-01-01',
      readTime: '5 min',
      image: '/test.jpg',
      imageAlt: 'Test image',
      content: 'Test content',
      filePath: '/path/to/es.mdx',
    };

    const mockTranslations: BlogPost[] = [
      { ...mockPost, locale: 'es', slug: 'test-post-es' },
    ];

    vi.mocked(blogUtils.getPostBySlug).mockReturnValue(mockPost);
    vi.mocked(blogUtils.getPostTranslations).mockReturnValue(mockTranslations);

    buildBlogPostAlternateLinks('es', 'test-post-es');

    expect(blogUtils.getPostTranslations).toHaveBeenCalledWith(
      'test-post-key',
    );
  });
});

describe('buildContactAlternateLinks', () => {
  it('should return correct alternate links for contact page', () => {
    const result = buildContactAlternateLinks();

    expect(result).toEqual({
      es: `${BASE_URL}/es/contacto`,
      ca: `${BASE_URL}/ca/contacte`,
      'x-default': `${BASE_URL}/es/contacto`,
    });
  });

  it('should always set x-default to Spanish', () => {
    const result = buildContactAlternateLinks();
    expect(result['x-default']).toBe(result.es);
  });

  it('should include all required locales (es, ca, x-default)', () => {
    const result = buildContactAlternateLinks();

    expect(result.es).toBeDefined();
    expect(result.ca).toBeDefined();
    expect(result['x-default']).toBeDefined();
  });

  it('should use correct BASE_URL in all links', () => {
    const result = buildContactAlternateLinks();

    expect(result.es).toContain(BASE_URL);
    expect(result.ca).toContain(BASE_URL);
    expect(result['x-default']).toContain(BASE_URL);
  });

  it('should use correct contact paths for each locale', () => {
    const result = buildContactAlternateLinks();

    expect(result.es).toContain('/contacto');
    expect(result.ca).toContain('/contacte');
    expect(result['x-default']).toContain('/contacto');
  });
});

describe('buildRaceAlternateLinks', () => {
  it('should return correct alternate links for race page', () => {
    const raceSlug = 'test-race';
    const result = buildRaceAlternateLinks(raceSlug);

    expect(result).toEqual({
      es: `${BASE_URL}/es/carrera/${raceSlug}`,
      ca: `${BASE_URL}/ca/carrera/${raceSlug}`,
      'x-default': `${BASE_URL}/es/carrera/${raceSlug}`,
    });
  });

  it('should always set x-default to Spanish', () => {
    const raceSlug = 'any-race';
    const result = buildRaceAlternateLinks(raceSlug);
    expect(result['x-default']).toBe(result.es);
  });

  it('should include all required locales (es, ca, x-default)', () => {
    const raceSlug = 'test-race';
    const result = buildRaceAlternateLinks(raceSlug);

    expect(result.es).toBeDefined();
    expect(result.ca).toBeDefined();
    expect(result['x-default']).toBeDefined();
  });

  it('should use correct BASE_URL in all links', () => {
    const raceSlug = 'test-race';
    const result = buildRaceAlternateLinks(raceSlug);

    expect(result.es).toContain(BASE_URL);
    expect(result.ca).toContain(BASE_URL);
    expect(result['x-default']).toContain(BASE_URL);
  });

  it('should include /carrera path in all URLs', () => {
    const raceSlug = 'test-race';
    const result = buildRaceAlternateLinks(raceSlug);

    expect(result.es).toContain('/carrera');
    expect(result.ca).toContain('/carrera');
    expect(result['x-default']).toContain('/carrera');
  });

  it('should use the provided raceSlug in all URLs', () => {
    const raceSlug = 'ultra-trail-mont-blanc';
    const result = buildRaceAlternateLinks(raceSlug);

    expect(result.es).toContain(raceSlug);
    expect(result.ca).toContain(raceSlug);
    expect(result['x-default']).toContain(raceSlug);
  });

  it('should work with different race slugs', () => {
    const raceSlug1 = 'race-one';
    const raceSlug2 = 'race-two';

    const result1 = buildRaceAlternateLinks(raceSlug1);
    const result2 = buildRaceAlternateLinks(raceSlug2);

    expect(result1.es).toContain(raceSlug1);
    expect(result1.ca).toContain(raceSlug1);
    expect(result2.es).toContain(raceSlug2);
    expect(result2.ca).toContain(raceSlug2);
  });
});
