export interface Publication {
  author: string | null;
  date: string | null;
  imagePath: string | null;
  imageAlt: string | null;
  version: number;
}

export interface PublicationInput {
  author: string;
  date: string;
  imageAlt?: string;
  version: number;
}

export interface ImageMetadata {
  width: number;
  height: number;
  bytes: number;
  format: string;
}
