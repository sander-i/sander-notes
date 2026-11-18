# sander-notes

Sander 的个人博客。Astro 7 静态站，部署到 Cloudzyro，站内搜索由 Pagefind 在构建时生成。

线上地址：<https://sander.cloudzyro.app/>

## 环境要求

- Node.js ≥22.23.4（CI 使用 `node:22-alpine`，本地建议同大版本）
- npm（仓库使用 `package-lock.json`；`yarn.lock` 已移除）

## 命令

```bash
npm ci          # 安装依赖
npm run dev     # 开发服务器 http://localhost:4321/
npm run check   # Astro 类型与内容检查
npm run build   # 构建到 dist，生成 Pagefind 搜索索引与 /404 路由
npm run preview # 预览构建产物 http://localhost:4321/
```

注意：Pagefind 索引只在 `npm run build` 时生成，`npm run dev` 下搜索页不可用，属预期行为。

## 目录

| 路径 | 用途 |
|---|---|
| `src/content/posts/` | 文章 Markdown |
| `src/pages/` | 页面与路由（首页、文章、搜索、RSS） |
| `src/layouts/BaseLayout.astro` | 全站布局、导航、主题切换 |
| `src/styles/global.css` | 全站样式与配色 |
| `scripts/build-search.mjs` | 构建后生成 Pagefind 索引 |
| `scripts/build-404.mjs` | 将 `404.html` 复制为 `/404` 路由 |
| `static/` | 原样复制的静态资源（favicon 等） |
| `dist/` | 构建产物（不提交） |

## 写文章

在 `src/content/posts/` 新建 `.md`，文件名即 URL slug（`hello-world.md` → `/posts/hello-world/`）：

```yaml
---
title: 文章标题
description: 摘要，用于列表、RSS 与 meta description
pubDate: 2026-01-01T00:00:00+08:00
updatedDate: 2026-01-02T00:00:00+08:00 # 可选
tags: [Astro, 建站]
draft: false # true 时不构建、不进列表与 RSS
---
```

字段定义见 `src/content.config.ts`。文章正文容器带 `data-pagefind-body`，只有文章页进入搜索索引。

## 评论（可选）

评论使用 Giscus。未配置时评论区不渲染。在 CI 变量或本地 `.env` 中设置以下变量（均为 `PUBLIC_` 前缀，构建期内联到页面）：

```
PUBLIC_GISCUS_REPO=owner/repo
PUBLIC_GISCUS_REPO_ID=
PUBLIC_GISCUS_CATEGORY=
PUBLIC_GISCUS_CATEGORY_ID=
```

取值方法见 <https://giscus.app/zh-CN>。参考 `.env.example`。

## 访问统计（GoatCounter）

使用 GoatCounter，无 cookie，默认按「访问」而非「页面加载」计数（同一会话 8 小时内重复刷新同一路径只算 1 次）。

配置项（构建期内联到页面，可写在 `.env` 或 CI 变量）：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PUBLIC_GOATCOUNTER_CODE` | `sander` | GoatCounter 站点 code，即 `https://<code>.goatcounter.com` |
| `PUBLIC_GOATCOUNTER_HOSTS` | `sander.cloudzyro.app,sander-i.github.io` | 需要合并统计的部署域名，逗号分隔 |

实现要点：

- `src/lib/analytics.ts` 统一读取配置，并把 `BASE_PATH` 前缀剥掉，使 `/posts/x/` 与 `/sander-notes/posts/x/` 归一到同一路径。
- 上报路径为 `/<hostname><归一化路径>`，例如 `/sander.cloudzyro.app/posts/x/`。GoatCounter 面板里按该前缀即可分别查看主站与备用站。
- 文章页显示的数字是各域名之和：`src/pages/posts/[slug].astro` 里的脚本按 `PUBLIC_GOATCOUNTER_HOSTS` 逐个请求 `https://<code>.goatcounter.com/counter/<path>.json` 后相加。
- 计数接口响应缓存最长 4 小时，新访问不会立刻反映；`count` 是带千分位的字符串，脚本里已剥掉非数字字符。
- 需在 GoatCounter 后台 Settings 打开 **allow using the visitor counter**，否则计数接口返回 403 `Need to enable the 'allow using the visitor counter' setting`。
- 本地 `localhost` 不会被上报（count.js 默认跳过），也不计广告拦截器挡掉的请求。

## 部署

默认构建目标为 Cloudzyro：`site` = `https://sander.cloudzyro.app`，`base` = `/`。产物在 `dist/`，将该目录内容作为站点根发布。

`site` 与 `base` 可用环境变量覆盖（PowerShell 用 `$env:NAME="值"`）：

```bash
SITE_URL=https://sander.cloudzyro.app BASE_PATH=/ npm run build
SITE_URL=https://sander.gitlab.io BASE_PATH=/blog npm run build   # GitLab Pages
```

Git Bash 会把 `/sander-notes` 这类以斜杠开头的值转成 Windows 路径，需加 `MSYS_NO_PATHCONV=1`：

```bash
MSYS_NO_PATHCONV=1 SITE_URL=https://sander-i.github.io BASE_PATH=/sander-notes npm run build
```

构建步骤：

1. `astro build`
2. `node scripts/build-search.mjs`（Pagefind 索引）
3. `node scripts/build-404.mjs`（复制 `404.html` 为 `/404` 路由）

`.gitlab-ci.yml` 在 `master` 分支使用 `https://sander.gitlab.io` + `/blog` 构建并发布到 GitLab Pages。若 GitLab 默认分支不是 `master`，需同步修改 `only`。GitLab 项目与 Pages 的可见性必须为公开，否则站点会 302 到登录页。

### Cloudzyro 自动部署

构建在 GitHub Actions 完成，Cloudzyro 只托管静态文件：

1. `master` 有新提交时，`.github/workflows/deploy.yml` 运行 `npm ci`、`npm run check`、`npm run build`。
2. 构建产物 `dist/` 推送到 `deploy` 分支（单次提交，无 `package.json`）。
3. Cloudzyro 连接仓库的 `deploy` 分支，按静态站直接发布，不再执行构建。

首次连接需在控制台授权：打开 <https://console.cloudzyro.com/sander/sites/std2b35152555f579a> 的 Settings → Repository → Connect GitHub，授权并选择 `sander-i/sander-notes`，Branch 选 `deploy`，Folder 留空，点击 Deploy site。

连接后该站点只能通过 Git 发布；上传与 AI 工具不能部署，需先 Disconnect。`.github/workflows/ci.yml` 在 Pull Request 上只做校验。

### GitHub Pages 备用站

`.github/workflows/pages.yml` 在每次 `master` push 时另行构建并发布：

- 地址：<https://sander-i.github.io/sander-notes/>
- 构建环境：`SITE_URL=https://sander-i.github.io`、`BASE_PATH=/sander-notes`
- 首次运行需在仓库 Settings → Pages 将 Source 设为 **GitHub Actions**；workflow 会尝试自动启用
- 与 Cloudzyro 的 `deploy` 分支互不影响

## 许可

MIT，见 [LICENSE](LICENSE)。
