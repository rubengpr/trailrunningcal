import path from 'path';
import { renderMDXFile } from '@/lib/mdx-renderer';

export default async function BlogPostPage() {
  const contentPath = path.join(
    process.cwd(),
    'app/[locale]/blog/(posts)/mejores-carreras-trail-running-espana-2026/content.mdx',
  );

  const MDXContent = await renderMDXFile(contentPath);

  return <MDXContent />;
}

