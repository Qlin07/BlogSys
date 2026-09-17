---
title: C++学习笔记4
date: 2026-09-17
summary: C++面向对象的内存布局。
tags:
  - C++
  - 数据结构
  - 算法
  - 学习
series: C++ 
order: 5
---

# 类对象的内存布局

## 单继承下的对象内存布局

```C++
class Base {
public:
    int a;
    virtual void f() {
        std::cout << "Base::f\n";
    }
};

class Derived : public Base {
public:
    int b;
    void f() override {
        std::cout << "Derived::f\n";
    }
};
```

`Derived`继承`Base`，并且重写了`f()`。

---

Derived对象里面有什么？

- 一个`vptr` 
- Base子对象的数据：`int a`
- Derived自己的数据：`int b`
- 对齐填充

在64位系统上，大致布局是

```text
偏移 0:   vptr       (8 字节)
偏移 8:   int a      (4 字节，来自 Base)
偏移 12:  填充        (4 字节)
偏移 16:  int b      (4 字节，Derived 自己的)
偏移 20:  填充        (4 字节)
```

总大小可能是24字节。

---

### 关键点一

**在单继承的情况下，通常只有一个`vptr`**

虽然Base和Derived都有虚函数，但是Derived对象里通常只有一个`vptr`，这个`vptr`指向Derived的虚函数表，而不是Base的。

---

### 关键点二

**基类子对象在派生类对象里面**

你可以把 `Derived` 对象看成：

```text
[ Base 子对象 ][ Derived 自己的成员 ]
```

而 `Base` 子对象又包含：

```text
[ vptr ][ int a ]
```

所以整体就是：

```text
[ vptr ][ int a ][ int b ]
```

---

### 关键点三

**指针转换通常不调整地址**

```C++
Derived d;

Base* p1 = &d;      // p1指向 d 的开头
Derived* p2 = &d;   // p2也指向 d 的开头
```

在单继承下，`Base*` 和 `Derived*` 通常指向同一个地址。
因为 `Base` 子对象就在 `Derived` 对象的开头。

## 简单多重继承下的内存对象布局

```C++
class Base1 {
public:
    int a;
    virtual void f1() {}
};

class Base2 {
public:
    int b;
    virtual void f2() {}
};

class Derived : public Base1, public Base2 {
public:
    int c;
    void f1(){}
    void f2(){}
};
```

这里Derived同时继承了Base1和Base2

---

因为Base1和Base2都包含虚函数，所以他们各自带一个`vptr`。

在64位系统上，布局可能类似

```text
偏移 0:    Base1 的 vptr      (8 字节)
偏移 8:    int a              (4 字节)
偏移 12:   填充               (4 字节)
偏移 16:   Base2 的 vptr      (8 字节)
偏移 24:   int b              (4 字节)
偏移 28:   填充               (4 字节)
偏移 32:   int c              (4 字节)
偏移 36:   填充               (4 字节)
```

所以多重继承下，对象里可能有多个`vptr`，每个多态基类子对象一个。

这时候指针转换的地址就不一样了

```C++
Derived d;

Base1* p1 = &d;   // p1 指向 Derived 对象开头
Base2* p2 = &d;   // p2 偏移到 Base2 子对象的位置
```

因为Base2子对象不在对象开头，所以从`Derived*` 转成`Base2*`时，编译器就会给指针加上一个偏移量。

---

## 菱形继承下的对象内存布局

先看一个示例

```C++
class Animal {
public:
	virtual void WhoAmI() {
		std::cout << "I am Animal";
	}
};

class Dog : public Animal {
public:
	void WhoAmI() {
		std::cout << "I am Dog";
	}
};

class Cat : public Animal {
public:
	void WhoAmI() {
		std::cout << "I am Cat";
	}
};

class DogCat : public Dog, public Cat {};

int main() {
	DogCat DC;
	DC.WhoAmI();
}
```

这个代码会在编译期报错，下面来分析为什么。

首先他们之间的继承关系是菱形：

```text
      Animal
      /    \
    Dog    Cat
      \    /
      DogCat
```

内存布局如下

```text
DogCat DC 对象（64 位下典型布局）：

偏移 0：
+----------------------------+
| Dog 子对象                 |
|  +----------------------+  |
|  | Animal 子对象        |  |
|  | vptr -> Dog vtable   |  |  ---> Dog vtable:
|  +----------------------+  |       [WhoAmI] = &Dog::WhoAmI
+----------------------------+

偏移 8：
+----------------------------+
| Cat 子对象                 |
|  +----------------------+  |
|  | Animal 子对象        |  |
|  | vptr -> Cat vtable   |  |  ---> Cat vtable:
|  +----------------------+  |       [WhoAmI] = &Cat::WhoAmI
+----------------------------+
```

在调用`DC.WhoAmI()` 时，在编译期产生了**二义性**：`DogCat` 从 `Dog` 和 `Cat` 两个基类中都继承到了 `WhoAmI`，他们都有`WhoAmI`这个方法。当用户Call出`DC.WhoAmI()`，编译器不知道该调用哪个。

只能明确作用域，比如

```C++
DC.Dog::WhoAmI();  // 走 Dog 子对象，调用 Dog::WhoAmI
DC.Cat::WhoAmI();  // 走 Cat 子对象，调用 Cat::WhoAmI
```

但这太麻烦了，有没有只继承一次Animal的菱形继承？

## 虚继承下的对象内存布局

用 `virtual` 继承，让 `Dog` 和 `Cat` 共享同一份 `Animal`：

```C++
class Animal {
public:
	virtual void WhoAmI() {
		std::cout << "I am Animal";
	}
};

class Dog : virtual public Animal {
public:
	void WhoAmI() {
		std::cout << "I am Dog";
	}
};
class Cat : virtual public Animal {
public:
	void WhoAmI() {
		std::cout << "I am Cat";
	}
};

class DogCat : public Dog, public Cat {};

int main() {
	DogCat DC;
	DC.WhoAmI();
}
```

即便使用虚继承了，也还是不行。虚继承只能消除基类子对象重复的二义性问题，对于虚函数来说，都是一个`vptr`指向一个虚函数表，这里的虚函数表重复了！

```text
DogCat DC
+----------------------------+ 偏移 0
| Cat 子对象                 |
|  vptr -> Cat vtable        |  WhoAmI -> Cat::WhoAmI
|  vbptr -----------------+  |
+-------------------------|--+
| ...                     |  |
+-------------------------|--+ 偏移 X
| Dog 子对象（虚基类）      |  |
|  vptr -> Dog vtable     |  |  WhoAmI -> Dog::WhoAmI
|  vbptr -----------------+  |
+-------------------------|--+
| ...                     |  |
+-------------------------|--+ 偏移 Y
| Animal 子对象（共享） <--+   |
|  vptr -> Animal vtable     |
+----------------------------+
```

这是虚继承无法解决的问题，即函数名查找的二义性问题，只能通过明确作用域和重写`WhoAmI()`函数解决

---

仔细看的话，就会发现，在虚继承的对象内存布局中出现了一个新类型的指针：`vbptr`，叫做虚基类指针。

通过看图发现，两个`vbptr`都指向了共享的Animal子对象，但这只是为了直观理解，请不要认为`vbptr`是直接指向的共享子类对象。**实际上`vbptr`指向的是虚基类表**。

虚基类表里记录了“虚基类子对象**相对于**当前子对象的偏移量”，换成人话就是：存放共享Animal子对象的内存区离“我这里”的内存区有多远。

只要记录了这个偏移量，再加上Cat子对象或者Dog子对象的基准地址（也就是上文提到的“我这里”），这两个子类就能访问共享的Animal子对象了

> 基准地址一般不是子对象的开头，而是`vbptr`指针本身的位置