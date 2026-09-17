---
title: C++学习笔记3
date: 2026-09-16
summary: C++面向对象的一些概念构造，析构，拷贝构造。
tags:
  - C++
  - 数据结构
  - 算法
  - 学习
series: C++ 
order: 3
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



































