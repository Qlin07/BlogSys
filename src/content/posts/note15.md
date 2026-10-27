---
title: C#:委托，事件和Lambda
date: 2026-10-14
summary: 本文讲解了C#中较容易混淆的委托，事件和Lambda表达式的相关知识点
tags:
  - C#
  - 委托
  - 事件
  - Lambda表达式
  - 学习
series: C#
order: 16
---

> 委托是类型,事件是委托的封装用法,Lambda是创建委托实例的简写语法

# 委托

## 一、为什么需要委托

下面先来看一个例子

```C#
public void Sort(int[] data, string mode)
{
    if (mode == "asc")       { /* 升序逻辑 */ }
    else if (mode == "desc") { /* 降序逻辑 */ }
    else if (mode == "abs")  { /* 按绝对值逻辑 */ }
    // 每新增一种规则，就要回到这里改代码
}
```

在这个排序中，排序的模式取决于传入的mode字符串，这就会带来三个问题：

- 无法扩展：调用方法选的规则，完全由`Sort`的源码写死，新增规则必须改`Sort`
- 耦合：`Sort`和具体怎么比较混在一起
- 无法传一次性逻辑：调用方法临时想用一个只在此处用到的比较方式？做不到

解决方法就是利用委托

## 二、委托：把行为变成参数

```C#
public void Sort(int[] data, Comparison<int> compare)
{
    // 内部用 compare(x, y) 来比较任意两个元素
}

Sort(a, (x, y) => x - y);   				    	// 升序，Lambda写法

private static int Asc(int x,int y) => x - y;
Sort(a, Asc);                        				// 升序，具名方法

Sort(a, delegate (int x,int y) {return x - y;} );    // 升序，匿名方法
```

**对于以上代码，我们先看上半部分。**
可以看到，原本`mode`的位置被替换成了`Comparison<int> compare`，其中`Comparison<int>`是类型声明，官方声明是：

```C#
public delegate int Comparison < in T >( T x, T y );
```

其中

- `delegate`是关键字，表示这是一个委托类型，
- `int`是该委托的返回类型，
- `Comparison`是委托名，
- `<in T>`指**泛型参数上的逆变**（contravariance）标记（后面讲泛型变型时再展开）
- `(T x,T y)`表示该委托指向的方法的参数列表

所以`Comparison<int>`表达的是一个契约：接收两个`int`，返回一个`int`的方法。只要符合这个契约，就可以作为委托类型参数入参。

**然后是下半具体实现部分**
在实现部分有三种使用方法

**第一种：Lambda语法**

入参的是`(x, y) => x - y`**，这是Lambda语法。

- 其中`(x, y)`是参数列表，可以显式表示类型；如果没有类型，**由外部判断——即接收它那个位置的要求**。

- `=>`是Lambda运算符

- `x - y`是表达式主体，表达式就是返回值。
  如果是代码块（用`{}`包起来），则要显式return，例如

  ```C#
  (x, y) => {var r = x - y; return r;}
  ```

原式从效果上等价于这样一个方法：

```C#
int λ(int x, int y) { return x - y; }
```

**Lambda关键机制就是目标类型判断（Target typing）**

Lambda自己没有类型，它必须有一个**目标类型**——也就是接收它那个位置要求的类型。在例子中，接收位置是形参`Comparison<int>`，编译器据此反推参数`x`，`y`的类型该是`int`，返回类型也该是`int`，实际上也是，所以编译通过。

**第二种：具名方法**

具名方法就是传入一个函数名进去，这里不再赘述

**第三种：匿名方法**

官方定义： `delegate` 运算符创建一个匿名方法，它可以被转换成委托类型；它解决的是同一个痛点：为了传一段很小的逻辑，不必再在类里专门写一个具名方法。

语法为`delegate (参数) {实现}`

虽然匿名方法和Lambda表达式都被称为匿名函数，但两者还是有些许差别的

1. 匿名方法可以完全省略参数列表

   ```C#
   Action greet = delegate { Console.WriteLine("Hello!"); };
   Action<int, double> introduce = delegate { Console.WriteLine("This is world!"); };

   greet();            // 输出 Hello!
   introduce(42, 2.7); // 输出 This is world!
   ```


2. 匿名方法如果写了参数列表，则必须写类型

   ```C#
   Func<int, int, int> p = delegate (int a, int b) { return a + b; };
   ```



## 三、委托的声明

委托的声明是定义一个方法规格

```c#
public delegate int Calculator(int x, int y);
```

这一行的含义是：我声明了一个名为Calculator的委托类型，它能指向“参数为两个int，返回int的方法”

关键点在于——委托的声明描述的是“方法的签名”，`Calculator`不是一个方法，而是一个**类型**，它的实例里装的是“符合这个签名的方法引用”。

## 四、委托的层次

- 委托类型：比如刚才定义的Calculator，是一种类型，类似int，string

- 委托实例：用类型定义的实例，是一个变量，指向某个具体方法，比如

  ```C#
  public static int add(int a, int b) => a + b;
  Calculator f = new Calculator(add); 
  //Calculator f = new Calculator((a,b) => a + b) //用Lambda语法。

  int sum;
  sum = f(3,5); // sum = 8
  ```

## 五、类型安全

类型安全的函数指针体现在三个地方

1. 签名必须完全匹配

   ```C#
   public static int Add(int a, int b) => a + b;
   public static long AddL(long a, long b) => a + b;
   public static int AddOne(int a) => a + 1;

   Calculator f1 = new Calculator(Add); //正确，签名一致
   // Calculator f2 = new Calculator(AddL) //错误，参数与返回类型不符
   // Calculator f3 = new Calculator(AddOne) //错误，参数个数不符

   //Calculator的定义中必须是两个int进入一个int出
   ```

2. 调用时，参数类型检验

   ```C#
   f("a", 1); // string 不能转 int
   ```

3. 不能指向签名不符的方法，也不能指向属性或者字段

   它只能指向方法，不能指向一个字段或属性


## 六、创建委托的三种写法

```C#
Calculator a = new Calculator(Add);
Calculator b = Add;
Calculator c = (x, y) => x + y;
```

三种写法编译后生成的都是Calculator的实例

# 多播委托

## 一、什么是多播委托

委托实例内部不只是“指向一个方法”，还持有一个调用列表：一个按顺序排列的方法引用数组。当这个委托被调用时，列表里的所有方法会依次执行。这就是“多播”。例如：

```C#
Action d = A;
d += B;
d += C;
d();     // 依次执行 A、B、C
```

`+=`添加，`-=`移除，添加时从末尾添加，移除则是移除**最后加入的匹配项**，如果移除不存在的方法**不会报错，静默无操作**

二者由编译器翻译成`Delegate.Combine` /`Delegate.Remove`。

## 二、委托是不可变的

`d += B`不是在d的调用列表里面加一项，而是用d和B组合一个新委托后赋值给d。

## 三、调用顺序

多播的调用顺序严格按照添加顺序执行

## 四、返回值规则

当委托有返回值，列表里每个方法都会执行，但只会返回最后一个方法的返回值，前面的方法的返回值会被丢弃。

## 五、异常情况

如果委托执行时中间有一个方法报错，则后续方法都不会被执行。

## 六、空委托调用

多播委托的“空”就是这个委托变量本身是`null`(不是指列表里有个null)。例如

```C#
Action? isNull = null; //问号代表可空引用类型标注，在C# 8引入
isNull();        // 抛 NullReferenceException
```

# 事件

## 一、什么是事件

事件是在类、结构体、委托等中使用的，对委托的修饰，控制外部对委托的访问权限，一般作为**发布-订阅模式**的桥梁

## 二、事件的作用

先从不用事件的例子来看

假设有一个按钮类：

```C#
class Button{
    public Action? Clicked;
    
    public void Click(){
        Clicked?.Invoke();
    }
}
```

使用：

```C#
Button button = new Button();

button.Clicked += () => Console.WriteLine("点击1");
button.Clicked += () => Console.WriteLine("点击2");

button.Click(); //输出两条消息
```

这样用没有问题，但直接暴露委托字段有几个问题：

1. 外部可以随意赋值

   ```C#
   button.Clicked = null;
   ```

2. 外部可以随意触发

   ```C#
   button.Clicked?.Invoke();
   ```

3. 外部可以随意读取订阅列表

   ```C#
   var list = button.Clicked.GetInvocationList();
   ```

这些都破坏了封装：按钮的点击应该按设计者的原本意图触发，而不是由外部随意触发。

事件就是为了解决以上问题

改写：

```C#
class Button{
    public event Action? Clicked;
    
    public void Click(){
        Clicked?.Invoke();
    }
}
```

这样改写后原本的功能可以正常使用：

```C#
button.Clicked += () => Console.WriteLine("点击"); //订阅
button.Clicked -= handler; //取消订阅
```



但外部不能随意赋值或触发：

```C#
button.Clicked = null;   // 编译错误

button.Clicked?.Invoke();  // 编译错误
```

只有Button类内部才能触发Clicked，这就保证了**谁拥有事件，谁决定何时发布**

## 三、事件的本质

从底层看，事件本质上仍然是一个委托字段，但它对外部只暴露了

- `+=`订阅
- `-=`取消订阅，

隐藏了

- `=`赋值
- `Invoke`触发
- 读取订阅列表

## 四、事件的声明

基本语法：

```C#
public event 委托类型 事件名;
```

其中`event`是关键字，表示声明一个事件。通常声明为`public`，让外部可以订阅。如果声明为`private`或`protected`，只有类内部或者派生类可以订阅

## 五、事件的订阅与取消

- 订阅事件用`+=`

```C#
Button button = new Button();

button.Clicked += OnClick;   // 订阅方法
button.Clicked += () => Console.WriteLine("Lambda");  // 订阅 lambda
```

- 取消订阅用`-=`

```C#
button.Clicked -= OnClick;
```



如果订阅时用Lambda，则无法取消订阅，因为它们是不同的委托实例

```C#
button.Clicked += () => Console.WriteLine("A");
button.Clicked -= () => Console.WriteLine("A");  // 取消不掉，因为是不同的 lambda
```

## 六、触发事件

事件只能在声明它的类内部触发

```C#
class Button{
    public event Action? Clicked;
    
    public void Click(){
        Clicked?.Invoke();
    }
}
```

## 七、空条件调用

前面反复出现的`Clicked?.Invoke()`的意思是：

- 如果`Clicked`不为`null`，则调用
- 否则什么也不做

如果没有订阅，`Clicked`就是`null`，直接`Clicked()`会抛`NullReferenceException`

## 完整例子

```C#
using System;

class Button {
    public event Action? Clicked;

    public void Click() {
        Console.WriteLine("被点击");
        Clicked?.Invoke();
    }
}

class Program {
    static void Main() {
        Button button = new Button();

        button.Clicked += () => Console.WriteLine("点击 1");
        button.Clicked += () => Console.WriteLine("点击 2");

        button.Click();
    }
}
```

# 标准事件模式

前面用`Action`或自定义委托声明事件，可用但不规范。

自定义委托类型的问题是：

- 每个事件都要定义一个委托类型，类型爆炸；
- 参数不统一，调用方难编写通用代码
- 不符合.NET生态惯例

.NET提供了一套标准事件模式，核心是**`EventHandler`委托**和**`EventArgs`基类**。

**标准模式规定**：

- 事件处理方法的返回类型是`void`；
- 第一个参数是`object sender`，表示事件源
- 第二个参数是`EventArgs`的派生类，携带事件数据。


## 一、`EventHandler`委托

`EventHandler`是.NET内置的委托类型：

```C#
public delegate void EventHandler(object? sender, EventArgs e);
```



从定义上可以看出来，它接收两个参数：

- `sender`：触发事件的对象；
- `e`：事件数据

也有泛型版本：

```C#
public delegate void EventHandler<TEventArgs>(
    object? sender, TEventArgs e) 
    where TEventArgs : EventArgs; //泛型约束，只能是EventArgs类或者其子类
```

通过使用`EventHandler`就不必为每个事件单独定义委托类型。

## 二、`EventArgs`基类

`EventArgs`是所有事件数据类的基类：

```C#
public class EventArgs{
    public static readonly EventArgs Empty; 
    //readonly表示这个字段只能在声明时或构造函数中被赋值，之后不能再修改
}
```

如果事件没有额外数据，直接用`EventArgs.Empty`即可。如果需要携带数据，就派生一个类：

```C#
class ClickEventArgs : EventArgs {
    public string Source { get; }

    public ClickEventArgs(string source) {
        Source = source;
    }
}
```



## 完整例子

```C#
using System;

//要携带数据，所以要继承EventArgs，后面使用泛型版本的EventHandler的尖括号中，填写这个类。
class ClickEventArgs : EventArgs {
    public string Source { get; }

    public ClickEventArgs(string source) {
        Source = source;
    }
}

class Button {
    public event EventHandler<ClickEventArgs>? Clicked; 

    public void Click(string source) {
		//第一个参数中this指向自身，表示触发源是自己；
		//第二个参数new一个实例，初始化后传入
		Clicked?.Invoke(this, new ClickEventArgs(source));
    }
}

class Program {
	static void Main() {
		Button button = new Button(); //新建Button实例
		
        //订阅两个Lambda方法
		button.Clicked += (sender, e) => {
			Console.WriteLine($"事件源：{sender}");
			Console.WriteLine($"来源：{e.Source}");
        };

        button.Click("鼠标"); //调用内部函数，并把“鼠标”作为传入数据
    }
}
```

输出：

```text
事件源：Button
来源：鼠标
```



如果没有额外数据，那么就不需要继承原本的`EventArgs`，`EventHandler`也不需要用泛型版本：

```C#
using System;

class Button {
    public event EventHandler? Clicked; 

    public void Click() {
		Clicked?.Invoke(this, EventArgs.Empty);
    }
}

class Program {
	static void Main() {
		Button button = new Button();
		
		button.Clicked += (sender, e) => Console.WriteLine($"点击");
        
        button.Click();
    }
}
```

## 三、使用事件的注意事项

### 1.检查null

如果事件没有订阅，那么它就是null。直接调用会抛异常，应该使用：

```C#
public event Action? Clicked;

public void Click() {
    Clicked?.Invoke();
}
```

### 2.多线程下的竞态条件

在多线程情况下，即便写了`Clicked?.Invoke()`，也有可能因为另一个线程取消了该事件的订阅，导致委托触发不完全，更安全的写法是先保存一个快照，再使用

```C#
Action? handler = Clicked;
handler?.Invoke();
```

这样即使其他线程修改了`Clicked`，局部变量依旧稳定

### 3.订阅使用完毕后应该取消订阅

下面是一个未取消订阅的例子：

```C#
class Publisher {
    public event Action? SomethingHappened; //定义一个事件
}

class Subscriber {
    public Subscriber(Publisher p) {
        p.SomethingHappened += OnEvent;   // 订阅
    }

    private void OnEvent() { }
}
```

如果`Subscriber`对象不再使用，但`Publisher`仍然活着，它的事件列表持有`Subscriber`的方法引用，导致`Subscriber`无法被GC

解决方法：

- 显式`-=`取消订阅
- 实现`IDisposable`，在`Dispose()`中取消订阅
- 使用弱事件模式(`WeakEventManager`等)

### 4.Lambda订阅后无法取消

用Lambda进行订阅无法取消，解决方法就是把Lambda保存到变量

```C#
Action handler = () => Console.WriteLine("A");
publisher.SomethingHappened += handler;
publisher.SomethingHappened -= handler;
```

### 5.在事件处理中修改订阅列表

```C#
publisher.SomethingHappened += () => {
    publisher.SomethingHappened -= someHandler;   // 在触发过程中修改列表
};
```

多播委托在`Invoke`时会遍历调用列表。如果在处理过程中修改列表，行为会按旧列表执行。更改会在下一次调用时生效。但使用方法与直觉不符，会降低代码可读性，这种使用方法应该尽量避免。

### 6.事件不应该抛异常影响其他订阅者

多播委托调用时，如果某个订阅者抛异常，后面的订阅者不会执行

如果希望每个订阅者独立执行，可以手动遍历调用列表并捕获异常：

```C#
Action? handler = SomethingHappened;
if (handler != null){
    foreach (Action d in handler.GetInvocationList()){
        try{
            d();
        } catch (Exception ex){
            // 记录日志，继续执行下一个
        }
    }
}
```

但这会增加复杂度，通常只在框架级代码中这样做。