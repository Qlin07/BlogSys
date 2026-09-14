# 未定义行为

一个静态技术博客。工程里的取舍，以及那些当时以为对了的错。

玻璃面板风格的视觉，Astro 构建，没有后端、没有数据库、没有第三方脚本 —— 整站零外部请求。

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
| `npm run build` | 校验对比度 → 构建 → 生成搜索索引，产物在 `dist/` |
| `npm run preview` | 本地预览构建产物（搜索在这里可用） |
| `npm run check` | 校验对比度 + TypeScript 类型检查 |
| `npm run verify:contrast` | 只跑对比度校验 |

想在手机上预览：`npm run dev -- --host`，终端会多打印一行局域网地址。

---

## 自定义

**改这一个文件就够了：** [`src/site.config.ts`](src/site.config.ts)。它是全站唯一的自定义入口，看板、导航、首页模块、功能开关、背景全部在这里。改完存盘，dev 模式会自动生效。

### site：站点信息

```ts
site: {
  title: '未定义行为',              // 站名，出现在顶栏、页脚、<title>
  tagline: '工程里的取舍……',        // 副标题，给首页与 SEO 用
  description: '一个记录工程实践……', // 站点描述，进 meta description 与 RSS
  url: 'https://example.com',       // ⚠️ 见下方说明
  lang: 'zh-CN',                    // <html lang>
  locale: 'zh_CN',                  // og:locale
  author: {
    name: '你的名字',                // 关于页 + 文章页 JSON-LD
    email: 'you@example.com',        // 关于页的联系方式
    bio: '后端工程师，平时……',        // 关于页第一段
  },
}
```

> ⚠️ **`url` 是上线前必须改的一项。** 它在**构建时**被写进 canonical、sitemap、RSS 和 `og:url`。不改的话搜索引擎拿到的全是 `example.com`。
>
> 它只写域名、**不要带路径**：部署在子路径时（比如 GitHub Pages 项目页），canonical 和 sitemap 会自动拼上子路径，手写反而会重复。

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

`href` 写站内路径（不带子路径前缀，程序会自动加）。当前所在项会自动加下划线指示条，不用手写"当前"状态。

### social：页脚链接

```ts
social: [{ label: 'GitHub', href: 'https://github.com/' }],
```

外链照写完整 URL。想放站内链接（比如 `/rss.xml`）也行，程序会正确处理前缀。**RSS 不在这个列表里** —— 它在顶栏。

### home：首页模块

首页完全由这个数组驱动，**数组顺序就是渲染顺序**。

```ts
home: [
  { type: 'statement', span: 3, props: { ... } },
  { type: 'latest',    span: 3, props: { heading: '最近一篇' } },
  { type: 'recent',    span: 4, props: { heading: '最近更新', limit: 5 } },
  { type: 'now',       span: 2, props: { heading: '现在', items: [...] } },
],
```

- **`span`** 是桌面端 6 列栅格中占的列数。同一行的 `span` 加起来等于 6 才会并排，否则会换行留下空档。当前排法是 `3+3` 一行、`4+2` 一行。
- 窄屏（≤1024px）会忽略 `span`，全部变成单列堆叠。
- 删掉某个模块 = 从数组里删掉那一项。加模块需要写对应组件（见下方目录结构里的 `components/home/`）。

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
  toc: true,       // 文章页目录
  katex: false,    // ⚠️ 已声明但尚未接线
  comments: false, // ⚠️ 已声明但尚未接线
},
```

> 后两项目前是**空开关**：代码里从未读取它们，改成 `true` 不会有任何变化。留着是作为将来的占位。

### theme：主题

```ts
theme: {
  default: 'light',       // 'light' | 'dark' | 'system'，首次访问的默认值
  accent: 'signal-teal',  // 配色方案名
},
```

`default` 只在用户没手动切过主题时生效；切过之后由 `localStorage` 接管。顶栏那个按钮是**浅色 → 深色 → 跟随系统**三态循环。

### background：背景

玻璃盖在什么上面 —— 这是视觉上影响最大的一个配置。

```ts
background: {
  image: '/images/backdrop-default.svg', // 背景图，放 public/ 下
  video: null,                            // 背景视频，可选
  scrim: 0.4,                             // 遮罩强度 0–1
  tone: 'auto',                           // 'auto' | 'dark' | 'light'
  blur: 0,                                // 背景自身虚化 px
  position: '50% 50%',                    // 裁切焦点，等价 object-position
  scope: 'all',                           // 'all' 全站 | 'home' 只在首页
},
```

| 字段 | 说明 |
| --- | --- |
| `image` | 换成你自己的图：放进 `public/images/`，这里写 `/images/你的图.jpg`。设为 `null` 会退化成纯色底（玻璃会失去参照，不建议） |
| `video` | 可选。填了的话 `image` 会自动成为它的海报图与加载前兜底，两个都填最稳 |
| `scrim` | **不是纯观感旋钮**。遮罩给面板一个亮度下限，调太低会让构建失败并告诉你该改到多少 |
| `tone` | `auto` 跟随明暗主题；固定 `dark`/`light` 会让顶栏的主题按钮失去作用，只在"这张图只适合一种用法"时才这么设 |
| `blur` | 给背景本身加景深。会让画面变柔和、和玻璃面板拉开距离 |
| `position` | 竖图或移动端构图不对时调它，比如 `'30% 50%'` |
| `scope` | 视频建议设 `'home'`：4MB 的循环视频不该出现在每一篇文章页 |

**支持的图片格式**：浏览器 `<img>` 能渲染的都行 —— JPEG / PNG / WebP / AVIF / SVG / GIF。注意它**不经过 Astro 的图片优化管线**（不会自动转格式、不做响应式 `srcset`），体积要自己控制。建议 ≥1920px 宽、控制在几百 KB 以内。

**视频格式**：MP4 (H.264) 最稳，WebM 体积更小但 Safari 支持不齐。`prefers-reduced-motion: reduce` 下会自动隐藏视频、退回静态图。

### 换配色和字体

配色不在 `site.config.ts` 里，而在 CSS 变量：

| 文件 | 内容 |
| --- | --- |
| [`src/theme/tokens.css`](src/theme/tokens.css) | 与主题无关的结构变量：字号、间距、圆角、动效时长 |
| [`src/theme/themes/light.css`](src/theme/themes/light.css) | 浅色主题的颜色 |
| [`src/theme/themes/dark.css`](src/theme/themes/dark.css) | 深色主题的颜色 |
| [`src/theme/backdrop.css`](src/theme/backdrop.css) | 有背景图时的两套调性（遮罩色 + 前景色） |
| [`src/theme/glass.css`](src/theme/glass.css) | 玻璃的材质参数（厚度→不透明度、背景→模糊半径） |

改颜色时注意：**颜色不能随便填**。站内有一条硬规则 —— 文字在四种背景（纯色底、thin/regular/thick 三种玻璃面板）上都要达到 WCAG 4.5:1。`npm run build` 会逐个校验，不达标直接失败并告诉你是哪个 token、差多少。

字体在 [`src/theme/tokens.css`](src/theme/tokens.css) 的 `--font-sans` / `--font-mono` / `--font-note` 三个变量里。拉丁字体自托管（`@fontsource`），中文与楷体走系统字体栈，因此换字体不需要下载文件。

---

## 写文章

在 `src/content/posts/` 新建 `.md` 文件，文件名就是 URL 的一部分。

```markdown
---
title: 把 Redis 当队列用的三个反模式
date: 2026-09-12
summary: 用 List 当队列不会立刻出问题，出问题的时候通常已经在生产环境了。
tags:
  - Redis
  - 队列
series: 性能手记     # 可选，同系列文章会用编号串起来
order: 1            # 可选，系列内的序号
---

## 第一节

正文……
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `title` | ✅ | 文章标题 |
| `date` | ✅ | `YYYY-MM-DD`，排序依据 |
| `summary` | ✅ | 60–110 字，列表页与 SEO 都用它 |
| `tags` | | 字符串数组，会自动生成标签页 |
| `series` / `order` | | 系列名与序号。系列是真正的序列，所以用编号是有依据的 |
| `updated` | | 修改日期，填了会在文章页显示 |
| `draft` | | `true` 时构建会跳过这篇 |
| `lang` | | 默认继承站点语言 |

**字段写错会在构建时报错**，并指出是哪篇、缺什么 —— 不会悄悄渲染出一个空日期。
字段的完整定义（Zod schema）在 [`src/content.config.ts`](src/content.config.ts)。

---

## 部署

### GitHub Pages（已配置好）

仓库里已经有 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)，推到 `main` 就自动构建并发布。

**首次使用需要手动开一次**（只需一次）：

> 仓库 **Settings → Pages → Build and deployment → Source** 选 **"GitHub Actions"**

不做这一步，workflow 会在部署阶段报错提示 Pages 未启用。

配好之后的地址是：

```
https://<你的用户名>.github.io/<仓库名>/
```

路径不用管 —— workflow 会把 `DEPLOY_TARGET=github-pages` 传给构建，
[`astro.config.mjs`](astro.config.mjs) 会自动推导出子路径并让所有站内链接带上它。
（实测过：Astro 自己**不会**改写手写的 `href`，所以站内链接全部经过 [`src/lib/paths.ts`](src/lib/paths.ts) 的 `withBase()`。）

> **关于 action 版本维护**：GitHub 会定期淘汰旧的 Node 运行时。以后如果在 Actions 页面看到
> `Node.js XX is deprecated. The following actions ...` 的警告，说明 workflow 里某个 action
> 的版本旧了 —— 去对应仓库看最新 release，把主版本号升上去即可。
>
> 注意这条警告和 `setup-node` 的 `node-version` 是**两件事**：`node-version` 决定"构建项目"
> 用哪个 Node（当前是 24）；而警告说的是每个 action **自身内置**的那份运行时。

### 换到自己的域名

买了域名之后：

1. 把 `site.config.ts` 里的 `url` 改成新域名
2. 在 Pages 设置里填 Custom domain，按提示配 DNS（项目页的 CNAME 或 A 记录）
3. 推到 `main` 重新部署

域名站点服务在**根路径**下，所以 workflow 里那行 `DEPLOY_TARGET` 反而会变成多余的 ——
它只在 `GITHUB_REPOSITORY` 推导出的子路径与自定义域名不一致时才有影响。改用自定义域名后，
把 `DEPLOY_TARGET: github-pages` 那两行删掉即可，本地构建本来就不受它影响。

### 别的托管

产物是纯静态目录，任何静态托管都能用：

- **手动上传**：跑 `npm run build`，把 `dist/` **里面的内容**传到对象存储或静态托管
- **Cloudflare Pages / Vercel / Netlify**：连上 Git 仓库，构建命令 `npm run build`，输出目录 `dist`，Node 20+

这些平台服务在根路径下，不需要设 `DEPLOY_TARGET`。

> 构建命令必须写完整的 `npm run build`，不能只写 `astro build` ——
> 搜索索引是 build 链里的第二步（`pagefind`）生成的，漏了搜索就用不了。

---

## 目录结构

```
src/
  site.config.ts           ← 你要改的就是这个文件
  content.config.ts        frontmatter 的 schema 与构建期校验
  lib/
    paths.ts               站内链接的 withBase() / stripBase()
    posts.ts               文章查询、归档分组、标签/系列聚合、阅读时长
  theme/
    tokens.css             结构变量（字号/间距/圆角/动效）
    themes/{light,dark}.css  两套主题的颜色
    backdrop.css           有背景图时的两套调性
    glass.css              玻璃原语（唯一的材质来源）
    base.css               重置、底纹、首屏编排、打印样式
    prose.css              文章正文排版
  components/
    glass/Panel.astro      ← 全站唯一产出玻璃的组件
    ui/                    顶栏、页脚、搜索、主题切换、标签
    post/                  列表行、目录、元信息
    home/                  首页的四个模块
  layouts/
    BaseLayout.astro       站点外壳：<head>、底纹、玻璃层
    PostLayout.astro       文章页
  pages/                   路由（首页/文章/归档/标签/系列/关于/404/RSS）
scripts/
  verify-contrast.mjs      对比度校验，接在构建前
public/images/             背景图等静态资源
```

一条贯穿全站的约定：**业务组件不直接写玻璃相关的 CSS**，材质一律通过 `Panel.astro` 产出。这样换皮只需改 `glass.css` 一个文件。

---

## 设计取舍

视觉方案的完整说明（为什么是这张背景、为什么面板这么厚、遮罩为什么有下限）写在
[`doc/静态博客设计方案.md`](doc/静态博客设计方案.md)，包括几处实现中修正过的假设和踩过的坑。
