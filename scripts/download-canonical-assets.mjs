import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const source = await readFile(join(root, 'src/content/pages.ts'), 'utf8');
const urls = [...new Set(
  [...source.matchAll(/https:\/\/lh3\.googleusercontent\.com\/[^"'\\\s)]+/g)].map((match) =>
    match[0].replace(/&amp;/g, '&').replace(/\\u0026/g, '&'),
  ),
)];

const outputDir = join(root, 'public/canonical');
await mkdir(outputDir, { recursive: true });

const mapping = {};
let downloaded = 0;

for (const url of urls) {
  const hash = createHash('sha256').update(url).digest('hex').slice(0, 20);
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') ?? 'image/jpeg';
    const extension = contentType.includes('png') ? 'png'
      : contentType.includes('webp') ? 'webp'
        : contentType.includes('gif') ? 'gif' : 'jpg';
    const fileName = `${hash}.${extension}`;
    await writeFile(join(outputDir, fileName), Buffer.from(await response.arrayBuffer()));
    mapping[url] = `/canonical/${fileName}`;
    downloaded += 1;
  } catch (error) {
    console.warn(`Could not download ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

await writeFile(
  join(root, 'scripts/canonical-assets.json'),
  `${JSON.stringify(mapping, null, 2)}\n`,
);
console.log(`Downloaded ${downloaded}/${urls.length} canonical images.`);
