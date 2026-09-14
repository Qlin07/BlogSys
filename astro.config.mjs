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

export default defineConfig({
  site: siteConfig.site.url,
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
