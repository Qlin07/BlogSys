---
title: C++移动语义
date: 2026-09-19
summary: 移动语义相关语法与使用方式，左引用右引用区别
tags:
  - C++
  - 面向对象
  - 学习
series: C++
order: 6
---



# 移动语义



## 一、为什么需要移动语义

在C++11之前，只有拷贝语义。当使用一个对象去初始化或者赋值另一个对象时，如果这个类管理了动态资源，就会发生**深拷贝**，例如

```C++
class IntArray {
    int* data;
    size_t size; //无符号整数类型
public:
    IntArray(size_t n) : data(new int[n]{}), size(n) {}
	//构造函数
    IntArray(const IntArray& other)
        : data(new int[other.size]), size(other.size) {
        std::copy(other.data, other.data + other.size, data);
    }//拷贝构造

    ~IntArray() { delete[] data; }//析构函数
};
```

假如现在有这样的代码

```C++
IntArray makeArray(){
    IntArray temp(1000000); //一下生成1000000万个数据
    //填充一些数据；
    return temp;
}

int main(){
    IntArray a = makeArray();
}
```

在C++11以前，`makeArray()`返回时，`temp`是个局部变量，即将被销毁。但是为了把它的值交给`a`，编译器就会调用拷贝构造函数，把`temp`中那100万个申请好的内存和存好的值重新申请复制一遍，然后再将`temp`析构释放。这显然非常浪费，解决方法就是：反正你手上的数据也不要，并且马上就会被销毁，那为什么不干脆直接给我呢？移动语义就是为了解决这个问题。

**核心思想**：

当一个对象是**临时对象**（即将销毁的右值）时，我们不需要深拷贝它的资源，而是可以直接转移它的资源所有权，比如把temp.data这个指针直接赋予给新对象，然后把他置空为`nullptr`，这样`temp`析构时就不会释放那块内存，然后新对象也能接管它。

用移动构造函数实现后：

```C++
IntArray(IntArray&& other) noexcept //移动构造，右值引用
    : data(other.data), size(other.size) {
    other.data = nullptr;
    other.size = 0;
}
```

这样，`IntArray a = makeArray();`就不会再复制100万个整数空间，而是只是转移一个指针，效率极高。

类似地，`std::vector`在扩容时、`push_back`临时对象时，也应该优先考虑移动语义而非拷贝语义。(STL)



## 二、右值与左值的基本区分

在上面的例子中出现了一个陌生的东西

```C++
IntArray(IntArray&& other) noexcept //&&意为右值引用
```

什么是右值？右值引用又是什么？有对应右值的左值吗？

为了理解移动语义，必须先分清两个概念：

- **左值**：有名字、有持久状态、通常可以取地址的表达式
- **右值**：临时产生的、通常没有名字、即将销毁的表达式

例如：

```C++
int a = 10; // a是左值，10是右值
int b = a;  // b是左值，a也是左值，
b = a + 10; // b 是左值，a + 10是右值
```

看出来什么了吗，在上面的代码中，`a`和`b`有名字，可以取地址`&a`或`&b`，所以`a`和`b`都是左值。但`a+10`只是一个临时结果，不能取地址，所以是右值

---

### 左值引用

左值引用就是最常见的引用：

```C++
int a = 10;
int& ref = a; //左值引用，绑定左值
```

普通左值引用`T&`只能绑定左值，但`const T&`是个例外，它可以绑定右值

```C++
const int& cref = 10;   // 允许，临时值生命周期被延长
```

这也是为什么拷贝构造通常写成

```C++
T(const T& other);
```

因为它既能接受左值，也能接受右值。

---

### 右值引用

C++11引入了右值引用，写法是`T&&`

```C++
int&& rref = 10;              // 右值引用，绑定右值
```

右值引用主要用于绑定临时对象，表示“这个对象可以被移动”。

例如

```C++
IntArray makeArray();
IntArray&& r = makeArray();   // 绑定临时返回对象
```

更常见的实在函数参数中：

```C++
void f(int& x) {
    std::cout << "左值引用版本\n";
}

void f(int&& x) {
    std::cout << "右值引用版本\n";
}

int main() {
    int a = 1;
    f(a);     // 调用 f(int&)
    f(10);    // 调用 f(int&&)
}
```

编译器会根据实参是左值还是右值，选择不同的重载版本。

---

**一个关键提醒**：右值引用变量本身是左值，这非常重要：

```C++
int&& rr = 10;
```

`rr`的类型是`int&&`，但它本身是一个具名变量，所以`rr`这个表达式是左值。

```C++
void g(int&& x);

int&& rr = 10;
g(rr);          // 错误：rr 是左值，不能绑定到 int&&
g(std::move(rr)); // 正确：std::move(rr) 把 rr 转成右值
```

也就是说：

- **类型**是右值引用
- **表达式本身**可能是左值。

这就是为什么后面有的地方需要`std::move()`。

---

### 和移动语义的关系

移动构造函数写成：

```C++
IntArray(IntArray&& other) noexcept; 
```

参数是右值引用，因此它只能绑定右值，比如临时对象。当编译器看到

```C++
IntArray a = makeArray();
```

右边是临时对象，属于右值，所以会优先选择移动构造，而不是拷贝构造。

## 三、将亡值与`std::move`的本质

在上面的讲解中，举了下面一个例子

```c++
IntArray makeArray() {
    IntArray temp(1000000);
    // ...
    return temp;
}

int main(){
    IntArray a = makeArray();
}
```

在 `makeArray` 内部，`temp` 是一个局部对象。平时使用 `temp` 时，它是左值。执行到 `return temp;` 这条语句时，`temp` 这个表达式被 C++ 特殊规定为**将亡值（`xvalue`）**，属于右值的一种，因此可以优先匹配移动构造，用来安全地转移 `temp` 的资源。这个右值性发生在 `return` 语句求值的时候，也就是还在函数内部执行返回操作时，而不是函数返回之后。函数返回之后，`temp` 已经析构或已被移空，不再存在。外面看到的是 `makeArray()` 函数调用表达式的结果，它是右值。

### 1.什么是“将亡值”？

C++11把右值细分为：

- **纯右值**：比如从字面上就能看出来的，一些常数`10`、一些表达式`a+b`。
- **将亡值**：英文是eXpiring value，简称xvalue。它表示一个对象即将销毁，它的资源可以被安全地"拿"走。

将亡值也是右值的一种，因此可以绑定到右值引用`T&&`。

典型的将亡值就是：`std::move(x)`的结果

### 2.`std::move()`的本质

`std::move`的本质只是一个类型转换，它不移动任何东西，不调用任何别的函数，也不会修改x，不会修改x的生命周期。虽然`std::move()`的结果是将亡值，但x不会变成将亡值。或者我抽风写一个`std::move(x);`啥也不干也行，x什么也不会变，不会提前结束生命周期。至于x被变成右值传入其他函数，x的命运就跟其他函数有关了，要是被吃干抹净啥也不剩的走出来，跟move也没关系，比如：

```C++
class IntArray{/*. . .*/}; //省略
IntArray x(100); //位于全局变量区，x.data指向100个int数组，x.size = 100;
int main(){
    IntArray b = std::move(x); // 将亡值触发移动构造，x.data被置空，x.size被置零
    // 被吃干抹净之后，x也会光着走到程序结束，所以move不会改变x的生命周期。
}
```

## 四、移动构造函数与移动赋值运算符的实现

移动语义最终要落地到两个特殊成员函数：

- 移动构造函数
- 移动赋值运算符

他们和拷贝版本对应，但是参数是右值引用，表示"源对象可以被掏空"。

类成员变量定义：

```C++
class IntArray{
    int* data;
    size_t size;
}；
```
语法对比：

```C++
class IntArray {
public:
    IntArray(size_t n) : data(new int[n] {}), size(n) {} //普通构造函数

    IntArray(IntArray&& other) noexcept : data(other.data), size(other.size) { //移动构造
        other.data = nullptr;
        other.size = 0;
    }

    IntArray(const IntArray& other) : data(nullptr), size(other.size) {  //拷贝构造
        if (other.size != 0) {
            data = new int[other.size];
            std::copy(other.data, other.data + size, data);
        }
    }



    IntArray& operator=(IntArray&& other) noexcept { //移动赋值
        if (this == &other) return *this; //处理自拷贝赋值

        delete[] data;         //释放当前对象旧资源

        data = other.data;    //赋值,继承源指针
        size = other.size;    //赋值

        other.data = nullptr; //置空
        other.size = 0;       //置零

        return *this;
    }

    IntArray& operator=(const IntArray& other) {     //拷贝赋值
        if (this == &other) return *this; //处理自拷贝赋值

        int* newdata = nullptr;  //申请新内存
        if (other.size != 0) {
            newdata = new int[other.size];
            std::copy(other.data, other.data + other.size, newdata);
        }
        delete[] data;     //释放旧内存
        data = newdata;    //接管新内存
        size = other.size; 

        return *this;
    }


    ~IntArray() {
        delete[] data;
    }
};
```

通过对比可以发现，拷贝和移动有一下几处不同

| 对比项     | 拷贝语义               | 移动语义                               |
| ---------- | ---------------------- | -------------------------------------- |
| 资源处理   | 复制一份新资源         | 转移已有资源                           |
| 源对象状态 | 保持不变               | 被掏空，变为有效但未指定状态           |
| 性能       | 通常较慢，可能深拷贝   | 通常很快，只转移指针/句柄              |
| 适用对象   | 左值，或没有移动操作时 | 右值，如临时对象、`std::move` 后的对象 |
| 异常安全   | 可能抛异常             | 通常声明 `noexcept`                    |

## 五、Rule of  five

在 C++11 之前，如果一个类需要自定义：

1. 析构函数
2. 拷贝构造函数
3. 拷贝赋值运算符

中的任意一个，通常意味着它管理了某种资源（如动态内存、文件句柄）。
那么这三个通常都需要一起自定义，否则默认的浅拷贝会导致重复释放、内存泄漏等问题。

例如 `IntArray` 管理 `int* data`，就必须同时写析构、拷贝构造、拷贝赋值。

C++11 引入移动语义后，三法则扩展为五法则。
除了上面三个，还需要考虑：

4. 移动构造函数
5. 移动赋值运算符


所以一个管理资源的类，典型形式是：

```C++
class IntArray {
public:
    IntArray(size_t n);
    ~IntArray();                          // 1. 析构
    IntArray(const IntArray& other);      // 2. 拷贝构造
    IntArray& operator=(const IntArray&); // 3. 拷贝赋值
    IntArray(IntArray&& other) noexcept;  // 4. 移动构造
    IntArray& operator=(IntArray&&) noexcept; // 5. 移动赋值
};
```

如果你只写了拷贝构造，编译器可能不会自动生成移动构造，导致移动退化为拷贝。
反过来，如果你写了移动构造，拷贝构造可能被删除，所以五个通常要成套考虑。






























































