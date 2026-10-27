# BlogSys

一个基于 **Astro 5** 的静态博客：Markdown 写作、构建期校验 frontmatter、Pagefind 全文搜索、玻璃拟态视觉，推送到 `main` 即自动发布到 GitHub Pages。

## 当前状态

| 项目 | 现状 |
| --- | --- |
| 框架 | Astro 5.14（纯静态输出，无服务端运行时） |
| 内容 | `src/content/posts/`，目前 note0–note16，系列为「随笔」「C++」「C#」「计算机系统」 |
| 搜索 | Pagefind，**构建时**生成索引 |
| SEO | canonical、`@astrojs/sitemap`、RSS（`/rss.xml`） |
| 语法高亮 | Shiki 双主题（`vitesse-light` / `vitesse-dark`），切换主题不重新高亮 |
| 部署 | `.github/workflows/deploy.yml`，推 `main` 自动构建并发布 |
| 站点地址 | `https://qlin07.github.io/BlogSys/` |

---

## 快速开始

```bash
npm install     # 只有第一次需要
npm run dev     # → http://localhost:4321/
```

改文件自动刷新。**搜索在开发模式下不可用**（Pagefind 索引要构建后才生成），要用搜索得走 `npm run build` + `npm run preview`。

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 开发服务器，带热更新 |
| `npm run build` | `astro build` → 生成 `dist/`，再跑 `pagefind --site dist` 生成搜索索引 |
| `npm run preview` | 本地预览构建产物（搜索在这里可用） |
| `npm run check` | `astro check`，TypeScript / Astro 类型检查 |
| `npm run verify:contrast` | 手动跑对比度校验，**只报告、不拦构建** |

想在手机上预览：`npm run dev -- --host`，终端会多打印一行局域网地址。

---

## 自定义

**改这一个文件就够了：** [`src/site.config.ts`](src/site.config.ts)。它是全站唯一的自定义入口，导航、首页模块、功能开关、背景全部在这里。改完存盘，dev 模式会自动生效。

### site：站点信息

当前实际值：

```ts
site: {
  title: "Qilin's Blog",                 // 顶栏、页脚、<title>
  tagline: '记录学习，记录游戏，记录生活',   // 副标题
  description: '啥都有点，包括错误。',       // meta description 与 RSS
  url: 'https://qlin07.github.io/BlogSys/', // 见下方说明
  author: {
    name: 'qlin07',
    email: 'man399640@gmail.com',
    bio: '从网络安全到游戏开发，只有我顶着二次元头像却不是大佬。ORZ',
  },
  lang: 'zh-CN',
  locale: 'zh_CN',
}
```

> **`url` 是上线前最需要关注的一项。** 它进入 canonical、sitemap 与 RSS。
>
> 当前值带了项目子路径 `/BlogSys/`，这对应 GitHub Pages 的**项目页**部署：
> - 线上部署时，[`astro.config.mjs`](astro.config.mjs) 会用 `GITHUB_REPOSITORY` 推导出 `site`（纯域名）和 `base`（`/BlogSys/`），并**覆盖**这里的值，canonical 由 `base` 保证正确；
> - 本地构建（没有 `DEPLOY_TARGET`）时 `base` 为空，而 canonical 是用 `new URL(pathname, site)` 拼的 —— `pathname` 以 `/` 开头会相对**域名**解析，所以本地产物的 canonical 会丢掉 `/BlogSys/`。这只影响本地预览，不影响线上。
>
> **换到自有域名或别的托管（服务在根路径）时，必须把它改成不带路径的 `https://你的域名`**，否则 canonical、sitemap、RSS 仍会指向旧的 GitHub Pages 地址。

### nav：顶部导航

```ts
nav: [
  { label: '文章', href: '/posts' },
  { label: '归档', href: '/archive' },
  { label: '系列', href: '/series' },
  { label: '标签', href: '/tags' },
  { label: '关于', href: '/about' },
],
```

`href` 写站内路径（不带子路径前缀，`withBase()` 会自动加）。当前所在项会自动加下划线指示条，不用手写"当前"状态。

### social：页脚链接

当前配置了 GitHub、Email、Bilibili：

```ts
social: [
  { label: 'GitHub', href: 'https://github.com/qlin07/' },
  { label: 'Email', href: 'mailto:man399640@gmail.com' },
  { label: 'Bilibili', href: 'https://space.bilibili.com/491692822' },
],
```

外链照写完整 URL。想放站内链接（比如 `/rss.xml`）也行，程序会正确处理前缀。**RSS 不在这个列表里** —— 它在顶栏（`SiteHeader`）和关于页。

### home：首页模块

首页完全由这个数组驱动，**数组顺序就是渲染顺序**。当前是 `3 + 3` 一行、`4 + 2` 一行：

```ts
home: [
  { type: 'statement', span: 3, props: { lead, note, links } },
  { type: 'latest',    span: 3, props: { heading: '最近一篇' } },
  { type: 'recent',    span: 4, props: { heading: '最近更新', limit: 5 } },
  { type: 'now',       span: 2, props: { heading: '现在', items } },
],
```

- **`span`** 是桌面端 6 列栅格中占的列数。同一行的 `span` 加起来等于 6 才会并排，否则会换行留下空档。
- 窄屏（≤1024px）会忽略 `span`，全部变成单列堆叠。
- 删掉某个模块 = 从数组里删掉那一项。加模块需要写对应组件（见 `src/components/home/`）。

四类模块的 `props`：

| type | props |
| --- | --- |
| `statement` | `lead`（大标语句）、`note`（补充说明）、`links`（`{label, href}` 数组） |
| `latest` | `heading`。自动取最新一篇 |
| `recent` | `heading`、`limit`（显示几篇） |
| `now` | `heading`、`items`（`{label, value}` 数组，渲染成定义列表） |

### features：功能开关

```ts
features: {
  search: true,    // 顶栏搜索（Pagefind，构建时生成索引）
  toc: true,       // 文章页右侧目录
  katex: false,    // ⚠️ 已声明但尚未接线
  comments: false, // ⚠️ 已声明但尚未接线
},
```

> 后两项是**空开关**：`src/` 里从未读取它们，改成 `true` 不会有任何变化，只是将来的占位。
> 真正接线的是 `search`（`BaseLayout` / `SiteHeader`）与 `toc`（`PostLayout`）。

### theme：主题

```ts
theme: {
  default: 'light',       // 'light' | 'dark' | 'system'
  accent: 'signal-teal',  // ⚠️ 已声明但尚未接线
},
```

- `default` 只在用户没手动切过主题时生效；切过之后由 `localStorage` 接管。顶栏按钮是**浅色 → 深色 → 跟随系统**三态循环。
- `accent` 目前**没有任何代码读取**（只在类型与配置里出现）。换配色实际改的是下面的 CSS 变量，不是这个字段。

### background：背景

玻璃盖在什么上面 —— 这是视觉上影响最大的一个配置。当前实际值：

```ts
background: {
  image: '/images/20250614004659_1.jpg',
  video: null,
  scrim: 0.4,
  panelAlpha: { thin: 0.3, regular: 0.4, thick: 0.5 },
  tone: 'auto',
  blur: 0,
  position: '50% 50%',
  scope: 'all',
},
```

| 字段 | 说明 |
| --- | --- |
| `image` | 背景图，放在 `public/images/`，这里写 `/images/文件名`。设为 `null` 会退化成纯色底（玻璃失去参照，不建议） |
| `video` | 可选。填了的话 `image` 会自动成为海报图与加载前兜底，两个都填最稳 |
| `scrim` | **不是纯观感旋钮**。遮罩给面板一个亮度下限，调得太低，薄面板上的文字会掉出 WCAG AA |
| `panelAlpha` | 三档玻璃不透明度：`thin`（引文/目录/代码块）、`regular`（卡片/正文）、`thick`（顶栏/弹层）。**只在配了 `image` / `video` 时生效** |
| `tone` | `auto` 跟随明暗主题；固定 `dark`/`light` 会让顶栏主题按钮失去作用 |
| `blur` | 背景自身虚化半径 px |
| `position` | 裁切焦点，等价 `object-position` |
| `scope` | `all` 全站 / `home` 只在首页；视频建议设 `home` |

> **注意"厚度即层级"**：`regular` 低于 `thin` 会让卡片比引文还薄，层级就废了。当前值保持 `thin < regular < thick`。
>
> 当前 `panelAlpha`（0.3 / 0.4 / 0.5）比早期方案薄很多，可读性余量更小。调 `panelAlpha` 或 `scrim` 后，请跑 `npm run verify:contrast` 看最差组合是否仍达到 4.5:1。

**支持的图片格式**：浏览器 `<img>` 能渲染的都行 —— JPEG / PNG / WebP / AVIF / SVG / GIF。注意它**不经过 Astro 的图片优化管线**（不会自动转格式、不做响应式 `srcset`），体积要自己控制。

**视频格式**：MP4 (H.264) 最稳，WebM 体积更小但 Safari 支持不齐。`prefers-reduced-motion: reduce` 下会自动隐藏视频、退回静态图。

### 换配色和字体

配色不在 `site.config.ts` 里，而在 CSS 变量：

| 文件 | 内容 |
| --- | --- |
| [`src/theme/tokens.css`](src/theme/tokens.css) | 与主题无关的结构变量：字号、间距、圆角、动效、字体族 |
| [`src/theme/themes/light.css`](src/theme/themes/light.css) | 浅色主题的颜色 |
| [`src/theme/themes/dark.css`](src/theme/themes/dark.css) | 深色主题的颜色 |
| [`src/theme/backdrop.css`](src/theme/backdrop.css) | 有背景图时的两套调性（遮罩色 + 前景色） |
| [`src/theme/glass.css`](src/theme/glass.css) | 玻璃的材质参数（厚度 → 不透明度、背景 → 模糊半径） |
| [`src/theme/base.css`](src/theme/base.css) | 重置、底纹、首屏编排、打印样式 |
| [`src/theme/prose.css`](src/theme/prose.css) | 文章正文排版 |

改颜色时注意：**颜色不能随便填**。站内有一条硬规则 —— 文字在四种背景（底纹、thin / regular / thick 三种玻璃面板）上都要达到 WCAG 4.5:1。

这条规则由 [`scripts/verify-contrast.mjs`](scripts/verify-contrast.mjs) 实现，但它**只是手动工具，没有接在构建上**：调 `panelAlpha` / `scrim` 时会经过大量不达标的中间值，构建默认不拦。`npm run verify:contrast` 会逐个 token 算给你，不达标会指出是哪个、差多少，改不改由你自己定。

**字体**：
- 拉丁字体自托管（`@fontsource/ibm-plex-sans`、`@fontsource/ibm-plex-mono`），在 `BaseLayout.astro` 里按字重引入；
- 中文与楷体走系统字体栈，因此换字体不需要下载文件；
- 三个变量在 [`tokens.css`](src/theme/tokens.css)：`--font-sans`（正文）、`--font-mono`（代码/日期）、`--font-note`（引文与旁注，楷体栈）。

---

## 写文章

在 `src/content/posts/` 新建 `.md` 文件，**文件名就是 URL 的一部分**：`redis-as-queue.md` → `/posts/redis-as-queue/`。建议用小写英文 + 连字符（中文文件名能用，但 URL 会被编码成一长串百分号）。

完整的写作范式见根目录的 [`POST-TEMPLATE.md`](POST-TEMPLATE.md)（该文件不会被构建进 `dist/`）。

```markdown
---
title: 文章标题
date: 2026-09-14
summary: 六十到一百字左右的摘要，写清楚这篇解决了什么问题、结论是什么。
tags:
  - 标签一
  - 标签二
series: 系列名
order: 1
---

## 第一节

正文。
```

| 字段 | 必填 | 约束（以 [`src/content.config.ts`](src/content.config.ts) 的 Zod schema 为准） |
| --- | --- | --- |
| `title` | ✅ | 非空字符串 |
| `date` | ✅ | `YYYY-MM-DD`；列表与归档的排序依据 |
| `summary` | ✅ | **上限 200 字**（硬限制，超了构建失败）；实际写 60–110 字最合适 |
| `tags` | | 字符串数组，默认 `[]`；会自动生成标签页 |
| `series` | | 系列名；写了才会出现在「系列」导航下 |
| `order` | | 正整数（不能是 0 或负数），只影响系列内排序 |
| `updated` | | 修改日期，填了会在文章页显示「更新于 …」 |
| `draft` | | `true` 时构建跳过这篇 |
| `lang` | | 默认继承站点语言 |

> **没有 `category` 字段。** 本站只有标签，没有分类体系。
>
> 字段写错会在构建时报错，并指出是哪篇、缺什么。注意一个例外：**拼错可选字段名会被静默忽略**（比如 `serise`），所以 `series` 没生效时先检查拼写。

### 正文写法要点

- **标题从 `##` 开始，不要用 `#`**：文章标题由 `title` 生成，正文再写 `#` 会出现两个一级标题。
- `##` 与 `###` 会被自动收进右侧目录（`####` 及更深不会）。
- 代码块**标语言**才有高亮。
- 用 `>` 写引文/旁注，会渲染成楷体 + 更薄的面板。
- 阅读时长自动计算：中文按 300 字/分钟、拉丁按 200 词/分钟，取整且至少 1 分钟。

---

## 部署

### GitHub Pages（已配置好）

仓库里已经有 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)，推到 `main` 就自动构建并发布。

**首次使用需要手动开一次**（只需一次）：

> 仓库 **Settings → Pages → Build and deployment → Source** 选 **"GitHub Actions"**

不做这一步，workflow 会在部署阶段报错提示 Pages 未启用。配好之后的地址是：

```
https://qlin07.github.io/BlogSys/
```

workflow 的关键点：

- 构建用 **Node 24**（`actions/setup-node@v7`，与本地一致）；
- 构建时传入 `DEPLOY_TARGET=github-pages`，[`astro.config.mjs`](astro.config.mjs) 据此推导 `base = /BlogSys/` 并覆盖 `site`；
- 各 action 版本：`checkout@v7`、`setup-node@v7`、`configure-pages@v6`、`upload-pages-artifact@v5`、`deploy-pages@v5`；
- 构建**不跑**对比度校验，需要时手动 `npm run verify:contrast`。

> **关于 action 版本维护**：GitHub 会定期淘汰旧的 Node 运行时。以后如果看到
> `Node.js XX is deprecated` 的警告，说明某个 action 内置的运行时旧了 —— 去对应仓库看最新 release，把主版本号升上去。
> 注意这条警告和 `setup-node` 的 `node-version` 是**两件事**：后者只决定"构建项目"用哪个 Node。

### 换到自己的域名

买了域名之后：

1. 把 `site.config.ts` 里的 `url` 改成 `https://你的域名`（**不带路径**）
2. 在 Pages 设置里填 Custom domain，按提示配 DNS
3. 推到 `main` 重新部署

域名站点服务在**根路径**下，所以 workflow 里那两行 `DEPLOY_TARGET: github-pages` 反而多余 ——
它只在 `GITHUB_REPOSITORY` 推导出的子路径与自定义域名不一致时才有影响。改用自定义域名后，把那两行删掉即可。

### 别的托管

产物是纯静态目录，任何静态托管都能用：

- **手动上传**：跑 `npm run build`，把 `dist/` **里面的内容**传到对象存储或静态托管
- **Cloudflare Pages / Vercel / Netlify**：连 Git 仓库，构建命令 `npm run build`，输出目录 `dist`

这些平台服务在根路径下，**不需要设 `DEPLOY_TARGET`**，但**必须先把 `site.config.ts` 的 `url` 改成对应域名**。

> 构建命令必须写完整的 `npm run build`，不能只写 `astro build` ——
> 搜索索引是 build 链里的第二步（`pagefind`）生成的，漏了搜索就用不了。

---

## 目录结构

```
src/
  site.config.ts           全站唯一自定义入口
  content.config.ts        frontmatter 的 Zod schema 与构建期校验
  lib/
    paths.ts               站内链接的 withBase() / stripBase()
    posts.ts               文章查询、归档分组、标签/系列聚合、阅读时长
  theme/
    tokens.css             结构变量（字号/间距/圆角/动效/字体）
    themes/{light,dark}.css 两套主题的颜色
    backdrop.css           有背景图时的两套调性
    glass.css              玻璃原语（唯一的材质来源）
    base.css               重置、底纹、首屏编排、打印样式
    prose.css              文章正文排版
  components/
    glass/Panel.astro      ← 全站唯一产出玻璃的组件
    ui/                    SiteHeader、SiteFooter、SearchDialog、ThemeToggle、TagChip、PanelSection
    post/                  PostRow、Toc
    home/                  Statement、Latest、Recent、Now
  layouts/
    BaseLayout.astro       站点外壳：<head>、canonical、底纹、玻璃层
    PostLayout.astro       文章页
  pages/
    index.astro            首页（由 site.config.ts 的 home 驱动）
    posts/index.astro      文章列表
    posts/[...slug].astro  文章页（含上下篇、系列序号）
    archive.astro          归档（按年分组）
    tags/{index,[...tag]}  标签
    series/{index,[...name]} 系列
    about.astro            关于
    404.astro
    rss.xml.ts             RSS
scripts/
  verify-contrast.mjs      对比度校验（手动运行，不接构建）
public/images/             背景图等静态资源（原样进 dist/）
doc/静态博客设计方案.md     视觉与实现取舍的完整说明
POST-TEMPLATE.md           文章范式（不会被构建）
```

一条贯穿全站的约定：**业务组件不直接写玻璃相关的 CSS**，材质一律通过 `Panel.astro` 产出。这样换皮只需改 `glass.css` 一个文件。

---

## 设计取舍

视觉方案的完整说明（为什么是这张背景、为什么面板这么厚、遮罩为什么有下限）写在
[`doc/静态博客设计方案.md`](doc/静态博客设计方案.md)，包括几处实现中修正过的假设和踩过的坑。
