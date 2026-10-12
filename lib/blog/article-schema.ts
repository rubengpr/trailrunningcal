export const articleSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Título visible del artículo en español.' },
    contentMarkdown: { type: 'string', description: 'Artículo completo en Markdown con h2/h3, sin h1, HTML, imágenes, enlaces ni URLs.' },
    primaryKeyword: { type: 'string', description: 'Keyword principal coherente con el encargo.' },
    slug: { type: 'string', description: 'Slug breve en minúsculas, sin tildes y con guiones.' },
    seoTitle: { type: 'string', description: 'Título SEO específico y fiel al artículo.' },
    metaDescription: { type: 'string', description: 'Resumen breve y preciso del beneficio del artículo.' },
  },
  required: ['title', 'contentMarkdown', 'primaryKeyword', 'slug', 'seoTitle', 'metaDescription'],
  additionalProperties: false,
} as const;
