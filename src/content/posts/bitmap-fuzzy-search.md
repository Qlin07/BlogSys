---
title: 用位图做模糊匹配：一次把 CPU 打满的重构
date: 2026-08-30
summary: 命令面板要在一批候选里做容错匹配，逐条算编辑距离太慢，我换成了 Bitap 位图。算法本身是对的，但掩码算错了位置，单次查询从 0.3ms 掉到 40ms，CPU 直接被一个核吃满。
tags:
  - 算法
  - 搜索
  - 性能
series: 性能手记
order: 1
---

## 起点是一个太慢的命令面板

需求很朴素：输入 `rdq`，要能匹配到 `redis-queue`，允许错 1 到 2 个字符。候选是 4 万条文件路径，平均每条 24 个字符。最早我用的是逐条算 Levenshtein 距离，4 万乘 24 的字符比较，一次查询 90ms 左右，加上每敲一个键就查一次，面板明显卡。于是换成 Bitap——用位运算一次扫描文本，不需要 DP 表。

## Bitap 在做什么

它把模式串编码成"字母掩码"：对模式里每个字符，记下它出现过哪些位置。扫描文本时用一个状态字 `R` 向右滚动，每读一个字符就与掩码做一次与运算，模式长度那一位为 0 就表示命中。整个过程是文本长度级别的循环，常数极小。

```rust
const fn mask_init() -> [u64; 256] {
    [0u64; 256]
}

fn bitap(mask: &[u64; 256], pat_len: usize, text: &[u8]) -> Option<u32> {
    let mut r: u64 = !0u64;                       // 全 1，表示还没开始匹配
    let mut best: u32 = u32::MAX;
    let match_bit: u64 = 1u64 << (pat_len - 1);   // 模式长度对应的那一位

    for &c in text {
        r = ((r << 1) | 1) & mask[c as usize];
        if r & match_bit == 0 {
            // 这一位归零说明整个模式都对上了
            best = best.min(error_score(r));
        }
    }

    if best == u32::MAX { None } else { Some(best) }
}
```

掩码的构建也很简单，只依赖模式串本身：

```rust
fn build_mask(pattern: &[u8]) -> [u64; 256] {
    let mut mask = [0u64; 256];
    for (i, &c) in pattern.iter().enumerate() {
        mask[c as usize] |= 1u64 << i;
    }
    mask
}
```

有了这个，单次匹配从 90ms 降到 0.3ms，我当时的判断是"这就够了"，然后就去接权重排序了。

## 那一版为什么会把 CPU 打满

问题出在调用方。我为了图省事，把掩码的构建写进了逐条候选的循环里——反正 `build_mask` 只依赖 pattern，看起来放哪都"对"：

```rust
for candidate in &candidates {
    let mask = build_mask(pattern);            // 每个候选都重算一遍同一个 pattern
    if let Some(score) = bitap(&mask, pattern.len(), candidate.as_bytes()) {
        hits.push((score, candidate));
    }
}
```

上线后查询 P99 从 3ms 涨到 480ms，某台机器的一个核持续跑在 100%，面板的输入框开始丢字。查下来原因不难看：4 万次重复构建掩码，每次都要初始化 256 个 `u64` 的数组（那是 2KB 的栈上清零），再做一遍模式长度的按位或。4 万乘 24，将近 100 万次纯粹的重复计算，和候选内容一点关系都没有。

一次查询从 0.3ms 变成 40ms。这个数字不算灾难级，但输入是每个键都触发，人已经能感觉到黏手了。

修法是把掩码提到循环外面。就这一行：

```rust
let mask = build_mask(pattern);                // 提到循环外，只算一次
for candidate in &candidates {
    if let Some(score) = bitap(&mask, pattern.len(), candidate.as_bytes()) {
        hits.push((score, candidate));
    }
}
```

顺带把 `[u64; 256]` 换成了 `[u64; 128]`，只索引 ASCII 可见字符，栈上那 1KB 的初始化也省了。

## 排序用了字段权重，不是为了好看

命中之后怎么排比怎么匹配更容易出错。我们最终按字段来源给了权重：文件名 3，目录名 2，其余路径片段 1。先按权重把候选分桶，桶内再用 Bitap 的误差分数从小到大排。

这样做的直接好处是能提前剪枝：文件名桶里的候选通常只有几百条，其余桶在结果够数时直接跳过。查询耗时从 40ms 掉回 0.6ms 左右，而且高权重的命中稳定排在最前面，哪怕它的误差分数比某个路径片段大。

代价是召回率对路径中间的字符变差了，用户搜一段深层目录名时偶尔要输完整。我保留了这个选择，因为命令面板里绝大多数输入是在找文件名。

## 事后看

这次事故里没有任何一行代码单独是错的，`build_mask` 本身没问题，放进循环也"能跑出正确结果"。它只是把正确答案算了很多遍。位运算算法容易让人盯着那几行位操作看，而真正的开销常常在它外面，在调用方图省事的那一步。
