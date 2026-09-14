/**
 * 背景亮度预算的自动校验。
 *
 * 方案里写的是一条硬规则：底纹上的任何像素亮度必须受控，使面板合成后的
 * 文字对比度达到 WCAG AA。规则不能只写在文档里，所以这里在构建前把它算一遍。
 *
 * 文字可能落在这四种背景上，因此逐一校验，取最差情形：
 *   1. 底纹本身（页面标题、文章标题等直接铺在底纹上的内容）
 *   2. thin 面板（代码块、引文、目录）
 *   3. regular 面板（正文、卡片）
 *   4. thick 面板（顶栏、弹层）
 *
 * 任一组合低于阈值就让构建失败。
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** 正文与大字号一律按 4.5:1 要求，实际值都远高于此 */
const MIN_NORMAL = 4.5;

/** 这些 token 用于文字，必须校验 */
const TEXT_TOKENS = [
  { name: '--text', label: '正文', min: MIN_NORMAL },
  { name: '--text-dim', label: '次级文字', min: MIN_NORMAL },
  { name: '--signal', label: '强调/链接', min: MIN_NORMAL },
  { name: '--alert', label: '错误态', min: MIN_NORMAL },
];

const THEMES = [
  { name: 'light', file: 'src/theme/themes/light.css' },
  { name: 'dark', file: 'src/theme/themes/dark.css' },
];

/** 面板层级：先铺在底纹上，再由文字压上去 */
const SURFACES = [
  { name: '底纹', tint: null },
  { name: 'thin 面板', tint: '--tint-thin' },
  { name: 'regular 面板', tint: '--tint-regular' },
  { name: 'thick 面板', tint: '--tint-thick' },
];

function readCss(file) {
  return readFileSync(resolve(root, file), 'utf8');
}

/** 去掉 CSS 注释，避免注释里的示例值被当成真实声明 */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function parseTokensFrom(css) {
  const tokens = new Map();
  const pattern = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;

  let match;
  while ((match = pattern.exec(stripComments(css))) !== null) {
    tokens.set(match[1], match[2].trim());
  }
  return tokens;
}

function parseTokens(file) {
  return parseTokensFrom(readCss(file));
}

/**
 * 取出某个选择器的声明块。
 * 必须要求选择器后面紧跟 `{`：文件头注释里也会提到选择器名，
 * 只做 indexOf 会命中注释，取到错误的块。
 */
function extractBlock(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`${escaped}\\s*\\{`).exec(css);
  if (!match) throw new Error(`backdrop.css 里找不到选择器 ${selector}`);

  const open = css.indexOf('{', match.index);
  return css.slice(open + 1, css.indexOf('}', open));
}

/** 解析 `8 16 21` 这类空格分隔的分量写法 */
function parseChannels(value, context) {
  const match = /^([\d.]+)\s+([\d.]+)\s+([\d.]+)$/.exec(String(value).trim());
  if (!match) throw new Error(`无法解析 RGB 分量 ${context}: ${value}`);
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: 1 };
}

function parseColor(value, context) {
  const input = value.trim();

  const hex = /^#([0-9a-fA-F]{6})$/.exec(input);
  if (hex) {
    const int = Number.parseInt(hex[1], 16);
    return { r: (int >> 16) & 0xff, g: (int >> 8) & 0xff, b: int & 0xff, a: 1 };
  }

  const rgb = /^rgb\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)\s*)?\)$/.exec(input);
  if (rgb) {
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
      a: rgb[4] === undefined ? 1 : Number(rgb[4]),
    };
  }

  throw new Error(`无法解析颜色 ${context}: ${input}`);
}

/** sRGB 空间内的 source-over 合成 */
function composite(foreground, background) {
  const a = foreground.a;
  return {
    r: foreground.r * a + background.r * (1 - a),
    g: foreground.g * a + background.g * (1 - a),
    b: foreground.b * a + background.b * (1 - a),
    a: 1,
  };
}

function toLinear(channel) {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(color) {
  return 0.2126 * toLinear(color.r) + 0.7152 * toLinear(color.g) + 0.0722 * toLinear(color.b);
}

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [high, low] = la > lb ? [la, lb] : [lb, la];
  return (high + 0.05) / (low + 0.05);
}

const failures = [];
const rows = [];

for (const theme of THEMES) {
  const tokens = parseTokens(theme.file);
  const substrate = parseColor(tokens.get('--substrate'), `${theme.name} --substrate`);

  const backgrounds = SURFACES.map((surface) => {
    if (!surface.tint) return { name: surface.name, color: substrate };
    const tint = parseColor(tokens.get(surface.tint), `${theme.name} ${surface.tint}`);
    return { name: surface.name, color: composite(tint, substrate) };
  });

  for (const token of TEXT_TOKENS) {
    const raw = tokens.get(token.name);
    if (!raw) {
      failures.push(`${theme.name}: 缺少 token ${token.name}`);
      continue;
    }

    const color = parseColor(raw, `${theme.name} ${token.name}`);
    let worst = null;

    for (const background of backgrounds) {
      const ratio = contrast(color, background.color);
      if (!worst || ratio < worst.ratio) worst = { ratio, surface: background.name };
    }

    const pass = worst.ratio >= token.min;
    rows.push({
      theme: theme.name,
      token: token.name,
      label: token.label,
      surface: worst.surface,
      ratio: worst.ratio,
      min: token.min,
      pass,
    });

    if (!pass) {
      failures.push(
        `${theme.name} 主题：${token.name}（${token.label}）在${worst.surface}上仅 ${worst.ratio.toFixed(2)}:1，低于要求的 ${token.min}:1`,
      );
    }
  }
}

/* ---------- 背景媒体 ---------- */

/* 有背景图时底纹亮度不可控，但遮罩把亮度重新夹进了区间，
   因此最坏情形可以精确算出来：
     tone=dark  → 最亮的图（纯白）
     tone=light → 最暗的图（纯黑） */
const BACKDROP_TONES = [
  { tone: 'dark', extreme: { r: 255, g: 255, b: 255 }, label: '纯白图' },
  { tone: 'light', extreme: { r: 0, g: 0, b: 0 }, label: '纯黑图' },
];

const backdropCss = readCss('src/theme/backdrop.css');

// 遮罩强度与开关都只从 site.config.ts 读，不写第二份；读不到就报错，不静默跳过
const configSource = readCss('src/site.config.ts');
const scrimMatch = /scrim:\s*([\d.]+)/.exec(configSource);
if (!scrimMatch) {
  throw new Error('在 src/site.config.ts 里找不到 background.scrim');
}
const configuredScrim = Number(scrimMatch[1]);

// 未配置背景图/视频时也照常校验：tone 块是随包发布的代码，
// 提前证明它的取值成立，用户打开开关时才不会撞上一个意外失败。
const imageMatch = /^\s*image:\s*(.+?),/m.exec(configSource);
const backdropEnabled = Boolean(imageMatch) && imageMatch[1].trim() !== 'null';

const mediaRows = [];

for (const { tone, extreme, label } of BACKDROP_TONES) {
  const tokens = parseTokensFrom(
    extractBlock(backdropCss, `html[data-backdrop][data-backdrop-tone='${tone}']`),
  );
  const scrimColor = parseChannels(
    tokens.get('--backdrop-scrim-rgb'),
    `${tone} --backdrop-scrim-rgb`,
  );
  // 遮罩之后的底色，即最坏情况下面板下面那一层
  const under = composite({ ...scrimColor, a: configuredScrim }, extreme);

  for (const surface of SURFACES.filter((item) => item.tint)) {
    const tint = parseColor(tokens.get(surface.tint), `${tone} ${surface.tint}`);
    const paint = composite(tint, under);

    let worst = null;
    for (const spec of TEXT_TOKENS) {
      const color = parseColor(tokens.get(spec.name), `${tone} ${spec.name}`);
      const ratio = contrast(color, paint);
      if (!worst || ratio < worst.ratio) worst = { ...spec, color, ratio };
    }

    // 对比度随遮罩单调递增，二分反解出所需的最小遮罩强度
    const need = (alpha) =>
      contrast(worst.color, composite(tint, composite({ ...scrimColor, a: alpha }, extreme)));
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 30; i += 1) {
      const mid = (lo + hi) / 2;
      if (need(mid) >= worst.min) hi = mid;
      else lo = mid;
    }

    const pass = worst.ratio >= worst.min;
    mediaRows.push({
      tone,
      surface: surface.name,
      token: worst.name,
      label: worst.label,
      ratio: worst.ratio,
      required: hi,
      pass,
    });

    if (!pass) {
      failures.push(
        `${tone} 调性：${surface.name} 上的 ${worst.name}（${worst.label}）在${label}下仅 ` +
          `${worst.ratio.toFixed(2)}:1，请把 site.config.ts 的 background.scrim 提到 ` +
          `${hi.toFixed(2)} 以上`,
      );
    }
  }
}

const width = Math.max(...rows.map((row) => row.label.length));
console.log('\n背景亮度预算校验（WCAG 对比度）\n');
for (const row of rows) {
  const mark = row.pass ? '✓' : '✗';
  const ratio = row.ratio.toFixed(2).padStart(6);
  console.log(
    `  ${mark} ${row.theme.padEnd(5)} ${row.label.padEnd(width)} ${ratio}:1  (最低要求 ${row.min}:1，最差位置：${row.surface})`,
  );
}
console.log('');

if (mediaRows.length > 0) {
  const state = backdropEnabled ? '已启用' : '未启用，预校验';
  console.log(`背景媒体模式（${state}；遮罩 ${configuredScrim}，按最坏情形）\n`);
  for (const row of mediaRows) {
    const mark = row.pass ? '✓' : '✗';
    const ratio = row.ratio.toFixed(2).padStart(6);
    console.log(
      `  ${mark} ${row.tone.padEnd(5)} ${row.surface.padEnd(14)} ${ratio}:1  ` +
        `最低 ${row.label}/${row.token}，遮罩下限 ${row.required.toFixed(2)}`,
    );
  }
  console.log('');
}

if (failures.length > 0) {
  console.error('对比度校验未通过：\n');
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error('');
  process.exit(1);
}

console.log(
  `对比度校验通过：${rows.length + mediaRows.length} 组文字/背景组合全部达标。\n`,
);
