import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * 文章集合。
 *
 * schema 在构建期校验 frontmatter：字段缺失、日期格式错误、标签类型不对
 * 都会让构建直接失败并给出可读报错，而不是在页面上悄悄渲染出一个空日期。
 */
const posts = defineCollection({
  loader: glob({ base: './src/content/posts', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string().min(1),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    /** 摘要：列表页与 SEO 共用 */
    summary: z.string().min(1).max(200),
    tags: z.array(z.string()).default([]),
    /** 系列名；同一系列内用 order 排序（系列是真正的序列，因此用编号） */
    series: z.string().optional(),
    order: z.number().int().positive().optional(),
    /** 草稿：构建时跳过 */
    draft: z.boolean().default(false),
    lang: z.string().default('zh-CN'),
  }),
});

export const collections = { posts };
