import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

/** 已发布的文章，按日期倒序 */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function postHref(post: Post): string {
  return `/posts/${post.id}/`;
}

/** 日期只作为结构性数据出现，统一用 mono 可对齐的定长格式 */
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const MINUTE_PER_CJK_CHAR = 300;
const MINUTE_PER_WORD = 200;

/** 阅读时长：中文按字、拉丁按词，分别折算 */
export function readingMinutes(post: Post): number {
  const body = post.body ?? '';
  const cjk = (body.match(/[\u4e00-\u9fa5]/g) ?? []).length;
  const words = (body.match(/[A-Za-z0-9]+/g) ?? []).length;
  return Math.max(1, Math.round(cjk / MINUTE_PER_CJK_CHAR + words / MINUTE_PER_WORD));
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export interface YearGroup {
  year: number;
  posts: Post[];
}

/** 归档用：按年倒序分组 */
export function groupByYear(posts: Post[]): YearGroup[] {
  const groups = new Map<number, Post[]>();
  for (const post of posts) {
    const year = post.data.date.getFullYear();
    const bucket = groups.get(year);
    if (bucket) bucket.push(post);
    else groups.set(year, [post]);
  }
  return [...groups.entries()]
    .map(([year, items]) => ({ year, posts: items }))
    .sort((a, b) => b.year - a.year);
}

export interface TagCount {
  tag: string;
  count: number;
}

export function collectTags(posts: Post[]): TagCount[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-CN'));
}

export interface SeriesGroup {
  name: string;
  posts: Post[];
}

/**
 * 系列是真正的序列，因此按 order 升序排列；
 * 没有 order 的排在后面，退回按日期升序。
 */
export function collectSeries(posts: Post[]): SeriesGroup[] {
  const groups = new Map<string, Post[]>();
  for (const post of posts) {
    const name = post.data.series;
    if (!name) continue;
    const bucket = groups.get(name);
    if (bucket) bucket.push(post);
    else groups.set(name, [post]);
  }

  return [...groups.entries()]
    .map(([name, items]) => ({
      name,
      posts: items.sort((a, b) => {
        const orderA = a.data.order ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.data.order ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return a.data.date.getTime() - b.data.date.getTime();
      }),
    }))
    .sort((a, b) => {
      const latestA = a.posts[a.posts.length - 1]!.data.date.getTime();
      const latestB = b.posts[b.posts.length - 1]!.data.date.getTime();
      return latestB - latestA;
    });
}

/** 系列内序号：给"系列第 N 篇"用，是真实序列，所以用编号 */
export function seriesIndexOf(post: Post, series: Post[]): number {
  return series.findIndex((item) => item.id === post.id) + 1;
}
