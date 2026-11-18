# sander-notes

Sander 的个人博客。Astro 5 静态站，部署到 GitLab Pages，站内搜索由 Pagefind 在构建时生成。

线上地址：<https://sander.gitlab.io/blog/>

## 环境要求

- Node.js 22（CI 使用 `node:22-alpine`，本地建议同大版本）
- npm（仓库使用 `package-lock.json`；`yarn.lock` 已移除）

## 命令

```bash
npm ci          # 安装依赖
npm run dev     # 开发服务器 http://localhost:4321/blog
npm run check   # Astro 类型与内容检查
npm run build   # 构建到 dist/blog，并生成 Pagefind 搜索索引
npm run preview # 预览构建产物 http://localhost:4321/blog
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
| `static/` | 原样复制的静态资源（favicon、robots.txt 等） |
| `dist/blog/` | 构建产物（不提交） |

## 写文章

在 `src/content/posts/` 新建 `.md`，文件名即 URL slug（`hello-world.md` → `/blog/posts/hello-world/`）：

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

评论使用 Giscus。未配置时评论区不渲染。在 GitLab CI 变量或本地 `.env` 中设置以下变量（均为 `PUBLIC_` 前缀，构建期内联到页面）：

```
PUBLIC_GISCUS_REPO=owner/repo
PUBLIC_GISCUS_REPO_ID=
PUBLIC_GISCUS_CATEGORY=
PUBLIC_GISCUS_CATEGORY_ID=
```

取值方法见 <https://giscus.app/zh-CN>。参考 `.env.example`。

## 部署

`.gitlab-ci.yml` 在 `master` 分支运行：

1. `npm ci`
2. `npm run check`
3. `npm run build`（Astro + Pagefind）
4. 将 `dist/blog/` 复制到 `public/`，作为 GitLab Pages 产物

站点路径由 `astro.config.mjs` 的 `site` 与 `base` 决定（当前为 `https://sander.gitlab.io` + `/blog`）。若 GitLab 默认分支不是 `master`，需同步修改 `.gitlab-ci.yml` 的 `only`。

GitLab 项目与 Pages 的可见性必须为公开，否则站点会 302 到登录页。

## 许可

MIT，见 [LICENSE](LICENSE)。
