---
title: C++:构造、拷贝构造
date: 2026-09-16
summary: C++面向对象之构造，拷贝构造。
tags:
  - C++
  - 数据结构
  - 算法
  - 学习
series: C++ 
order: 4
---

# 类的六个默认成员函数

众所周知，定义一个类一般包含以下几个部分

```C++
class Name : public FatherClass{
    public:
    	//成员，函数
    private:
    	//...
    protected:
    	//...
};
```

实际上，定义一个类的时候也可以什么都不包含，如

```C++
class EmptyClass {};
```

这种什么成员都没有的类，简称为空类，占1字节的空间。

这里面真的什么都没有吗？并非如此。任何类，在什么都不写时，编译器会自动生成以下6个默认成员函数。

> 默认成员函数指的是用户**没有显式实现**，编译器会**自动生成的成员函数**称为**默认成员函数**。

## 1.初始化和清理

- 构造函数：主要完成初始化工作
- 析构函数：主要完成清理工作

## 2.拷贝和复制

- 拷贝构造：使用同类对象初始化创建对象
- 赋值重载：主要是把一个对象赋值给另一个对象

## 3.取地址和重载

- 主要针对普通对象和const对象取地址，这两个很少会自己实现



# 构造函数

构造函数这个概念其实在[学习笔记1](https://qlin07.github.io/BlogSys/posts/note1/))当中就已经提及，当时的写法是

```C++
class Dog {
private:
    int food;
public:
    Dog(int amount) : food(amount) {} 
};
```

构造函数是一个**特殊的成员函数**，**函数名和类名相同**，创建类类型对象时又编译器**自动调用**，以保证每个数据成员都有一个合法的初始值，并且在对象整个生命周期内**只调用一次**。不需要返回值

## 构造函数特点

- 函数名与类名相同
- 无返回值，无返回类型（所以不能画蛇添足在前面写一个void）
- 对象实例化时编译器自动调用对应的构造函数。
- 构造函数可以重载

构造函数分为有参和无参

```C++
class Dog {
private:
    int food;
public:
    Dog(int amount) : food(amount) {
        std::cout<< "i have "<<food<<"foods!\n";
        std::cout<< "happy\n" ;
    } 
    Dog(){
        std::cout<< "sad\n";
    }
};

int main(){
    Dog dog1;
    Dog dog2(10);
}
```

在Dog类中，两个构造函数构成函数重载。在对象实例化的时候，自动调用对应构造函数，在Dog类中，我们使用了构造函数来初始化对象，但是注意在调用无参构造函数时不加()。

## 随机的初始化

刚才我们说，构造函数是默认的成员函数，编译器一定会调用，可我要是没写，会发生什么呢？

```C++
class Student
{
private:
	char name[20];
	int age;
	char ID[20];
public:
	void Print()
	{
		std::cout << "name is：" << name << std::endl;
		std::cout << "age is：" << age << std::endl;
		std::cout << "ID is：" << ID << std::endl;
	}
};

int main(){
    Student stu1;
    stu1.Print();
}
```

运行程序，不出意外地话会在变量位置输出一大段乱码。

不是说会初始化吗，为什么会这样呢？

实际上， C++把类型分为**内置类型（基本类型）**和**自定义类型**。内置类型就是语言自己提供地数据类型，比如int,char,float...之类的，自定义类型就是我们使用class/struct等自己定义的类型。**默认生成的构造函数，对于内置类型不做处理，自定义类型会去调用它的默认构造函数**

例如

```C++
class Dog{
private:
    int food = 3; //C++11及以后可以在声明时提供默认值
public:
    P(){
        std::cout << "Dog steup!";
    }
}
class Host{
private:
	int dogs;
public:
    void count(){
        std::cout<<"i have "<< dogs <<"dogs\n";
    }
Dog dog; //对自定义类型调用对应的默认构造函数
}
```

# 拷贝构造

拷贝构造函数是一个特殊的构造函数，功能是用一个已经存在的对象去初始化一个新对象。

语法：

```C++
类名(const 类名& other)
```

例如：

```C++
class A {
    int x;
public:
    A(int v) : x(v) {}          // 普通构造函数

    A(const A& other) : x(other.x) {   // 拷贝构造函数
        std::cout << "拷贝构造被调用\n";
    }
};
```

调用：

```C++
A a(10);     // 调用普通构造
A b(a);      // 调用拷贝构造，用 a 初始化 b
A c = a;     // 也是拷贝构造，不是赋值
```

具体是在以下情况中调用

- 用一个对象初始化另一个对象

- 对象按值传参

```C++
  void f(A obj) {}
  f(a);   // 调用拷贝构造
```

- 函数按值返回对象（可能被优化，但语义上可能调用拷贝函数）

---

如果不自己写拷贝函数，编译器就会自动生成一个默认的。默认拷贝构造会逐个成员复制，也就是把每个成员变量的值复制过去。

对于简单的成员(比如int,double)来说，没有问题。但如果成员里有指针，默认拷贝构造就只会**复制指针地址**，**不复制指针指向的内容**，这就会引出后面的“浅拷贝 / 深拷贝”问题。

## 浅拷贝

浅拷贝就是默认拷贝构造，先来看一个例子

```C++
class MyString {
private:
    char* data;
public:
    MyString(const char* s) { //注意，这里是构造函数。
        data = new char[strlen(s) + 1];
        strcpy(data, s);
    }

    ~MyString() { //析构函数
        delete[] data;
    }
};
```

这个类没有自己写拷贝构造函数，所以编译器会生成一个默认的。

默认拷贝构造会逐个成员复制。对于指针成员`data`，它只复制指针的值，也就是地址。

```C++
MyString a("hello");
MyString b(a);   // 默认拷贝构造
```

那么现状就变成了`a.data` 和 `b.data` 指向**同一块内存**

这就是浅拷贝：只复制指针地址，不复制指针指向的内容。

### 两个问题

问题1：修改一个，影响另一个

```C++
b.data[0] = 'H';
// a.data 指向的内容也变了，因为它们是同一块内存
```

问题2：析构时 double free

```C++
// a 和 b 离开作用域
// a 析构：delete[] data;
// b 析构：delete[] data;  // 同一块内存被 delete 两次，程序崩溃
```

## 深拷贝

为了解决以上两个问题，必须自己写拷贝构造函数，为指针成员分配新内存，并复制内容：

```C++
MyString(const MyString& other) { //手写拷贝构造
    data = new char[strlen(other.data) + 1];
    strcpy(data, other.data);
}
```

这里就是先为data分配了内存，然后使用`strcpy()`赋值

```C++
MyString a("hello");
MyString b(a);
```

现在a.data和b.data指向不同的内存，但内容相同了，可以随意修改，不会相互影响。