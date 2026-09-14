---
title: C++学习笔记1
date: 2026-09-14
summary: 第一篇学习笔记，包含C++面向对象的一些概念，如：封装、继承、多态，以及引申出的各种“虚”：虚函数，虚析构函数，虚函数表，虚指针等。
tags:
  - C++
  - 数据结构
  - 算法
  - 学习
series: C++ 
order: 2
---

# C++面向对象之封装

首先是封装，封装就是把**数据**和操控数据的**函数（function）放进同一个**类（class）**里，通过**权限控制决定外部访问或使用数据的方式。

C++中类的权限控制，主要是通过public,protected,private来控制的

比如

```c++
class Dog {
private:
    int food;
public:
    Dog(int amount) : food(amount) {} //创建类时必须进行的初始化，这里是给狗的食物确定一个初始值。
    //当然不写就不用初始化了，这里只是为了展示用法
    int age;
    int amountOfDog() {
        return food;
    }
};

int main()
{
    Dog dog(10); //给食物初始化为10
    std::cout << dog.amountOfDog(); //输出10
	//不能使用std::cout << dog.food；因为food是私有的   （护食？发来！）
    
    dog.age = 4; //可以，因为age是public属性，
}
```

对于protected，这和后续继承有关，将在对应部分讲解

> 对于上文中提到的初始化步骤，也许有时候会显得多余，这是因为我们把"food"设为了可变变量，如果我们用const把某个变量量设为常量
>
> ```c++
> const bool gender; //一个人的性别在创建时固定，bool仅声明类型
> ```
>
> 那么除了在初始化时可以设定值以外，其余时间都不能更改其值，这种叫做**const成员变量**
>
> 还有一种东西叫做**const成员函数**，使用方法是
>
> ```c++
> //返回类型 函数名() const{函数体}
> void Carry(Dog& other) const{ //引入其他成员
>     //food--;		//错误！在这种函数中不能修改对象的成员变量
>     other.food--;	//只要不是该对象的成员变量就可以修改，同类也可以
>     //这小狗精得很，只吃别人的不吃自己的
> }
> ```
>
> 还有另外两种情况也必须初始化：1.引用成员 2.没有默认构造函数的类类型成员（成员是另一个类）

# C++面向对象之继承

继承的核心是一个类可以继承另一个类的成员，从而复用代码，并且建立 **界门纲目科属种** 的概念。

比如

- `Animal`是一个基类/父类
- `Dog`是Animal的一种，所以`Dog`可以继承`Animal`
- `Dog`自动拥有`Animal`里定义的成员变量和成员函数。

语法：

```c++
class 子类 : 继承方式 基类{
   新增的成员 
}；
```

其中继承方式也有三种：public，protected，private。用的最多的是public和private。

```C++
class Animal{
public:
    void eat(){
        std::cout << "eating...\n";
    }
};

class Dog : public Animal{
public:
    void speak(){
        std::out << "bark!\n";
    }
};
```

等效于写

```C++
class Dog{
public:
    void eat(){/*大狗吃*/}
    void speak(){/*大狗叫*/}
}
```

但是通过继承，可以少写很多代码，因为Animal除了Dog，还可以有Cat，Mouse等等，每个子类可以从基类（也可以叫父类）继承成员变量与函数函数

## 权限控制

说回三种继承方法，继承方法会影响继承后子类的**权限控制**，这里与封装的知识点关联

众所周知，类在封装时会给予成员变量与成员函数不同的访问权限

- `public`：允许内部和外部**直接**访问变量或函数
- `private`：允许内部直接访问变量或函数，但外部想要访问必须通过公开函数访问。这个权限的成员无论通过何种方式被子类继承，都不能在子类内部访问。**特殊说明**：能够使用private成员的public函数被公开继承下去时，则可以按函数规定的方法使用
- `protected`：允许内部直接访问变量或函数，外部想要访问必须通过公开的函数访问。当这个权限的成员被**不降级地**继承时，子类也可以直接在内部访问；在派生类内部访问基类的 protected 成员时，对象必须是 本派生类（或其派生类）类型 ，用基类引用/指针会被拒，虚函数正常生效。
- `友元：（待补充）`

继承方式就相当于**统一更改**继承过来的成员的访问权限，具体来说是漏斗收缩式更改

- 如果继承方法是`public`，则完全不会修改，父类是什么权限子类就是什么权限
- 如果继承方法是`protected`，则原本的`public`权限在子类会变为`protected`,其余不变
- 如果继承方法是`private`，则继承过来的全部父类成员的权限会改为`private`

用一个实例解释不同的权限

```C++
class Animal {
public:
    void eat() {}
protected:
    void sleep() {}
};
//1.protected继承
class Dog : protected Animal {
public:
    void dogDo() {
        eat();    // 可以，Dog 内部能用
        sleep();  // 可以
    }
};

// Dog 的子类
class TinyDog : public Dog {
public:
    void tinyDo() {
        eat();    // 可以！因为 Dog 是 protected 继承，eat 在 Dog 里是 protected
        sleep();  // 可以！
    }
};
```

```C++
// 2. private 继承
class Cat : private Animal {
public:
    void catDo() {
        eat();    // 可以，Cat 内部能用
        sleep();  // 可以
    }
};

// Cat 的子类
class TinyCat : public Cat {
public:
    void tinyDo() {
        // eat();    // 错误！private 继承后，eat 在 Cat 里是 private
        // sleep();  // 错误！TinyCat 不能访问 Cat 的 private 成员
    }
};
```

# C++面向对象之多态

多态的意思是：同一个函数调用，根据对象的实际类型，执行不同版本的函数。

运行时多态通常需要三个条件：

- 有继承关系
- 基类中把某个函数声明为`virtual`（虚函数）
- 通过**基类指针或引用**调用这个函数

> 这看着确实抽象，下面结合实例来看

```C++
class Animal {
public:
    virtual void speak() { //声明这是一个虚函数
        std::cout << "动物叫\n";
    }
};

class Dog : public Animal {
public:
    void speak() override { //override意为告诉编译器，这是重写的虚函数
        std::cout << "汪汪\n";
    }
};

class Cat : public Animal {
public:
    void speak() override { //同理
        std::cout << "喵喵\n";
    }
};

int main() {
    Dog d;
    Cat c;

    Animal* p1 = &d;
    Animal* p2 = &c;//p1、p2是类型为Animal的指针，是Dog和Cat的基类，也就是基类指针

    p1->speak();    // 输出：汪汪
    p2->speak();    // 输出：喵喵
}
```

这里有一个新概念：虚函数，下面详细讲一下虚函数，了解虚函数后就了解多态了。

## 虚函数

虚函数就是在类里用`virtual`关键字声明的成员函数。
