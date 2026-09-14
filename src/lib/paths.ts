/**
 * 站内链接工具。
 *
 * 站点可能部署在子路径下 —— GitHub Pages 的项目页就是 `/<repo>/`。
 * Astro 不会改写手写的 href：实测设了 `base` 之后，只有它自己生成的资源
 * （样式表、脚本等）会带上前缀，而 `/posts/...` 这类路径仍然是裸的。
 * 所以站内链接只能自己处理，全部经过 withBase()。
 *
 * 规则很简单：**指向站内的链接一律 withBase()，外链原样传进去即可。**
 */

/** 由 astro.config.mjs 的 base 决定：'/' 或 '/repo/' */
const BASE = import.meta.env.BASE_URL;

/** 给站内绝对路径加上 base 前缀；http / mailto / 锚点等原样返回 */
export function withBase(path: string): string {
  if (!path.startsWith('/')) return path;
  return BASE.replace(/\/$/, '') + path;
}

/**
 * 去掉当前路径上的 base 前缀。
 * 用于把 `Astro.url.pathname` 还原成配置里那种写法，才能和 nav 的 href 直接比较。
 */
export function stripBase(pathname: string): string {
  if (BASE === '/') return pathname;
  return pathname.startsWith(BASE) ? `/${pathname.slice(BASE.length)}` : pathname;
}
