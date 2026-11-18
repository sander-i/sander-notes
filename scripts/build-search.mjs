import { createIndex, close } from 'pagefind';

const { index, errors } = await createIndex({ forceLanguage: 'zh' });
if (!index || errors.length) {
  throw new Error(`Pagefind index creation failed: ${errors.join('; ')}`);
}

try {
  const result = await index.addDirectory({ path: './dist', glob: '**/*.html' });
  if (result.errors.length) {
    throw new Error(`Pagefind indexing failed: ${result.errors.join('; ')}`);
  }
  const written = await index.writeFiles({ outputPath: './dist/pagefind' });
  if (written.errors.length) {
    throw new Error(`Pagefind output failed: ${written.errors.join('; ')}`);
  }
  console.log(`Pagefind indexed ${result.page_count} pages.`);
} finally {
  await close();
}
