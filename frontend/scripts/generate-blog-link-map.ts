import fs from 'fs';
import path from 'path';
import { buildBlogPostLinkMap } from '../lib/blog-link-map';

/**
 * Generates a TypeScript file mapping blog post URLs to their Link headers
 * This is run at build time and the result is used in proxy (Node.js Runtime compatible)
 */
function generateBlogLinkMap() {
  const linkMap = buildBlogPostLinkMap();
  const outputPath = path.join(
    process.cwd(),
    'lib',
    'blog-link-map-generated.ts',
  );

  // Ensure directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate TypeScript file with the map
  const tsContent = `// Auto-generated at build time - do not edit manually
// Run: npm run generate:blog-link-map

export const BLOG_POST_LINK_MAP: Record<string, string> = ${JSON.stringify(
    linkMap,
    null,
    2,
  )};
`;

  fs.writeFileSync(outputPath, tsContent);
  console.log(
    `Generated blog link map with ${Object.keys(linkMap).length} entries`,
  );
}

generateBlogLinkMap();
