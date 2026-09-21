---
title: C++智能指针
date: 2026-09-21
summary: 智能指针，unique_ptr/shared_ptr/weak_ptr
tags:
  - C++
  - 面向对象
  - 学习
series: C++
order: 7
---

# 智能指针

## 为什么需要智能指针

先看一个例子

```C++
void f() {
    int* p = new int(10);

    // ... 做一些可能抛异常或提前 return 的事情

    delete p;
}
```

这段代码看似没问题，但实际上非常脆弱

- 程序如果在中间退出（无论正常或者异常），写在结尾的delete都不会被执行，导致泄露
- 如果两个指针指向同一块内存，都去delete，程序会崩溃
- 函数返回一个裸指针时，调用者不知道：
  - 1.要不要delete
  - 2.别人会不会delete
  - 3.这块内存的生命周期归谁管

裸指针本身只表示地址，不表达“谁拥有这块资源、何时释放”。

## RAII思想

C++为了解决这个问题，提出了RAII思想
> Resource Acquisition Is Initialization
> 资源获取即初始化

准确理解是：

- 把资源的生命周期**绑定到一个栈对象**上；
- 在构造函数中获取资源；
- 在析构函数中释放资源
- 因为栈对象离开作用域时一定会析构，所以资源一定会被释放。

例如

```C++
class IntHolder {
    int* p;
public:
    IntHolder(int value) : p(new int(value)) {}

    ~IntHolder() {
        delete p;
    }
};

void f() {
    IntHolder h(10);

    // 即使这里抛异常，或者提前 return，
    // h 离开作用域时也会自动调用析构函数，释放 p。
}
```

这里使用了一个类来管理指针，在其析构函数中释放资源。通过类管理指针的方法，无论作用域是正常退出还是因异常展开，这个指针的内存都能被正常释放。这就是RAII：**用对象的生命周期管理资源**

## RAII的应用：智能指针

标准库把这种思想做成了通用工具，就是智能指针
- `std::unique_ptr`
- `std::shared_ptr`
- `std::weak_ptr`


这些智能指针本质都是类模板，内部保存一个指针，并在适当的时候自动释放资源。例如

```C++
#include <memory>

void f() {
    std::unique_ptr<int> p = std::make_unique<int>(10);

    // 不需要写 delete
    // p 离开作用域时，会自动 delete 它管理的 int
}
```

这样就解决了裸指针的核心问题：
1.自动释放资源
2.异常安全，即便抛异常也能释放
3.表达所有权语义
- `unique_ptr` 表示独占所有权；
- `shared_ptr` 表示共享所有权；
- `weak_ptr` 表示不拥有、只观察。


所以智能指针所谓的智能，就在于**把所有权和生命周期用类型表达出来**

下面单独讲解每一种指针

---

# 三种智能指针

智能指针的头文件为

```C++
#include <memory>
```

## `unique_ptr`：独占所有权

### 一、基本含义

`std::unique_ptr` 表示**独占所有权**，即：

-  同一时刻，一块资源只能由一个 `unique_ptr` 拥有。
- 当这个 `unique_ptr` 被销毁时，它管理的资源也会被自动释放。

基本用法：

```C++
std::unique_ptr<int> p = std::make_unique<int>(10);
//含义为 int p = 10; 但是智能指针。
std::cout<< *p << std::endl; //输出10
```

`<>`中写什么类型指针就是什么类型，后续用法和指针用法相同

> `std::make_unique` 是 C++14 引入的，推荐使用。
> 如果是 C++11，可以这样写：`std::unique_ptr<int> p(new int(10));`

### 二、独占：不可拷贝，只能移动

这是`unique_ptr`最核心的特点。

```C++
std::unique_ptr<int> p1 = std::make_unique<int>(10);

// std::unique_ptr<int> p2 = p1;  // 错误：不能拷贝
std::unique_ptr<int> p2 = std::move(p1);  // 正确：转移所有权
```

执行 `std::move(p1)` 后：

- p1变成右值，调用p2的移动构造函数
- 然后p1被置空，p2接管原来的资源

禁止拷贝是为了防止重复释放

### 三、常见操作

```C++
std::unique_ptr<int> p = std::make_unique<int>(42);

p.get();       // 返回裸指针，但不转移所有权
p.release();   // 放弃所有权，返回裸指针，需要自己 delete
p.reset();     // 释放当前资源，p 变为空
p.reset(new int(7));  // 释放旧资源，接管新资源
```
- `p.get()`返回p所定义类型的裸指针，在上例中，返回的就是`int*`裸指针
- `p.release()`同样返回裸指针，但同时p会放弃原来所指内存的所有权，且p变为空指针。
- `p.reset()`不返回裸指针，它将释放p正在管理的内存，然后让p置空。
- `p.reset(new int(7))`，当reset里面有参数，重置后会直接管理新申请的内存。`new int(7)`返回的就是裸指针，但reset把它交给`unique_ptr`管理。


注意：

- `get()` 只是观察，不要用它去 `delete`，这会导致double free；
- `release()` 会交出所有权，必须小心，否则容易泄漏；
- `reset()` 会释放原来管理的资源。


### 四、作为函数参数和返回值

1. 返回`unique_ptr`，表示把所有权交给调用者

   ```C++
   std::unique_ptr<int> createInt() {
       return std::make_unique<int>(10);
   }

   auto p = createInt();  // p 拥有这个 int
   ```

2. 作为参数：转移所有权

   如果函数要接管所有权：

   ```C++
   void takeOwnership(std::unique_ptr<int> p) {
       // p 现在拥有资源
   } //离开作用域后p自动析构

   std::unique_ptr<int> p = std::make_unique<int>(10);
   takeOwnership(std::move(p));  // 通过移动构造，所有权转移进函数
   // 此时外面的 p 是空的，保持空状态
   // 原来的 int(10) 已经在 takeOwnership 返回时被释放
   ```

3. 作为参数：普通使用，不转移所有权

   如果函数只是使用对象，不要传`unique_ptr`，传裸指针或者引用

   ```C++
   void use(int* p);
   void use(int& r);
   ```


### 五、数组

`unique_ptr`支持数组：

```C++
std::unique_ptr<int[]> arr = std::make_unique<int[]>(5); 
	//这里的意思是创建包含五个智能指针的数组
	//析构时调用delete[]，而不是delete
arr[0] = 1;
arr[1] = 2;
```

使用另一种方法时要注意

```C++
std::unique_ptr<int> p(new int[5]);  // 错误：析构时会用 delete，不是 delete[]
```

这里：

- 模板参数是 `int`，`unique_ptr<int>` 认为自己在管理**一个 int**；
- 但实际传入的是 `new int[5]`，一个数组；
- 析构时，`unique_ptr<int>` 会调用`delete p`，而不是`delete[] p`。
- 应该改为`std::unique_ptr<int[]> p(new int[5]);`

所以一般建议还是用`std::make_unique<>`

### 六、自定义删除器

默认删除器是 `delete`。
如果资源不是用 `new` 分配的，可以自定义删除器：

```C++
auto deleter = [](FILE* f) {
    if (f) fclose(f);
};

std::unique_ptr<FILE, decltype(deleter)> file(fopen("a.txt", "r"), deleter);
```

除了文件以外，malloc申请的需要用free释放
套接字、数据库连接、锁等，都有各自的释放函数

> 这块具体情况具体分析，具体类型怎么释放可以上网查查，这里不延申（我也不会）

## `shared_ptr`:共享所有权与引用计数

### 一、基本含义

`std::shared_ptr`表示共享所有权，意思是：

- 多个`shared_ptr`可以同时拥有同一块资源
- 当最后一个拥有该资源的`shared_ptr`被销毁时，资源才会被释放

基本用法：

```C++
std::shared_ptr<int> p1 = std::make_shared<int>(10);

std::shared_ptr<int> p2 = p1;  // 允许拷贝，共享所有权

std::cout << *p1 << std::endl; // 10
std::cout << *p2 << std::endl; // 10
```

### 二、引用计数

`shared_ptr` 内部有一个**引用计数**，用来记录有多少个 `shared_ptr` 正在共享同一块资源。当某个 `shared_ptr` 被销毁或重置时，引用计数减一.

### 三、控制块

`shared_ptr` 通常包含两个部分：

1. **指向被管理对象的裸指针**
2. **指向控制块的指针**

控制块里保存：

- 强引用计数，即 `shared_ptr` 的数量；
- 弱引用计数，即 `weak_ptr` 的数量；这个后面再提
- 删除器；
- 分配器等信息。

可以简单理解为：

```c++
shared_ptr<T>
  ├── T* ptr           // 指向资源
  └── ControlBlock*    // 保存引用计数等
```

拷贝一个 `shared_ptr` 时，复制的是这两个指针，并让控制块中的强引用计数加一。

### 四、创建方式：`make_shared`

```C++
std::shared_ptr<int> p = std::make_shared<int>(10);
```

`make_shared` 的优点：

1. **更高效**：它通常一次性分配对象和控制块，减少内存分配次数。
2. **更安全**：避免某些异常情况下裸指针泄漏。
3. **更简洁**。

但 `make_shared` 也有局限：

- 不能自定义删除器；
- 如果类需要自定义 `new/delete`，则不能使用；
- 弱引用存在时，对象内存可能延迟释放，因为对象和控制块一起分配。这个后续解释

### 五、常见操作

```C++
auto p = std::make_shared<int>(42);

p.get();        // 返回裸指针，不增加引用计数
p.use_count();  // 返回当前强引用计数，拿来调试用，不能直接拿来判断计数，实际中会受多线程影响
p.reset();      // 释放当前 shared_ptr 对资源的所有权
p.reset(new int(7)); // 接管新资源，旧资源计数减一
```

注意事项基本和`unique_ptr`相同，比如不要用同一个裸指针初始化多个独立的`shared_ptr`，否则会产生多个控制块，导致重复释放。

### 六、循环引用问题

`shared_ptr`最大的坑是**循环引用**：

```C++
class A {
public:
    std::shared_ptr<B> Bob;
};

class B {
public:
    std::shared_ptr<A> Alice;
};

int main() {
    std::shared_ptr a = std::make_shared<A>(); //A类计数+1
    std::shared_ptr b = std::make_shared<B>(); //B类计数+1
    
    (*a).Bob = b; //B类计数+1；
    (*b).Alice = a; //A类计数+1；
}
```

![79000810735](C:\Users\23288\AppData\Local\Temp\1790008107355.png)

在离开作用域时，a和b都会销毁。但只会消除a,b的指针，Bob和Alice的互指无法消除

此时 `a` 和 `b` 的引用计数都不会归零，资源永远不会释放。解决循环引用，就需要下一个知识点：`weak_ptr`。

## `weak_ptr`:弱引用与打破循环引用

### 一、基本含义

`std::weak_ptr` 是一种**不控制对象生命周期**的智能指针。它指向由 `shared_ptr` 管理的对象，但**不会增加引用计数**。

意思是说：`weak_ptr`只是观察对象，它不拥有对象，当所有`shared_ptr`都销毁后，对象都会被释放，即便还有`weak_ptr`指向它。

基本用法：

```C++
std::shared_ptr<int> sp = std::make_shared<int>(10);
std::weak_ptr<int> wp = sp;   // weak_ptr 指向 sp 管理的对象，但不增加引用计数

std::cout << sp.use_count() << std::endl; // 输出 1，而不是 2
```

尽管多了一个`wp`指向同一个`int`，但引用计数不会增加

### 二、如何访问`weak_ptr`指向的对象

`weak_ptr` 没有 `operator*` 和 `operator->`，不能直接访问对象。因为对象可能已经被释放了，直接访问不安全。

要访问对象，必须调用 `lock()`：

```C++
std::shared_ptr<int> sp = std::make_shared<int>(10);
std::weak_ptr<int> wp = sp;

if (std::shared_ptr<int> locked = wp.lock()) {
    // 对象仍然存在，locked 是一个有效的 shared_ptr
    std::cout << *locked << std::endl;  // 输出 10
} else {
    // 对象已经被释放
    std::cout << "对象已销毁\n";
}
```

`lock()` 的行为：

1. 如果对象还存在，返回一个指向该对象的 `shared_ptr`，引用计数加一；
2. 如果对象已经被释放，返回一个空的 `shared_ptr`。

这样可以安全地访问对象：只要 `lock()` 成功，就保证在 `locked` 的生命周期内对象不会被销毁。

### 三、解决循环引用

上文中提到，`shared_ptr`循环引用就是通过`weak_ptr`来解决的，下面来看具体怎么解决

```C++
class A {
public:
    std::shared_ptr<B> Bob;
};

class B {
public:
    std::weak_ptr<A> Alice; //改为weak_ptr
};

int main() {
    std::shared_ptr<A> a = std::make_shared<A>(); 
    std::shared_ptr<B> b = std::make_shared<B>();
    
    (*a).Bob = b; 
    (*b).Alice = a; 
}
// b->a 是 weak_ptr，不增加 a 的引用计数
```

下面按行拆解一下流程：

```C++
std::shared_ptr<A> a = std::make_shared<A>(); 
//创建指针对象a，指着A类空间，内部有一个指向B类的Bob指针对象
//这时这个A类空间被强引用一次
std::shared_ptr<A> b = std::make_shared<B>(); 
//创建指针对象b，指着B类空间，内部有一个指向A类的Alice指针对象
//同理，B类空间被强引用一次
```

这时AB两个类的空间都被强引用一次，计数都+1

```C++
(*a).Bob = b; 
```

这里b被拷贝赋值给A对象内的Bob，让Bob也指向b所指的B类空间，由于Bob是`shared_ptr`，所以B类空间的强引用计数加一，现在变为2。

```C++
(*b).Alice = a; 
```

这里a被赋值给B对象内的Alice，建立弱引用，让Alice也指向a所指的A类空间，但`weak_ptr`不会增加强引用计数，只会使弱引用计数+1。

总计数：

| 对象   | 强引用计数 | 弱引用计数 | 谁在引用                  |
| ------ | ---------- | ---------- | ------------------------- |
| A 对象 | 1          | **1**      | 强：`a`；弱：`(*b).Alice` |
| B 对象 | 2          | 0          | `b`、`(*a).Bob`           |
---

在离开作用域时，a和b都会销毁。实际销毁顺序和构造顺序相反

- **第一步**：`b` 销毁

  `b` 指向的是`shared_ptr<B>`，销毁时 B类 的强引用计数减 1；

  B类对象还没释放，因为 A 的成员 `Bob` 还强引用着它。

- **第二步**：`a` 销毁

  `a` 指向的是 `shared_ptr<A>`，销毁时 A 的强引用计数减 1；

  此时A类对象强引用计数归零，A类 被析构；

  A 对象析构后，A 的控制块还活着，因为 `(*b).Alice` 这个 `weak_ptr` 还在观察 A；

  这时指向 B类的Bob也消失，B类对象强引用计数归零，B类 被析构，同时控制块被释放；

  指向A的Alice被释放，A类弱引用归零，控制块释放；

这样在弱引入的加入下，两个类对象都成功析构。

### 四、其他常见操作

```C++
std::shared_ptr<int> sp = std::make_shared<int>(10);
std::weak_ptr<int> wp = sp;

wp.expired();    // 判断对象是否已经被释放，等价于 use_count() == 0
wp.use_count();  // 返回共享该对象的 shared_ptr 数量
wp.reset();      // 让 wp 不再指向任何对象
```

注意：

- `expired()` 在多线程环境下不可靠，因为对象可能在 `expired()` 返回后立刻被释放；

- 要安全访问对象，始终应该用 `lock()`。

- reset()里面不能加参数，想要重新指向直接使用赋值，例如

  ```C++
  std::shared_ptr<int> sp1 = std::make_shared<int>(10);
  std::shared_ptr<int> sp2 = std::make_shared<int>(20);

  std::weak_ptr<int> wp = sp1;   // wp 观察 sp1 的对象
  wp = sp2;                      // 重新观察 sp2 的对象
  ```

### 五、使用场景

1.**打破 `shared_ptr` 循环引用**；
2.**观察对象，但不延长其生命周期**，比如缓存、观察者模式；
3.**避免悬空指针**：虽然 `weak_ptr` 不能直接访问，但可以通过 `lock()` 安全判断对象是否还存在。

# 智能指针的选择原则与转换






























