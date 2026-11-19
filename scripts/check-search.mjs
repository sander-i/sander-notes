import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * 构建后校验搜索链路完整性。
 *
 * Pagefind 索引只在 build 阶段生成，一旦生成失败、路径不对或页面标记丢失，
 * 线上搜索页会静默变成空白，且没有任何报错。这个脚本把这类问题挡在 CI。
 */

const DIST = 'dist';
const POSTS = 'src/content/posts';

const failures = [];
const check = (ok, message) => {
  if (!ok) failures.push(message);
};

async function exists(path) {
  return Boolean(await stat(path).catch(() => null));
}

async function countPublishedPosts() {
  const files = (await readdir(POSTS)).filter((f) => f.endsWith('.md'));
  let count = 0;
  for (const file of files) {
    const text = await readFile(join(POSTS, file), 'utf8');
    const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
    if (!/^draft:\s*true\s*$/m.test(frontmatter)) count += 1;
  }
  return count;
}

const entryPath = join(DIST, 'pagefind', 'pagefind-entry.json');
check(await exists(entryPath), `缺少 ${entryPath}`);

if (await exists(entryPath)) {
  const entry = JSON.parse(await readFile(entryPath, 'utf8'));
  const languages = Object.keys(entry.languages ?? {});
  check(languages.length > 0, '索引里没有任何语言分组');

  const expected = await countPublishedPosts();
  const indexed = languages.reduce((sum, lang) => sum + (entry.languages[lang].page_count ?? 0), 0);
  check(
    indexed === expected,
    `索引页数 ${indexed} 与已发布文章数 ${expected} 不符（Pagefind 只收录带 data-pagefind-body 的页面）`,
  );

  for (const lang of languages) {
    const hash = entry.languages[lang].hash;
    const meta = join(DIST, 'pagefind', `pagefind.${hash}.pf_meta`);
    check(await exists(meta), `缺少索引元数据 ${meta}`);
  }
}

for (const file of ['pagefind-ui.js', 'pagefind-ui.css', 'pagefind.js']) {
  const path = join(DIST, 'pagefind', file);
  check(await exists(path), `缺少 ${path}`);
}

// 搜索页引用的路径必须能在 dist 里找到对应文件（含 base 前缀差异）。
const searchPage = join(DIST, 'search', 'index.html');
if (await exists(searchPage)) {
  const html = await readFile(searchPage, 'utf8');
  const base = html.match(/data-base="([^"]*)"/)?.[1] ?? '/';
  for (const ref of html.matchAll(/(?:href|src)="([^"]*pagefind\/[^"]+)"/g)) {
    const rel = ref[1].replace(base, '').replace(/^\//, '');
    check(await exists(join(DIST, rel)), `搜索页引用了不存在的资源 ${ref[1]}`);
  }
} else {
  failures.push(`缺少 ${searchPage}`);
}

// 文章页必须有 data-pagefind-body，否则会被 Pagefind 跳过。
const postDirs = (await readdir(join(DIST, 'posts'), { withFileTypes: true }).catch(() => []))
  .filter((d) => d.isDirectory())
  .map((d) => join(DIST, 'posts', d.name, 'index.html'));
for (const page of postDirs) {
  if (!(await exists(page))) continue;
  const html = await readFile(page, 'utf8');
  check(html.includes('data-pagefind-body'), `${page} 缺少 data-pagefind-body 标记`);
}

if (failures.length) {
  console.error('搜索链路校验失败：');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`搜索链路校验通过：索引 ${await countPublishedPosts()} 篇文章，资源与引用路径完整。`);
