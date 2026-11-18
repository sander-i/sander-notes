import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';

export async function GET(context: APIContext) {
  const posts = (await getCollection('posts', ({ data }) => !data.draft))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
  const base = context.site ?? new URL('https://sander.gitlab.io');
  const prefix = import.meta.env.BASE_URL.replace(/\/$/, '');
  const items = posts.map((post) => {
    const route = `${prefix}/posts/${post.id.replace(/\.md$/, '')}/`;
    const link = new URL(route, base).href;
    return `\n    <item>\n      <title>${escapeXml(post.data.title)}</title>\n      <description>${escapeXml(post.data.description)}</description>\n      <link>${escapeXml(link)}</link>\n      <guid isPermaLink="true">${escapeXml(link)}</guid>\n      <pubDate>${post.data.pubDate.toUTCString()}</pubDate>\n    </item>`;
  }).join('');

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>Sander 的博客</title><description>技术、建站，以及值得留下来的想法。</description><link>${escapeXml(new URL(prefix + '/', base).href)}</link><language>zh-CN</language>${items}\n</channel></rss>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (char) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '\"': '&quot;',
  })[char]!);
}
