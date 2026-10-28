import type { ImageMetadata } from '@/types/blog-publication.types';

export interface TextBlock { id: string; type: 'text'; html: string }
export interface ImageBlock { id: string; type: 'image'; path: string; alt: string; caption: string; metadata: ImageMetadata }
export type ArticleBlock = TextBlock | ImageBlock;
export interface ArticleDocument { blocks: ArticleBlock[]; version: number }
export type ImageEdit = { version: number } & (
  | { action: 'move'; direction: 'up' | 'down' }
  | { action: 'update'; alt: string; caption: string }
);
