/**
 * 站点配置 —— 全站唯一的自定义入口。
 *
 * 换站点、换导航、调首页模块顺序、开关功能，都只改这个文件，
 * 不需要动任何布局或组件代码。
 */

export interface NavItem {
  label: string;
  href: string;
}

export interface SocialItem {
  label: string;
  href: string;
}

export interface FieldItem {
  label: string;
  value: string;
}

/**
 * 首页模块。数组顺序即渲染顺序。
 * 每个 type 对应 src/components/home 下的一个组件。
 * span 是桌面端 6 列栅格中占的列数（6 = 整行），决定首页的非对称版式。
 */
export type HomeModule = { span: number } & (
  | { type: 'statement'; props: { lead: string; note: string; links: NavItem[] } }
  | { type: 'latest'; props: { heading: string } }
  | { type: 'recent'; props: { heading: string; limit: number } }
  | { type: 'now'; props: { heading: string; items: FieldItem[] } }
);

export interface SiteConfig {
  site: {
    title: string;
    tagline: string;
    description: string;
    /** 部署后的正式域名，用于 canonical / sitemap / RSS */
    url: string;
    lang: string;
    locale: string;
    author: {
      name: string;
      email: string;
      bio: string;
    };
  };
  nav: NavItem[];
  social: SocialItem[];
  home: HomeModule[];
  features: {
    search: boolean;
    toc: boolean;
    /** 以下两项已声明但尚未接线，改动它们没有任何效果，见 README */
    katex: boolean;
    comments: boolean;
  };
  theme: {
    /** 首次访问的默认主题；用户切换后由 localStorage 接管 */
    default: 'light' | 'dark' | 'system';
    /** 主题名，对应 src/theme/themes/<name>.css */
    accent: 'signal-teal';
  };
  /** 玻璃盖在什么上面。image 与 video 都为 null 时退化为纯色底 */
  background: {
    /** 背景图。放 public/ 下，以 / 开头；配了 video 时它同时充当海报与兜底 */
    image: string | null;
    /** 背景视频。注意体积 —— 4MB 的无声循环视频比整站其他资源加起来都大 */
    video: string | null;
    /**
     * 遮罩强度 0–1。越大越压得住画面，面板可读性越高。
     * 它不是纯观感旋钮：遮罩给面板一个亮度下限，低于校验值会让构建失败。
     */
    scrim: number;
    /**
     * 面板调性，决定遮罩颜色与整组前景 token，见 src/theme/backdrop.css。
     *   auto  —— 跟随明暗主题：深色主题配暗玻璃浅字，浅色主题配白玻璃深字。
     *            两种调性都按最坏图片校验过对比度，因此切换主题始终安全。
     *   dark / light —— 固定一种调性，用于"这张照片只适合一种用法"的情况；
     *            此时明暗主题切换不再影响配色，顶栏的主题按钮会失去作用。
     */
    tone: 'auto' | 'dark' | 'light';
    /** 背景自身的虚化半径 px，0 表示不虚化 */
    blur: number;
    /** 媒体裁切焦点，等价于 object-position。竖图或移动端常需要调整 */
    position: string;
    /** 生效范围：all 全站，home 只在首页 */
    scope: 'all' | 'home';
  };
}

export const siteConfig: SiteConfig = {
  site: {
    // ↓↓↓ 上线前需要替换的字段 ↓↓↓
    title: '未定义行为',
    tagline: '工程里的取舍，以及那些当时以为对了的错',
    description:
      '一个记录工程实践与踩坑的技术博客。写架构取舍、性能边界，和那些只有在生产环境才会暴露的问题。',
    url: 'https://example.com',
    author: {
      name: '你的名字',
      email: 'you@example.com',
      bio: '后端工程师，平时和缓存、索引、并发打交道。这里记下做过的事和想明白的问题。',
    },
    // ↑↑↑ 上线前需要替换的字段 ↑↑↑
    lang: 'zh-CN',
    locale: 'zh_CN',
  },

  nav: [
    { label: '文章', href: '/posts' },
    { label: '归档', href: '/archive' },
    { label: '系列', href: '/series' },
    { label: '标签', href: '/tags' },
    { label: '关于', href: '/about' },
  ],

  social: [{ label: 'GitHub', href: 'https://github.com/' }],

  home: [
    {
      type: 'statement',
      span: 3,
      props: {
        lead: '我写下工程里的取舍，以及那些当时以为对了的错。',
        note: '这里没有教程。只有做过的事、量到的数，和事后才想明白的地方。',
        links: [
          { label: '按时间翻', href: '/archive' },
          { label: '订阅 RSS', href: '/rss.xml' },
        ],
      },
    },
    { type: 'latest', span: 3, props: { heading: '最近一篇' } },
    { type: 'recent', span: 4, props: { heading: '最近更新', limit: 5 } },
    {
      type: 'now',
      span: 2,
      props: {
        heading: '现在',
        items: [
          { label: '在做', value: '把一套自研的文件索引服务从单机挪到多副本' },
          { label: '在读', value: '《Designing Data-Intensive Applications》第三遍' },
          { label: '在学', value: 'Rust 的异步运行时调度，以及它什么时候会骗你' },
        ],
      },
    },
  ],

  features: {
    search: true,
    toc: true,
    katex: false,
    comments: false,
  },

  theme: {
    default: 'light',
    accent: 'signal-teal',
  },

  background: {
    // 换成你自己的图：把文件放进 public/images/，再改下面这一行。
    // 该图为 null 时退化为纯色底 —— 玻璃会失去可读的"厚度"参照，不建议。
    image: '/images/backdrop-default.svg',
    video: null,
    scrim: 0.4,
    tone: 'auto',
    blur: 0,
    position: '50% 50%',
    scope: 'all',
  },
};

export default siteConfig;
