---
title: Rust 异步运行时不会告诉你的事
date: 2026-09-08
summary: 服务在 40 秒内从 8000 QPS 掉到接近 0，CPU 却只有 12%。原因是一个同步的文件读取把 8 个 worker 全占了，连超时定时器都轮不到执行。
tags:
  - Rust
  - 异步
  - 并发
series: 性能手记
order: 2
---

## 现象：QPS 归零，CPU 只有 12%

那天下午服务在 40 秒内从 8000 QPS 掉到接近 0。进程还在，端口还在监听，日志没有 panic，但健康检查开始超时，k8s 把它标成不健康。最反直觉的是 CPU 只有 12%，几乎是空的，重启之后还是这样。

## blocking 调用是怎么把 worker 吃光的

tokio 默认的 worker 线程数等于 CPU 核数，我们那台是 8。运行时靠这 8 个线程驱动所有 task 的 poll。只要有一个 task 在 poll 里做同步阻塞，它占住的线程就干不了别的。

我们踩的是同步文件读取：

```rust
async fn load_meta(path: &Path) -> Result<Vec<u8>> {
    let data = std::fs::read(path)?;   // 同步 IO，整个 worker 线程被占住
    Ok(data)
}
```

单次 `std::fs::read` 在冷缓存下要几十毫秒，遇到慢盘能到几百毫秒。8 个 worker 同时撞上 8 个这样的调用，运行时就没人了：定时器不触发，心跳不发，连 `tokio::time::timeout` 都不会到期——因为驱动时间的也是这批线程。于是现象就变成"服务卡住，但 CPU 是空的"。

修法是把阻塞工作挪出运行时：

```rust
async fn load_meta(path: PathBuf) -> Result<Vec<u8>> {
    let data = tokio::task::spawn_blocking(move || std::fs::read(&path))
        .await
        .map_err(|e| anyhow!("join error: {e}"))??;
    Ok(data)
}
```

`spawn_blocking` 走的是独立的阻塞线程池（默认上限 512），不会占用 worker。同一类坑还有：`std::sync::Mutex` 的 guard 跨越 `.await` 持有、`reqwest::blocking`、以及任何同步的 DNS 解析。

## 怎么定位到这一点

静态看代码看不出来，因为每一行都能编译、平时也都是对的。我用的是 tokio-console：

```toml
[dependencies]
console-subscriber = "0.4"
```

```rust
fn main() {
    console_subscriber::init();
    // ... 启动运行时
}
```

它按 task 显示"运行了多久没让出"。我看到几个 task 的 busy 时间稳定在 300ms 以上——正常 task 应该在微秒级让出。再对着 `tokio_metrics` 看 worker 的 `mean_poll_duration`，8 个 worker 同时抬升，就基本锁定了。

没有 console 的话，一个能凑合的指标是持续观察 worker 的忙时长分布：只要"某几个 task 长时间占用 worker"这条曲线抬起来，就值得去查有没有同步调用。

## timeout 包在了错误的位置

跟这个问题连在一起的还有一次：我们给接口加了 2s 超时，但它不生效。

```rust
// 看起来加了超时，其实救不了
let res = tokio::time::timeout(Duration::from_secs(2), handler_blocking(req)).await;
```

`timeout` 的原理是让运行时在到期时取消这个 future，可它自己也需要 worker 线程去驱动。如果 `handler_blocking` 正把线程堵在同步调用里，定时器根本轮不到执行，2 秒到了也不会触发。超时只有在被包裹的 future 会让出的时候才成立。

另一个常见版本是包错了层级：把 `timeout` 包在整个重试循环外面，一次重试吃掉 2s 预算，后面两次重试实际上没有超时保护。

> 我在 runner 里留的注释：超时不是闹钟，是"下次让出时检查一下时间"。线程不让出，闹钟就永远不会响。

## 现在的约定

代码评审里加了一条硬规则：`.await` 之前出现 `std::fs`、`std::net`、`reqwest::blocking`，或者持有 `std::sync::Mutex` 跨越 await，必须给出理由。这条规则拦下的问题比它误伤的多，我觉得划算。
