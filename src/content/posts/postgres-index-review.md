---
title: 一次慢查询复盘：索引建对了，还是慢
date: 2026-07-19
summary: 复合索引一直都在，查询却要 2.4 秒。问题不在索引建错，而在统计信息过期让 planner 估错了行数，选了一条要过滤器扫掉 51 万行的执行计划。
tags:
  - Postgres
  - 数据库
  - 性能
series: 数据库手记
order: 2
---

## 一条看起来很正常的查询

```sql
SELECT id, path, size, updated_at
FROM file_index
WHERE owner_id = $1
  AND deleted_at IS NULL
ORDER BY updated_at DESC
LIMIT 50;
```

该有的索引都有：`(owner_id, updated_at)` 的复合索引，外加 `updated_at` 的单列索引。这种查询我预期是个位数毫秒，实际那条查询跑到 2.4 秒。

## 先看 EXPLAIN ANALYZE

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, path, size, updated_at
FROM file_index
WHERE owner_id = 88213 AND deleted_at IS NULL
ORDER BY updated_at DESC
LIMIT 50;
```

输出的关键几行：

```
Limit  (cost=0.43..8421.77 rows=50 width=64) (actual time=2418.102..2418.104 rows=50 loops=1)
  ->  Index Scan using idx_updated_at on file_index
        (cost=0.43..1687432.11 rows=10000 width=64) (actual time=0.021..2418.09 rows=50 loops=1)
        Filter: (owner_id = 88213 AND deleted_at IS NULL)
        Rows Removed by Filter: 512043
        Buffers: shared hit=38 read=186420
```

读 `EXPLAIN ANALYZE` 我只看三样：估算的 `rows` 和实际的 `actual rows` 差多少、`Rows Removed by Filter`、还有 `Buffers` 里的 `read`。这里估算 `rows=10000`，过滤器实际丢掉了 51 万行——也就是说 planner 认为"这个用户占了表里相当一部分行，顺着 `updated_at` 扫、取前 50 行很快"，于是没走那个本该一步到位的复合索引。

## 选择性其实很好，是统计信息错了

`owner_id` 实际有 4.2 万个不同值，2200 万行平均每人 500 多行，选择性很好。走 `(owner_id, updated_at)` 复合索引本可以只读 50 行就停下。

planner 之所以没这么选，是因为 `pg_statistic` 里 `owner_id` 的 `n_distinct` 还停在 800——那是当初批量导入时留下的统计，之后 autovacuum 一直没跟上这张表的写入量。800 和 42000 差了 50 倍以上，估出来的行数自然离谱，选错索引几乎是必然。

```sql
ANALYZE file_index;
```

跑完再执行一次，plan 就换了：

```
Limit  (cost=0.57..38.42 rows=50 width=64) (actual time=0.031..0.412 rows=50 loops=1)
  ->  Index Scan Backward using idx_owner_updated on file_index
        (cost=0.57..1204.31 rows=50 width=64) (actual time=0.028..0.401 rows=50 loops=1)
        Index Cond: (owner_id = 88213)
        Filter: (deleted_at IS NULL)
        Buffers: shared hit=54
```

2.4 秒掉到 12ms。`Buffers` 从 18 万次读降到 54 次命中。复合索引里 `owner_id` 相等的前缀直接定了位置，`updated_at` 又是有序的，`LIMIT 50` 拿够就停，几乎不用回表。

## 回表代价和覆盖索引

顺带说一句这次没踩、但差点踩的：即使走对了复合索引，如果 `SELECT` 的列不在索引里，还得按 ctid 回表取 `path` 和 `size`。取 50 行无所谓，但要是取几千行，回表就是一堆随机堆访问，成本能盖过索引本身的收益。到那一步就得把常用列加进索引做覆盖，或者用 `INCLUDE` 挂在索引后面。

## 复盘

这个问题不在"索引建错"，索引一直都在。错的是 planner 拿到的分布和真实值差了 50 倍。我现在的习惯是：只要 `EXPLAIN ANALYZE` 里 `rows` 和 `actual rows` 差一个数量级以上，先别怀疑索引写法，去 `pg_statistic` 和 autovacuum 的日志里找原因。索引是给 planner 用的，planner 信的是统计信息，不是真实数据。
