import { readFileSync, statSync } from 'node:fs';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import path from 'node:path';

function getArgument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function sizes(buffer) {
  return {
    rawBytes: buffer.length,
    gzipBytes: gzipSync(buffer).length,
    brotliBytes: brotliCompressSync(buffer).length,
  };
}

function sum(rows, extension, key) {
  return rows
    .filter((row) => row.file.endsWith(extension))
    .reduce((total, row) => total + row[key], 0);
}

const distDir = getArgument('--dist', '.next');
const locale = getArgument('--locale', 'es');
const appDir = path.join(distDir, 'server', 'app');
const htmlPath = path.join(appDir, `${locale}.html`);
const rscPath = path.join(appDir, `${locale}.rsc`);
const html = readFileSync(htmlPath);
const htmlText = html.toString('utf8');
const assetPaths = [...new Set(
  [...htmlText.matchAll(/(?:src|href)="\/_next\/([^"?]+\.(?:js|css))/g)]
    .map((match) => match[1]),
)];
const assets = assetPaths.map((file) => ({
  file,
  ...sizes(readFileSync(path.join(distDir, decodeURIComponent(file)))),
}));

const result = {
  distDir,
  locale,
  html: sizes(html),
  rsc: sizes(readFileSync(rscPath)),
  initialJavaScript: {
    files: assets.filter((asset) => asset.file.endsWith('.js')).length,
    rawBytes: sum(assets, '.js', 'rawBytes'),
    gzipBytes: sum(assets, '.js', 'gzipBytes'),
    brotliBytes: sum(assets, '.js', 'brotliBytes'),
  },
  initialCss: {
    files: assets.filter((asset) => asset.file.endsWith('.css')).length,
    rawBytes: sum(assets, '.css', 'rawBytes'),
    gzipBytes: sum(assets, '.css', 'gzipBytes'),
    brotliBytes: sum(assets, '.css', 'brotliBytes'),
  },
  largestInitialAssets: assets
    .sort((a, b) => b.rawBytes - a.rawBytes)
    .slice(0, 10),
  generatedAt: new Date(statSync(htmlPath).mtimeMs).toISOString(),
};

console.log(JSON.stringify(result, null, 2));
