import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import devSearch from './src/integrations/dev-search.mjs';

// Cloudzyro 申诉期间以 Workers 为主站；恢复后把默认值改回 Cloudzyro 即可。
const site = process.env.SITE_URL ?? 'https://sander-notes.sander-o.workers.dev';
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  site,
  base,
  outDir: './dist',
  publicDir: './static',
  integrations: [
    sitemap({
      filter: (page) => !page.endsWith('/search/') && !page.endsWith('/404/'),
    }),
    devSearch(),
  ],
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
});
