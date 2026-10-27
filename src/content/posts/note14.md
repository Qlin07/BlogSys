---
title: C#:接口与抽象类
date: 2026-10-14
summary: 抽象类与接口的定位差异，含字段、override规则与单继承多实现，并剖析默认接口方法下的菱形继承最具体实现问题
tags:
  - C#
  - 接口
  - 抽象类
  - 学习
series: C#
order: 15
---

# 抽象的意义

依旧拿动物园举例子。假如不用抽象类，要用代码实现一只动物，会这样实现

```C#
public class Dog{
    public string Name;
    public Dog(string name) => Name = name;
    public void Bark(){
        Console.WriteLine("{0}: Woof!",Name);
    }
    public void Wagtail(){
        // some action ...
    }
}

public class Cat{
    public string Name;
    public Cat(string name) => Name = name;
    public void Meow(){
        Console.WriteLine("{0}: Meow meow ~",Name);
    }
    public void Stretch(){
        // some different action ...
    }
}
```

可以看到，每创建一个动物的类都要从头到尾全部定义一遍名字，叫声和特色行为。但很明显两个类有很多共同之处，比如名字，比如“叫”这个行为。

那么很容易想到的解决方法就是用一个类记录这些共同之处，在具体实现的时候只需要实现特色技能就行，这就是抽象。接口与抽象类在C#中都属于抽象类型，下面先讲抽象类。

# 抽象类

## 一、定义与两条基本规则

抽象类是指用`abstract`修饰的、不能被实例化的类。

```C# 
public abstract class Shape
{
    public abstract double Area();   // 抽象成员：只有签名，没有实现
}
// Shape s = new Shape();   // 编译错误：无法创建抽象类的实例
```

两条基本规则：

- 不能被创建（在编译期就会被阻止）
- 抽象成员只能出现在抽象类中——普通类里不允许声明`abstract`方法

## 二、抽象类里可以有什么

1. 抽象方法 / 抽象属性 ：只给签名，子类必须`override`实现
2. 普通方法（已实现）：子类可以直接继承使用，无需重写
3. 虚方法（virtual）：已实现，子类可自选是否override。
4. 字段（状态）：抽象类可以保存数据，这是与接口最大的区别
5. 构造函数：虽然抽象类不能new，但是子类构造时会通过`base(...)`调用它
6. 访问修饰符：public / protected / internal / private
7. 静态成员、常量
8. 接口实现：抽象类可以实现接口，甚至可以把接口方法留成抽象方法交给子类

其中**可以有字段（状态）**是抽象类与接口最本质的差异；此外抽象类还可以写已实现的普通方法

## 三、抽象方法对比虚方法

虚方法已有默认实现，子类可根据需要重写；而抽象方法没有实现，子类必须重写，除非子类也是抽象类

```C# 
public abstract class Animal
{
    public string Name { get; }
    protected Animal(string name) => Name = name;

    public abstract string MakeSound(); // 抽象方法

    public virtual string Describe() // 虚方法
    {
        return $"{Name} 发出 {MakeSound()} 的声音";
    }
    
    public void Sleep() => Console.WriteLine($"{Name} 正在睡觉"); // 普通方法
}

public class Dog : Animal
{
    public Dog(string name) : base(name) { } //调用基类构造函数
    
    public override string MakeSound() => "汪汪"; // 实现抽象方法
    
    //没有动虚方法，所以使用原本实现
}

public class Cat : Animal
{
    public Cat(string name) : base(name) { } //调用基类构造函数
    
    public override string MakeSound() => "喵喵"; // 实现抽象方法
    
    public override string Describe() => $"{Name}（高冷的猫）：喵"; // 改写基类的虚方法
}
```

从以上可以看出，派生类继承抽象类后，有以下要求：

- 必须实现所有抽象成员，除非派生类自己也是抽象类
- 实现抽象成员时，必须用`override`关键字，重写虚函数也一样。

## 四、典型用法

抽象类最经典的价值场景，是“流程固定、细节可变”的场景

```C#
public abstract class DataImporter
{
    // 固定流程（模板方法），子类不需要、也不该改这段
    public void Import(string path)
    {
        var raw  = Read(path);
        var data = Parse(raw);
        Store(data);          
    }

    //下面的具体实现交给子类。不用看懂是什么意思，了解思想就行
    protected abstract string Read(string path);
    protected abstract IEnumerable<Record> Parse(string raw);
    protected abstract void Store(IEnumerable<Record> data);
}
```

这里体现了抽象类的独特优势：把"不变的公共流程"写死在基类，把"变化的细节"留给子类——子类只填三个坑，就得到了完整的导入能力。

## 五、单继承

和C++允许多继承不同，C#的类只能单继承，单继承就没有所谓菱形继承的问题

# 接口

## 一、定位

接口是一组“对外契约的合集”：只规定有哪些成员，签名是什么。传统上不提供实现；C# 8 起可以有默认实现；但始终不携带实例状态。

```C#
public interface ILogger{
    void Log(string message);
}
```

注意：接口不能被new，但是可以作为变量类型、参数类型、返回类型使用

```C#
public void Process(ILogger logger) => logger.Log("start");
```

## 二、接口能包含什么

C# 8之前，接口只能包含四种成员的声明，分别是：

- 方法：如`void Log(string);`
- 属性：如`string Name {get;}`
- 事件：如`event EventHandler Changed;`
- 索引器：如`string this[int i] {get;}`

不能包含实例字段，不能包含构造函数

## 三、三条规则

规则1：实现接口不用override

```C#
public interface ILogger { 
    void Log(string s); 
}

public class ConsoleLogger : ILogger
{
    public void Log(string s) => Console.WriteLine(s);   //不加 override
}
```
```C#
public abstract class Base { 
    public abstract void M(); 
}

public class Derived : Base
{
    public override void M() { }    // 抽象类必须加 override
}
```

规则2：按接口实现的方法必须用public

```C#
public class ConsoleLogger : ILogger
{
	//void Log(string s) { /*...*/ } // 不声明默认是private
	public void Log(string s) { /*...*/} // 这样才对
}
```

规则3：一个类可以实现多个接口

这弥补了单继承的限制

```C#
public interface ICamera     { void TakePhoto(); }
public interface IMusicPlayer{ void Play(); }

public class SmartPhone : ICamera, IMusicPlayer   // 同时满足两个接口
{
    public void TakePhoto() { }
    public void Play()      { }
}
```

对比一下：

- 类继承 ：只能一个父类（`class Dog : Animal` ）；
- 接口实现 ：可以有任意多个（`class Phone : ICamera, IMusicPlayer` ）。

这也是接口被描述为 "can-do" 而抽象类被描述为 "is-a" 的原因。

## 四、接口自身可以继承接口

接口之间可以继承，且允许继承多个

```C#
public interface IReadable  { int Read(); }
public interface IWritable  { void Write(int v); }

public interface IStream : IReadable, IWritable   // 接口多继承
{
    void Flush();
}
```



如果这里发生了菱形继承怎么办？不要担心，这一点会在后续讲解。

## 五、显式接口实现

当一个类实现的两个接口有同名成员时，可以做显式实现来消除歧义：

```C#
public interface IA { void M(); }
public interface IB { void M(); }

public class C : IA, IB
{
    void IA.M() => Console.WriteLine("这是 IA.M");   // 显式实现
    void IB.M() => Console.WriteLine("这是 IB.M");
}
```

显式实现的两个特点：

- 不能写访问修饰符 （写`public` 会报错）；

- 只能通过接口类型调用 ，不能通过类类型调用：

  ```C#
  var c = new C();
  // c.M();               // 找不到 M
  ((IA)c).M();            // 走 IA 的实现
  ((IB)c).M();            // 走 IB 的实现
  ```

## 六、访问修饰符

- 在C# 8之前：接口成员不能写访问修饰符，默认（且唯一）为`public`
- 从C# 8开始：接口可以写访问修饰符，还可以有带实现的默认成员。

## 七、菱形继承问题

C#的类没有菱形继承的问题，但由于接口可以多继承，所以接口可能有菱形继承的问题

```C#
public interface IBase { void M(); }

public interface IA : IBase { }
public interface IB : IBase { }
public interface IC : IA, IB { }     // ← 菱形出现了
```

### 在C# 8之前，菱形继承无害

这是因为C# 8之前，接口不能有实现、也没有实例状态，只是一堆成员声明的集合。所以在菱形继承中，即便有重复，在最后也会被“合并”到一个：

```C#
public class C : IC
{
    public void M() { }     // 一次实现，满足所有四个接口，无歧义
}
```

### 从C# 8开始，菱形继承有害

在C# 8引入默认接口方法后，接口可以有实体了，菱形继承这才有了两份实现不知道选哪个的问题。

```C#
public interface IBase { void M(); }
public interface IA : IBase { void IBase.M() => Console.WriteLine("IA.M"); }
public interface IB : IBase { void IBase.M() => Console.WriteLine("IB.M"); }
public interface IC : IA, IB { }

public class C : IC { }    // 报错CS8705：IA.M 与 IB.M 谁都不比谁更具体
```

这里的具体是指C#针对该情况给出的处理规则：**最具体实现规则**，原文是：

> 我们要求每个接口和类，对其每个虚成员，在"该类型 及其 直接或间接 接口中出现的**所有实现**"里，拥有一个**最具体**的实现。**最具体实现**是指**唯一一个**比其他所有实现都更具体的实现。若不存在任何实现，则该成员自身即被视为最具体的实现。
>
> 实现`M1`比实现`M2`更具体，当`M1`声明于类型`T1`、`M2`声明于类型`T2`，且满足：
>
> 1. `T1`的直接或间接接口包含`T2`；或
> 2. `T2`是接口类型，而`T1`不是接口类型。

把判断谁更具体的规则换成人话就是两个规则：

- 声明所在的类型，在接口继承链上“更靠下”（更派生）的，更具体
- 如果类里面实现了接口中的冲突，类则更具体

用官方例子说明：

```C#
interface IA { void M() { Console.WriteLine("IA.M"); } }
interface IB : IA { void IA.M() { Console.WriteLine("IB.M"); } }
interface IC : IA { void IA.M() { Console.WriteLine("IC.M"); } }

interface ID : IB, IC { }            // 接口自身不报错；CS8705 会落在实现它的类上
abstract class C : IB, IC { }        // error: 'IA.M' 没有最具体实现，因为IB，IC在继承链中同级。
abstract class D : IA, IB, IC        // ok：类里自己声明了 M，类中更具体。
{
    public abstract void M();
}
public class E : ID { }              // Error：'IA.M' 没有最具体实现
```

### 如何解决

所谓谜底就在谜面上，解决方法就是利用判断规则：

1. 让派生接口提供更具体的实现
2. 让类实现接口提供的成员

### 和C++对比

C++菱形继承问题面临的是数据层面和实现层面的问题：菱形继承中，共同的基类被复制了两次，会有以下问题

- 数据重复（数据层面）

- 成员二义性（数据层面）

- 虚函数冲突（实现层面问题，在这一点上C++解决思路和C#相同）

解决方法是：

- 虚继承（无法解决虚函数冲突）
- 标明作用域（治标不治本）
- 回避多继承（用组合替代，工程上最常见）

C#的菱形继承问题是实现层面的问题：同一个功能，实现太多了不知道用哪个。

# 接口对比抽象类

| 维度                 | 抽象类                 | 接口                             |
| :------------------- | ---------------------- | -------------------------------- |
| **语义定位**         | is-a                   | can-do                           |
| **能否实例化**       | 不能                   | 不能                             |
| **实例字段**         | 可以                   | 不能                             |
| **构造函数**         | 可以                   | 不能                             |
| **成员是否可带实现** | 抽象成员+具体成员混用  | C# 8后可以有默认实现，传统上不行 |
| **访问修饰符**       | 四种均可               | C# 8后均可，传统只能public       |
| **子类实现的关键字** | 抽象成员必须用override | 不用override                     |
| **数量限制**         | 单继承                 | 多继承                           |

## 最本质差异：是否拥有状态

这是两者分野的最本质根源，其他差异大多由此派生

- 抽象类可以有实例字段，能保存数据、能提供部分实现、能有构造函数去初始化数据
- 接口不能有实例化字段，只能要求别人有规定的实现