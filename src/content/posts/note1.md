---
title: C++学习笔记1
date: 2026-09-14
summary: C++面向对象的一些概念，如：封装、继承，详细阐述了权限控制的异同，友元，以及继承方法的异同
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
    Dog(int amount) : food(amount) {} //创建对象时必须进行的初始化，这里是给狗的食物确定一个初始值。
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

对于protected，这和继承有关，将在下面讲解

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

通过继承，可以少写很多代码，因为Animal除了Dog，还可以有Cat，Mouse等等，每个子类可以从基类（也可以叫父类）继承成员变量与函数函数

## 权限控制

回到三种继承方法，继承方法会影响继承后子类的**权限控制**，这里与封装的知识点关联

众所周知，类在封装时会给予成员变量与成员函数不同的访问权限

- `public`：允许内部和外部**直接**访问变量或函数
- `private`：允许内部直接访问变量或函数，但外部想要访问必须通过公开函数访问。这个权限的成员无论通过何种方式被子类继承，都不能在子类内部访问。**特殊说明**：能够使用private成员的public函数被公开继承下去时，则可以按函数规定的方法使用
- `protected`：允许内部直接访问变量或函数，外部想要访问必须通过公开的函数访问。当这个权限的成员被**不降级地**继承时，子类永远可以直接在内部访问；在派生类内部访问基类的 protected 成员时，对象必须是 本派生类（或其派生类）类型 ，用基类引用/指针会被拒，虚函数正常生效。

### 友元（friend）

友元（friends）是一种在类中使用的特殊声明关键字，**三种访问权限**对友元来说**都一样**，所以可以在类的内部任意地方声明友元。

```C++
class Homi{
    public: friend class FriendA;
    protected: friend class FriendB;
    private: friend class FriendC;
};
```

在类里被声明的**友元类**或**友元函数**只能**单向**使用类里的**所有**函数与成员，拥有的**权限和类相同**，类不能使用的友元也不能使用

```C++
class Base{
    private:
    	int a=1;
    protected:
    	int b=2;
};

class Derived : public Base{
    private: int c = 3;
    protected: int d = 4;
    friend void addNum(Derived& num){
        //num.a ++;    //错误，a是Base的private成员，Derived不能访问，所以Derived友元函数也不能访问
        num.b++;
        num.c++;
        num.d++;       //b,c,d都可以，因为Derived有访问权限
    }
};
```

**友元本身无法被传递**，也不能访问派生类新增的成员。

```C++
class A {
    friend class B;          // 只授权 B
private: int x = 1;
};
class B {
    friend class C;          // 只授权 C
private: int y = 2;
    void useA(A& a) { a.x = 10; }    //  B是A的友元
};
class C {
    void test(A& a, B& b) {
        b.y = 2;             //  C 是 B 的友元
        // a.x = 1;          //  错误！友元不传递：C不是A的友元
    }
};
```

这里展示一些用法

```C++
#include <iostream>

class Base {
public : 
	int a = 1; 
	void Number() {  //公开的方法
		std::cout << a;
		std::cout << b;
	}
private :
	int b = 1;
	friend void printNum(Base& Num) {//声明友元函数可以直接调用类的所有成员
		std::cout << Num.a + Num.b;
		std::cout << Num.b;
	}
    /*
    friend void printNum() { 
		std::cout << a + b;
		std::cout << b;
	}
	*/
    //这是不行的，友元函数本质还是外部函数，不能直接访问类的成员
friend class Friend; //声明友元类
};

class Friend {
public:
	void showNum(Base& Num) {
		std::cout << Num.a;
		std::cout << Num.b; //正确，友元可以访问
	}
};

class NotFriend {
public:
	void showMeNum(Base& Num) {
		std::cout << Num.a;
		std::cout << Num.b; //错误！非友元无法访问
	}
 };

int main() {
	Base base;
	base.Number();
	printNum(base);
}
```



## 继承方法

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

## 静态成员的继承

语法

```C++
class Base {
private:
    static int value;  //创建静态成员变量
public:
    static int getValue() { //创建静态成员函数
        return value;
    }
};

int Base::value = 10; //必须在全局数据区声明，否则不能使用

int main() {
    Base num;
    int v = Base::getValue();
    std::cout << v << "\n" << num.getValue();
}
```

- 静态成员变量**属于整个类所有**
- 静态成员变量的**生命期不依赖于任何对象，为程序的生命周期**
- 可以**通过类名直接访问**公有静态成员变量
- **所有对象共享类的静态成员变量**
- 可以**通过对象名访问**公有静态成员变量
- 静态成员变量**需要在类外单独分配空间**
- 静态成员变量在程序内部**位于全局数据区 (Type className::VarName = value)**



> 多态在note2讲解















