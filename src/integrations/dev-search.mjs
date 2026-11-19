import { createReadStream } from 'node:fs';
import { mkdir, rm, stat } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createIndex, close } from 'pagefind';

const MIME = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pagefind': 'application/wasm',
  '.pf_meta': 'application/octet-stream',
  '.pf_index': 'application/octet-stream',
  '.pf_fragment': 'application/octet-stream',
};

/**
 * 开发模式下按需生成 Pagefind 索引并挂到 /pagefind/*。
 *
 * `npm run build` 才会生成静态索引，`astro dev` 下 /pagefind/* 默认 404，
 * 导致搜索页在本地不可用、问题只能等上线才暴露。这里让 dev 也能真实搜索：
 * 抓取 dev 服务器实际渲染的页面，喂给 Pagefind，产出写到 .astro/pagefind，
 * 再由中间件对外提供。内容变更时防抖重建。
 */
export default function devSearch() {
  return {
    name: 'dev-search',
    hooks: {
      'astro:config:done': ({ config }) => {
        outDir = join(fileURLToPath(config.root), '.astro', 'pagefind');
        base = config.base.replace(/\/$/, '');
      },
      'astro:server:setup': ({ server, logger }) => {
        // 带 base 时 Vite 会先把 base 前缀剥掉再交给中间件，因此两种形式都要认。
        server.middlewares.use(async (req, res, next) => {
          const pathname = decodeURIComponent((req.url ?? '/').split('?')[0]);
          const withBase = `${base}/pagefind`;
          const candidates = [withBase, '/pagefind'];
          const prefix = candidates.find((p) => pathname === p || pathname.startsWith(`${p}/`));
          if (!prefix) return next();
          const rel = pathname.slice(prefix.length) || '/';
          const filePath = resolve(outDir, `.${rel.startsWith('/') ? rel : '/' + rel}`);
          if (!filePath.startsWith(outDir + sep)) {
            res.statusCode = 403;
            res.end('Forbidden');
            return;
          }
          const info = await stat(filePath).catch(() => null);
          if (!info?.isFile()) {
            res.statusCode = 404;
            res.end('Not found');
            return;
          }
          const type = MIME[filePath.slice(filePath.lastIndexOf('.'))] ?? 'application/octet-stream';
          res.setHeader('Content-Type', type);
          res.setHeader('Cache-Control', 'no-store');
          createReadStream(filePath).pipe(res);
        });

        const debounced = debounce(() => rebuild(server, logger), 600);
        const onFile = (file) => {
          if (/src[\\/]content[\\/].*\.mdx?$/.test(file)) debounced();
        };
        server.watcher.on('change', onFile);
        server.watcher.on('add', onFile);
        server.watcher.on('unlink', onFile);
      },
      'astro:server:start': async ({ address, logger }) => {
        const host = address.address === '::' || address.address === '0.0.0.0' ? 'localhost' : address.address;
        // IPv6 字面量需要方括号，否则 URL 解析失败。
        const hostForUrl = host.includes(':') ? `[${host}]` : host;
        origin = `http://${hostForUrl}:${address.port}`;
        await rebuild({ resolvedUrls: { local: [origin] } }, logger);
      },
    },
  };
}

let outDir = '';
let base = '';
let origin = '';
let pending = Promise.resolve();

async function rebuild(server, logger) {
  const root = origin || server?.resolvedUrls?.local?.[0]?.replace(/\/$/, '');
  if (!root) return;
  // 串行化，避免多次变更触发并发写同一目录。
  pending = pending.then(() => buildIndex(root, logger)).catch(() => {});
  await pending;
}

async function buildIndex(root, logger) {
  const started = Date.now();
  try {
    const homeUrl = `${root}${base}/`;
    const homeRes = await fetch(homeUrl);
    if (!homeRes.ok) throw new Error(`GET ${homeUrl} → ${homeRes.status}`);
    const homeHtml = await homeRes.text();

    const urls = new Set([`${base}/`]);
    for (const m of homeHtml.matchAll(/href="([^"#?]*\/posts\/[^"#?]*\/)"/g)) {
      urls.add(m[1]);
    }

    const files = [];
    for (const url of urls) {
      const res = await fetch(`${root}${url}`);
      if (!res.ok) continue;
      files.push({ url, content: await res.text() });
    }

    await close();
    const { index, errors } = await createIndex({ forceLanguage: 'zh' });
    if (!index || errors.length) throw new Error(errors.join('; '));
    for (const file of files) {
      const added = await index.addHTMLFile(file);
      if (added.errors.length) throw new Error(added.errors.join('; '));
    }
    await rm(outDir, { recursive: true, force: true });
    await mkdir(outDir, { recursive: true });
    const written = await index.writeFiles({ outputPath: outDir });
    if (written.errors.length) throw new Error(written.errors.join('; '));
    await close();
    logger?.info(`dev-search: 索引 ${files.length} 个页面，用时 ${Date.now() - started}ms`);
  } catch (error) {
    logger?.warn(`dev-search: 索引失败 — ${error.message}`);
  }
}

function debounce(fn, wait) {
  let timer = 0;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = 0;
      fn(...args);
    }, wait);
  };
}
