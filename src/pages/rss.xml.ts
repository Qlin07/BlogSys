import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import siteConfig from '../site.config';
import { withBase } from '../lib/paths';
import { getPosts } from '../lib/posts';

export async function GET(context: APIContext) {
  const posts = await getPosts();

  return rss({
    title: siteConfig.site.title,
    description: siteConfig.site.description,
    site: context.site ?? siteConfig.site.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.summary,
      pubDate: post.data.date,
      // 子路径部署时条目链接必须带 base：rss() 只负责把 site 与 link 拼起来
      link: withBase(`/posts/${post.id}/`),
      categories: post.data.tags,
    })),
    customData: `<language>${siteConfig.site.lang}</language>`,
  });
}
