'use client';
import type { ReactNode } from 'react';
import { BlogContext } from '@/hooks/use-blog';
import { useBlogGeneration } from '@/hooks/use-blog-generation';
export function BlogProvider({ children }: { children: ReactNode }) {
  const state = useBlogGeneration();
  return <BlogContext.Provider value={state}>{children}</BlogContext.Provider>;
}
