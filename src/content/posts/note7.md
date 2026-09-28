---
title: C++STL基础
date: 2026-09-21
summary: vector,map,unordered_map,list底层
tags:
  - C++
  - STL
  - 学习
series: C++
order: 8
---
# 什么是STL

STL 全称是 **Standard Template Library**，即标准模板库。
它后来被纳入 C++ 标准库，成为 C++ 标准库中非常重要的一部分。

STL 的核心思想是：**泛型编程**。
也就是说，把数据结构和算法写成模板，让它们能适用于多种类型，而不是为每种类型单独写一遍。

例如，`std::vector<int>`、`std::vector<double>`、`std::vector<std::string>` 用的都是同一个 `vector` 模板，只是类型参数不同。

## 一、STL的六大组件

我们通常把STL分为六大组件：

- 1.容器：
   用来存放数据。

   例如：vector,list,deque,map,set,unordered_map,unordered_set等。


- 2.算法：

  用来处理容器中的数据。
  例如：sort,find,copy,transform,for_each等。

- 3.迭代器：

  连接容器和算法的桥梁，可以像指针一样遍历容器。
  例如：begin(),end()返回的就是迭代器。

- 4.仿函数：

  可以像函数一样使用的对象，也叫函数对象。
  例如：`std::less<int>`,`std::greater<int>`。

- 5.适配器

  用来改造已有组件。
  例如：stack,queue,priority_queue是容器适配器，reverse_iterator是迭代器适配器

- 6.空间配置器：

  负责内存的分配和释放
  大多数情况下不需要直接使用，但容器底层会用到

## 二、容器分类

STL 容器大致可以分为几类：

1. **序列容器**

   	元素按位置顺序存储。

   	例如：vector,list,deque

2. **关联容器**

   	元素按某种规则自动排序，通常基于树结构。

   	例如：map,set,multimap,multiset。

3. **无序关联容器**

   	元素不排序，基于哈希表实现。

   	例如：unordered_map,unordered_set。

4. **容器适配器**

   	对已有容器进行封装，提供特定接口。

   	例如：stack,queue,priority_queue。



## 三、一个简单例子

上面的内容太抽象了，我们从例子来深入理解

```C++
#include <vector> //提供vector容器
#include <algorithm> //提供sort等算法
#include <iostream>

int main() {
    std::vector<int> v = {3, 1, 4, 1, 5}; //容器
    
    std::sort(v.begin(), v.end());   // 算法sort() + 迭代器begin(),end()
    
    for (int x : v) { //范围for循环，遍历v
        std::cout << x << " ";
    }
}
```

他们通过模板和迭代器解耦，算法不需要知道容器具体是什么

# vector 

`std::vector` 本质上是一个**可以自动扩容的连续数组**。它支持随机访问，元素在内存中连续存放。

---

## 一、内部结构

`vector`内部通常维护三个指针：

```C++
T* begin;          // 指向第一个元素
T* end;            // 指向最后一个元素的下一个位置
T* capacity_end;   // 指向已分配内存的末尾
```

由此可以算出：

```C++
size()     = end - begin; //已有元素个数
capacity() = capacity_end - begin; //当前可存放元素总数
//当以上两个值相等，即size() == capacity() 时，再插入元素就会触发扩容
```

## 二、扩容过程

以`push_back`为例，这个函数意为向尾部添加一个元素

```C++
std::vector<int> v;
v.push_back(10);
v.push_back(20);
v.push_back(30);
```

假设初始`capacity = 0`。当第一次`push_back`时：

1.分配一块新内存，容量通常为1；
2.把`10`放进去；
3.`size = 1`,`capacity = 1`。

第二次 `push_back(20)` 时，发现 `size == capacity`，于是：

1.分配一块更大的内存，容量通常是原来的2倍或者1.5倍（取决于编译器）
2.把旧内存中的元素**移动或者拷贝**到新内存
3.释放旧内存
4.把`20`放到新内存末尾
5.更新三个指针。

以此类推，这就是vector的扩容过程

## 三、扩容导致的迭代器失效

在上面扩容的描述中，可以看到，扩容是移动了容器的地址的。这会导致：

- 所有指向旧内存的**指针、引用、迭代器**都会失效。

例如

```C++
std::vector<int> v = {1, 2, 3};
int& ref = v[0];          // 引用第一个元素
auto it = v.begin();      // 迭代器指向第一个元素
v.push_back(4);           // 可能触发扩容

// 如果发生了扩容：
// ref 悬空，it 失效，不能再使用
```

这是使用vector时最常见的问题

## 四、`reserve`与`resize`

#### 1. `reserve(n)`

预分配至少能容纳 `n` 个元素的内存，但**不改变 size()**。

```c++
std::vector<int> v;
v.reserve(100);   // capacity >= 100，size 仍为 0

v.push_back(1);   // 不会触发扩容
```

如果提前知道要放多少元素，`reserve` 可以避免多次扩容，提高性能。

#### 2. `resize(n)`

改变 `size()`，可能会构造或析构元素。

```c++
std::vector<int> v;
v.resize(5);      // size = 5，元素默认初始化为 0
v.resize(3);      // size = 3，后两个元素被析构
```

第一次resize发生了扩容，capacity从0变成了5，size也变成了5。
第二次resize发生了析构，后两个元素被析构，但是capacity没有减少。

# list

`std::list` 是一个**双向环形链表**。它和 `vector` 完全不同：元素不连续存储，而是分散在内存中的各个节点里，通过指针互相连接。

---

## 一、内部结构

每个元素存储在一个独立的节点中。节点通常包含三部分

```C++
struct Node {
    Node* prev;   // 指向前一个节点
    Node* next;   // 指向后一个节点
    T     data;   // 实际存储的元素
};
```

`list` 内部通常还保存一个**哨兵节点**，用来简化边界处理：

```C++
sentinel
  │
  ▼
┌────────┬──────┬────────┐
│ prev   │      │ next   │  ← 这个节点不存实际数据
└────────┴──────┴────────┘
```

- `begin()` 指向哨兵的下一个节点，即第一个真实元素；
- `end()` 指向哨兵节点本身；
- 链表为空时，哨兵的 `next` 和 `prev` 都指向自己。
- 即：哨兵节点既是开始又是结尾，链表的头元素和尾元素通过哨兵连接

## 二、插入和删除

### 插入

假如要在某个位置插入元素：

```C++
std::list<int> lst = {1, 2, 4};
auto it = lst.begin(); // 指向 1
++it;  // 指向 2
++it;  // 指向 4

lst.insert(it, 3);  // 在 4 前面插入 3
```

过程：
1.创建一个新节点；
2.把新节点的`prev`指向`4->prev`，`next`指向`4`；
3.修改前一个节点的`next`和`4`的`prev`。

### 删除

```C++
auto it = lst.begin();
++it;          // 指向 2
lst.erase(it); // 删除 2
```

过程：
1.找到 `2` 的前驱 `1` 和后继 `3`；
2.让 `1->next` 指向 `3`；
3.让 `3->prev` 指向 `1`；
4.释放 `2` 这个节点。

## 三、迭代器失效情况

这是`list` 相比 `vector` 的一大优势：

- **插入元素不会使任何已有迭代器失效**；
- **删除元素只会使指向被删除元素的迭代器失效**，其他迭代器仍然有效。

```C++
std::list<int> lst = {1, 2, 3, 4};
auto it = lst.begin();  // 定义迭代器 指向 1
++it;                   // 指向 2

lst.push_back(5);       // it 仍然有效，仍指向 2

auto it2 = it;
lst.erase(it2);         // 注意
```

需要注意的是，`lst.erase()`函数删除的是具体节点而不是迭代器，当节点被删除后指向该节点的迭代器将会失效，而指向别的节点的迭代器仍然有效。

## 四、`splice`：链表的高效操作

`list` 提供了 `splice`，可以在 O(1) 时间内把另一个链表整个地“接”到当前链表，不需要拷贝元素，只有O(1)的时间复杂度：

```c++
std::list<int> a = {1, 2, 3};
std::list<int> b = {4, 5, 6};

a.splice(a.end(), b);  // 把 b 的所有元素接到 a 末尾
// 现在 a = {1, 2, 3, 4, 5, 6}，b 为空
```
如果要把另一个链表的一部分“接”到当前链表，需要使用 `splice` 函数的另一种重载版本，`splice(position, x, first, last)`，时间复杂度为O(n)。例如：

```c++
std::list<int> a = {1, 2, 3};
std::list<int> b = {4, 5, 6};

a.splice(a.end(), b, b.begin(), b.end());
// 现在 a = {1, 2, 3, 4, 5, 6}，b 为空
```

# map

`std::map` 是一个**有序关联容器**，存储的是键值对 `std::pair<const Key, T>`。它的特点是：元素按照键（Key）自动排序，并且不允许重复键。

它的底层实现通常是**红黑树**，一种自平衡的二叉搜索树。

---

## 一、为什么用红黑树

二叉搜索树（BST）的性质是：

- 左子树所有键 < 根节点键；
- 右子树所有键 > 根节点键；
- 查找、插入、删除的平均复杂度是 O(log n)。

但普通 BST 有个问题：如果插入顺序是有序的，比如 `1, 2, 3, 4, 5`，树会退化成链表。

为了解决这个问题，需要**自平衡二叉搜索树**。红黑树就是其中一种，它通过额外的颜色规则和旋转操作，保证树的高度始终保持在 O(log n) 级别。

## 二、红黑树的基本规则

红黑树在每个节点上增加一个颜色位：红色或黑色。它满足以下性质：

1.每个节点是红色或黑色；
2.根节点是黑色；
3.所有叶子节点（NIL 空节点）是黑色；
4.红色节点的两个子节点必须是黑色（不能有连续两个红节点）；
5.从任一节点到其所有后代叶子节点的路径上，黑色节点数目相同。

这些规则保证了：**最长路径不超过最短路径的两倍**，因此树高始终是 O(log n)。

红黑树详见note8。

## 三、`map`的节点结构

```C++
struct Node {
    std::pair<const Key, T> value;  // 键值对
    Color color;                    // 红或黑
    Node* left;
    Node* right;
    Node* parent;
};
```

注意：键是`const key`，因为`map`中的键不允许修改，否则会破坏红黑树的排序顺序

## 四、元素排列顺序

`map` 默认使用 `std::less<Key>` 比较键。也就是说，元素按**键**从小到大排列。例如：

```C++
std::map<std::string, int> age;
age["Tom"] = 20;
age["Alice"] = 22;
age["Bob"] = 19;
```

遍历时

```C++
for (const auto& [name, a] : age) {
    std::cout << name << ": " << a << "\n";
}
```

输出顺序是

```C++
Alice: 22
Bob: 19
Tom: 20
```

原因是map中的元素默认按键排序，在这里体现为字典序。
当然比较器也可以自定义：

```C++
std::map<int, std::string, std::greater<int>> m;
```

`std::map`的模板参数是：

```C++
template<
    class Key,
    class T,
    class Compare = std::less<Key>,   // 第三个参数，默认是 less
    class Allocator = std::allocator<std::pair<const Key, T>> //分配器，一般不用管
>
class map;
```

可以看到排序只能按照键排序，所以上述例子中按年龄排序是无法直接实现的，因为年龄很可能重复，需要使用`multi_map`。

```C++
std::multimap<int, std::string> age;

age.emplace(20, "Tom");
age.emplace(22, "Alice");
age.emplace(19, "Bob");

for (const auto& [a, name] : age) {
    std::cout << name << " " << a << "\n";
}
```

但这会导致另一个问题，无法通过名字查年龄，这是由于树的结构导致的，树是通过键查询值，不能通过值查询键。

## 五、常见操作

### 1.find(key);

```C++
auto it = m.find("tom");
```

该方法返回一个迭代器，即`it`，找到则返回那个键值对，没找到返回m.end()，即遍历的终点，不指向任何位置

### 2.insert(key,value)

插入一个键值对：

```C++
m.insert({"tom", 20});
```

插入一段区间：

```C++
std::map<std::string, int> other = {{"A", 1}, {"B", 2},{"C", 3}};
m.insert(other.begin(), other.end()); //A,B,C都被插入进m
m.insert({{"A", 1},{"B", 2},{"C", 3}}); //效果同上
```

### 3.erase

按 key 删除

```c++
m.erase("Tom");
```

- 返回删除的元素个数：`map` 里是 0 或 1。

按迭代器删除


```c++
auto it = m.find("Tom");
if (it != m.end()) {
    m.erase(it);
}
```

删除一段区间

```c++
m.erase(m.begin(), m.end());   // 清空
```

遍历时删除

```c++
for (auto it = m.begin(); it != m.end(); ) {
    if (it->second < 20) {
        it = m.erase(it);   // erase 会返回下一个有效迭代器
    } else {
        ++it;
    }
}
```

注意：`erase(it)` 会让 `it` 失效，所以要用返回值更新 `it`。

### 4.m[key]:下标访问

```C++
m["Tom"] = 20;
```

行为：

- key 存在：返回对应 value 的引用；
- key 不存在：**自动插入**一个 `{key, value_type()}`，value 是默认值，再返回引用。

如果不想要自动插入，用`.at(key)`：

```C++
m.at("Tom");   // key 不存在时抛 std::out_of_range
```

## 六、迭代器

`map`的迭代器是**双向迭代器**：

- 支持`++`和`--`
- 不支持`it + n`这种随机访问。
- 中序遍历`map`，得到的就是按键排序的序列

## 七、与`set`的关系

`std::set`底层也是红黑树，区别在于：

- `map`存储键值对`pair<const Key, T>`
- `set`只存储`key`，相当于没有值的`map`。

`multimap` 和 `multiset` 也基于红黑树，但允许重复键。

# unordered_map

`std::unordered_map` 是一个**无序关联容器**
存储键值对 `std::pair<const Key, T>`
它不按键排序，而是通过**哈希表**实现，平均查找、插入、删除复杂度为 O(1)。

---

## 一、哈希表的基本思想

哈希表的核心是：通过一个**哈希函数**，把键映射到一个数组下标，从而直接定位元素。

例如，这里有一个数组叫桶数组：

```C++
int index[8]; //管理八个桶
```

插入键值对`("tom",20)`时：

1.用哈希函数计算`hash("tom")`；
2.对桶数量取模，得到下标，比如`3`；
3.把 `("Tom", 20)` 放到下标 `3` 的位置。

在查找时同样计算下标，直接访问，理想情况下是O(1)。

## 二、哈希冲突

不同的键可能算出同一个下标，这叫哈希冲突。

一般有两个解决方法，分别是：
1.链地址法
2.开放地址法

`std::unordered_map`通常采用**链地址法**。

## 三、链地址法

链地址法就是：每个桶不是一个单独的元素，而是一个**链表**(或者类似结构)
将冲突的元素都挂到一个桶的链表上。

比如，现在有两个键值算出来的哈希值都是3，那么第一个存放的哈希值就链在3上，第二个就链在第一个上面。在查询时同理，先计算键值的哈希值，再沿着链表找对应的键，直到找到“Bob”。

如果链表很短，平均复杂度仍是O(1)。
如果所有键都冲突到同一个桶，复杂度会退化到O(n)。这时候应该重新设计哈希函数

## 四、负载因子与`rehash`

为了控制链表长度，`unordered_map`会维护一个**负载因子**：

```C++
load_factor = size / bucket_count
```

其中

- `size`指元素个数
- `bucket_count`指桶的数量

当负载因子超过某个阈值时，会触发`rehash`：

1.分配更多的桶
2.重新计算所有元素的哈希值
3.把他们重新分配到新桶中

这个过程类似`vector`扩容，会导致同样的问题：

- 所有迭代器失效
- 元素顺序可能改变
- 单次操作可能从O(1)变成O(n)，但**均摊复杂度**仍是O(1)

可以用`reserve`提前设置桶的数量，避免多次`rehash`：

```C++
std::unordered_map<std::string, int> m;
m.reserve(100);  // 预分配足够桶，减少 rehash
```

## 五、键的要求

`unordered_map`的键必须满足两个条件：

1.可哈希：有`std::hash<Key>`特化，或者自定义哈希函数
2.可比较相等：有`operator==`，或者自定义相等比较器。

基本类型标准库已经支持，自定义类型需要自己提供，这里以Person结构体举例，具体方式如下：

```C++
struct Person {
    std::string name;
    int age;

    bool operator==(const Person& other) const {
        return name == other.name && age == other.age;
    }
};

struct PersonHash {
    std::size_t operator()(const Person& p) const {
        return std::hash<std::string>()(p.name) ^
               (std::hash<int>()(p.age) << 1);
    }
};

std::unordered_map<Person, int, PersonHash> m;
```

# STL的选择原则

可以按下面顺序判断：

1. **需要键值对查找吗？**
   - 不需要：优先考虑 `vector` 或 `list`。
   - 需要：进入第 2 步。
2. **需要按键排序或范围查询吗？**
   - 需要：用 `map`。
   - 不需要，只追求平均 O(1) 查找：用 `unordered_map`。
3. **需要频繁随机访问吗？**
   - 需要：用 `vector`。
   - 不需要，但需要频繁在中间插入删除：用 `list`。
4. **不确定时怎么办？**
   - 默认优先用 `vector`。
     因为连续内存、缓存友好，实际性能往往优于 `list`，即使中间插入删除较多。


---


## 典型场景举例

| 场景                                     | 推荐容器                 | 理由                               |
| ---------------------------------------- | ------------------------ | ---------------------------------- |
| 存储一组学生成绩，需要频繁按索引访问     | `vector`                 | 随机访问 O(1)，内存连续            |
| 实现一个任务队列，频繁在中间插入删除     | `list`                   | 已知位置插入删除 O(1)              |
| 统计单词出现次数，并要求按单词字典序输出 | `map`                    | 自动排序，遍历即有序               |
| 统计单词出现次数，只关心查找速度         | `unordered_map`          | 平均 O(1) 查找                     |
| 需要按分数范围查找学生                   | `map`                    | 支持 `lower_bound` / `upper_bound` |
| 缓存，键是字符串，不要求顺序             | `unordered_map`          | 哈希查找快                         |
| 实现 LRU 缓存                            | `list` + `unordered_map` | 链表维护顺序，哈希表快速定位       |








