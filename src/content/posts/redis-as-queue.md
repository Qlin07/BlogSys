---
title: 把 Redis 当队列用的三个反模式
date: 2026-09-12
summary: 拿 Redis 当队列不会立刻出问题，出问题的时候通常已经在生产环境了。我写过的三种用法——轮询全量 Set、无界 List、把 BRPOP 当可靠投递，各自的量化代价都记在这里。
tags:
  - Redis
  - 队列
  - 架构
---

## 为什么会走到这一步

2021 年我接手一个任务分发服务，峰值每分钟大约 4 万条任务，30 个 worker 抢着消费。当时的团队共识是"已经有 Redis 了，再引入一个 MQ 不值得"。这个决定放到今天我也不觉得错，两次扩容和一次故障之后我才明白，错的是后面三种用法。

## 轮询全量 Set 来取任务

任务写进一个 Set，worker 定时把整个 Set 拉下来，自己判断哪些还没做过。

```rust
loop {
    let ids: Vec<String> = redis.smembers("tasks:pending")?;   // 全量拉取
    for id in ids {
        if redis.sismember("tasks:done", &id)? {
            continue;
        }
        process(&id).await?;
        redis.sadd("tasks:done", id)?;
    }
    sleep(Duration::from_millis(200)).await;
}
```

Set 涨到 12 万条的时候，一次 `SMEMBERS` 的响应体是 3.8MB。30 个 worker 每 200ms 拉一遍，等于每秒 570MB 的入站流量，先撑不住的是网卡。Redis 那边的单核 CPU 常驻在 65% 左右，P99 从 1ms 涨到 90ms。真正难受的是扩展方向反了：加 worker 会让情况更糟，而不是更好。

## 用 List 做无界队列

改成 `LPUSH` + `BRPOP` 之后性能看起来正常了，吞吐很轻松就上去了。但队列本身没有上限。

```rust
redis.lpush("queue:jobs", payload)?;              // 生产者，不检查长度
let (_, job) = redis.brpop("queue:jobs", 0.0)?;   // 消费者
```

生产 4 万/分钟、消费 2.6 万/分钟的那段时间，队列每 10 分钟涨 14 万条。到 800 万条时内存占用 4.6GB，触发了 `maxmemory`。`noeviction` 下写入开始返回 OOM，上游把错误当成瞬时故障重试，队列涨得更快；换成 `allkeys-lru` 之后更糟——Redis 把队列 key 自己逐出了，等于静默丢了一批任务。事后拿业务日志和任务表对账，确认丢了大约 11 万条。

## 把 BRPOP 当可靠投递

`BRPOP` 是弹出即删除。worker 拿到任务之后进程被 kill，这条任务就从世界上消失了。

```rust
let (_, job) = redis.brpop("queue:jobs", 0.0)?;
let result = handle(job).await?;   // 这中间进程挂掉，任务就没了
```

后来换成 `BRPOPLPUSH` 到一张 processing list，好了一些，但缺 ack 超时回收：processing list 只涨不消，重启之后那些"正在处理"的任务没人认领，只能人工捞出来重新投。

> 我的笔记，2021-11-03：队列的可靠性不在 push 那一步，在 ack 那一步。BRPOP 没有 ack 这个概念，所以它给的不是投递语义，只是"取走"。

滚动重启一次，从入口日志和业务结果表对出来的差值是 3000 条上下。不是每次都丢，但每次都在丢，而且是随机的一小截。

## 换掉之后

用 Stream 加 consumer group 之后，语义终于对上了：

```bash
# 生产
XADD queue:jobs * kind:thumbnail id:88213

# 消费：读到本地 pending，处理完才 ACK
XREADGROUP GROUP workers worker-7 COUNT 32 BLOCK 2000 STREAMS queue:jobs >

# 兜底：回收超过 60s 仍未 ACK 的消息
XAUTOCLAIM queue:jobs workers worker-7 60000 0-0 COUNT 32
```

`XACK` 之前的消息留在 PEL 里，worker 挂了会被 `XAUTOCLAIM` 抢回去，重启不再丢任务。代价也是真实的：PEL 本身会涨，我们给它加了长度告警；同一批消息可能被处理两次，业务侧必须幂等，这一条我们改了三处代码才补齐。

| 方案 | 重启是否丢数据 | 能否横向扩 worker | 复杂度 |
| --- | --- | --- | --- |
| BRPOP | 是，约 3000 条/次 | 能 | 低 |
| BRPOPLPUSH + processing list | 不丢，但会卡住 | 能 | 中 |
| Stream + consumer group | 不丢 | 能 | 中高 |

再往后，重投递策略、死信、跨机房这些需求一条条压上来，我们把这套东西挪到了 Kafka。那一段的取舍是另外一篇文章的事。这里想留下的结论很短：Redis 能当队列用，但它不替你想可靠性，那个部分得你自己写。
