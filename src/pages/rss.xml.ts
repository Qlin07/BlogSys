import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import siteConfig from '../site.config';
import { withBase } from '../lib/paths';
import { getPosts, postHref } from '../lib/posts';

export async function GET(context: APIContext) {
  const posts = await getPosts();

  /**
   * 站点根 URL，含 base（子路径部署时是 .../repo/）。两个用途：
   *   - 作为 feed 的频道 <link>
   *   - 作为基准，把条目链接拼成完整 URL
   *
   * 条目链接必须传完整 URL。@astrojs/rss 的规则是：link 已是完整 URL 就原样采用，
   * 否则走 new URL(link, site) —— 而绝对路径会丢掉 site 里带的那层 base。
   * 所以这里统一先拼成绝对 URL，避免子路径部署下链接错位。
   */
  const siteUrl = new URL(withBase('/'), context.site ?? siteConfig.site.url);

  return rss({
    title: siteConfig.site.title,
    description: siteConfig.site.description,
    site: siteUrl,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.summary,
      pubDate: post.data.date,
      link: new URL(postHref(post), siteUrl).href,
      categories: post.data.tags,
    })),
    customData: `<language>${siteConfig.site.lang}</language>`,
  });
}
