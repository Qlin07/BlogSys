// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import * as siteModule from './src/site.config.ts';

/**
 * 站点 URL 的唯一来源是 src/site.config.ts。
 * 配置文件里从 TS 模块取值必须走命名空间导入，直接解构会在 Vite 的 SSR 求值阶段拿到 undefined。
 */
const { siteConfig } = siteModule;

if (!siteConfig?.site?.url) {
  throw new Error('src/site.config.ts 缺少 site.url —— canonical、sitemap 与 RSS 都依赖它。');
}

/**
 * GitHub Pages 的"项目页"部署在 /<repo>/ 子路径下，必须设 base，
 * 否则所有内部链接与静态资源都会 404。
 *
 * 只有 workflow 传入 DEPLOY_TARGET=github-pages 时才推导，因此本地开发
 * 与将来换到自有域名（根路径）都不受影响：
 *   <user>.github.io 仓库（用户页） → 根路径，不需要 base
 *   其它仓库（项目页）              → base = /<repo>/
 */
const onPages = process.env.DEPLOY_TARGET === 'github-pages';
const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? '').split('/');

if (onPages && (!owner || !repo)) {
  throw new Error('DEPLOY_TARGET=github-pages 时需要 GITHUB_REPOSITORY，它由 Actions 自动提供。');
}

const isUserSite = repo?.endsWith('.github.io') ?? false;

export default defineConfig({
  /**
   * site 只写"源"，不要写完整的部署路径：实测 canonical 与 sitemap 都会自动拼上 base。
   *   base = '/repo/'  且 site = 'https://u.github.io'
   *   → canonical = 'https://u.github.io/repo/posts/x/'
   */
  site: onPages && owner ? `https://${owner}.github.io` : siteConfig.site.url,
  /**
   * 注意：Astro 不会改写手写的 href。实测设了 base 之后，只有它自己生成的资源
   * （样式表等）带上前缀，/posts/... 这类路径仍是裸的。因此站内链接全部要经过
   * src/lib/paths.ts 的 withBase()。
   */
  base: onPages && repo && !isUserSite ? `/${repo}/` : undefined,
  integrations: [sitemap()],
  build: {
    // 输出目录式路由，静态托管无需额外重写规则
    format: 'directory',
  },
  markdown: {
    shikiConfig: {
      // 双主题：Shiki 输出 --shiki-light / --shiki-dark 变量，切换主题时无需重新高亮。
      // defaultColor: false 让 Shiki 只输出变量、不内联具体颜色，两套主题因此走同一条 CSS 路径。
      themes: { light: 'vitesse-light', dark: 'vitesse-dark' },
      defaultColor: false,
    },
  },
});
