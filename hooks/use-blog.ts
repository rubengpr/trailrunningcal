'use client';

import { createContext, useContext } from 'react';
import type { useBlogGeneration } from '@/hooks/use-blog-generation';

export const BlogContext = createContext<ReturnType<typeof useBlogGeneration> | null>(null);

export function useBlog() {
  const context = useContext(BlogContext);
  if (!context) throw new Error('Blog provider missing');
  return context;
}
