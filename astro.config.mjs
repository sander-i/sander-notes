import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL ?? 'https://sander.cloudzyro.app';
const base = process.env.BASE_PATH ?? '/';
const baseUrl = new URL(base, site).href.replace(/\/$/, '');

export default defineConfig({
  site,
  base,
  outDir: './dist',
  publicDir: './static',
  integrations: [
    sitemap({
      filter: (page) =>
        !page.endsWith('/search/') && !page.endsWith('/404/') && page !== baseUrl,
    }),
  ],
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
});
