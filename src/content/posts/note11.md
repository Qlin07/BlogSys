---
title: C#的值类型与引用类型，装箱与拆箱
date: 2026-10-03
summary: 初步讲解C#的值类型，引用类型，装箱与拆箱
tags:
  - C#
  - 学习
series: C#
order: 12
---

# C#类型系统总览

C#中的类型分为值类型和引用类型

## 一、值类型

- 内置数值类型：`int`、`double`、`float`、`bool`、`char` 等；
- `struct` 自定义结构体；
- `enum` 枚举；
- 可空值类型：`int?`、`double?` 等。

例如

```C#
int a = 10;
int b = a;   // 把 a 的值复制给 b
b = 20;

Console.WriteLine(a); // 输出 10
Console.WriteLine(b); // 输出 20
```

## 二、引用类型

- `class` 自定义类；
- `interface` 接口；
- `delegate` 委托；
- 数组，如 `int[]`；
- `string`；
- `object`。

例如

```C#
class Person {
    public string Name;
}

Person p1 = new Person();
p1.Name = "Tom";

Person p2 = p1;   // 复制的是引用，不是对象本身
p2.Name = "Jerry";

Console.WriteLine(p1.Name); // 输出 Jerry
Console.WriteLine(p2.Name); // 输出 Jerry
```

在`Person p2 = p1`刚运行结束时，关系如图

```C#
p1 ──┐
     ├──> Person 对象
p2 ──┘      Name ──> "Tom"
```

下面说明只是为了加深变量类型的理解，实际操作没必要仿照实现。

class作为类默认是引用类型，只能通过`(T)name.MemberwiseClone()`方法浅拷贝，浅拷贝复制的对象如果是值类型就复制值，如果是引用类型就复制引用。如果需要深拷贝，则要手动定义方法，逐一复制字段。

 举一个浅拷贝深拷贝的例子

```C#
 class Person {
     public int Age;
     public string Name; 
     public Address Addr;
 }

 // 浅拷贝
 Person p1 = new Person {
     Age = 18, 
     Name = "Tom", 
     Addr = new Address { 
         City = "Beijing" 
     } 
 };
 Person p2 = (Person)p1.MemberwiseClone(); 

 // 深拷贝（手动）
 Person p3 = new Person {Age = p1.Age, Name = p1.Name, Addr = new Address { City = p1.Addr.City } };
```

深拷贝出来的新对象p3和原对象p1没有任何地址上的关联，两者完全独立，所以我将着重说明浅拷贝

浅拷贝部分，从Person的结构可以得知，其中的`Age`字段是值类型，`Name`字段和`Addr`字段都是引用类型，其中`Name`是不可变引用类型，`Addr`是可变引用类型。在浅拷贝后两者关系如图。

```C#
p1 ──> Person 对象 A
          Age  ──> 18
          Name ──> "Tom"       （同一个 string 对象）
          Addr ──> Address 对象（同一个 Address 类对象）
p2 ──> Person 对象 B
          Age  ──> 18
          Name ──> "Tom"       （同一个 string 对象）
          Addr ──> Address 对象（同一个 Address 类对象）
```

现在两者的`Age`和`Name`都不会互相影响了，但`Addr`还有一个问题

由于`Addr`是一个类，在Person对象中等价于`p2.Addr = p1.Addr`，也就是地址引用。两个对象还没有完全解耦。

```text
p1.Addr ──┐
          ├──> Address 对象     City ──> "Beijing"
p2.Addr ──┘
```

有以下两种修改City字段的方式，结果也会不同

- 方法1

```C#
p2.Addr.City = "Shanghai";

Console.WriteLine(p1.Addr.City); // 输出 Shanghai
Console.WriteLine(p2.Addr.City); // 输出 Shanghai
```

- 方法2

```C#
p2.Addr = new Address {City = "Shanghai"};

Console.WriteLine(p1.Addr.City); // 输出 Beijing
Console.WriteLine(p2.Addr.City); // 输出 Shanghai
```

第二种和第一种方法不同的地方在于，第二种方法给p2.Addr创建了一个新的类对象，其中City字段的值为`Shanghai`，具体如图所示

- 方法1

```C#
p1.Addr ──┐
          ├──> Address 对象     City ──> "Shanghai"
p2.Addr ──┘
```

- 方法2

```C#
p1.Addr ────> Address 对象 A     City ──> "Beijing"
    
p2.Addr ────> Address 对象 B     City ──> "Shanghai"
```

# 装箱与拆箱

装箱和拆箱是 C# 中值类型与引用类型之间的转换机制。

---

## 一、什么是装箱

装箱就是：**把一个值类型转换成引用类型**（通常是`object`），例如

```C#
int a = 10;
object obj = a;   // 装箱
```

这里`a`是值类型，`obj`是引用类型，代码第二行触发装箱，实际过程是

- 在堆上分配一块内存
- 把`a`的值`10`**复制**到堆上
- 让`obj`指向这块堆内存

因此，`a`和`obj`是两个独立的副本，修改`a`不会影响`obj`

## 二、什么是拆箱

拆箱就是：**把一个引用类型转换回值类型**，例如

```C#
int b = (int)obj; //拆箱
```

拆箱过程：

- 检查`obj`指向的对象是否是目标值类型
- 如果是，把堆上的值复制回栈上的值类型变量
- 如果不是，报错`InvalidCastException`

需要注意的是，拆箱后`obj`仍指向堆上的装箱对象。

## 三、装箱和拆箱的特点

1. **装箱会分配堆内存**
   每次装箱都可能在堆上分配新对象，会带来一定GC压力。

2. **装箱和拆箱都是复制**，不是引用

3. **拆箱必须类型匹配，完全一致**，例如

   ```C#
   object obj = 10;      // 装箱 int
   long a = (long)obj;   // 错误：InvalidCastException
   ```

   怎么装就怎么拆，拆了之后再说类型转换，例如

   ```C#
   long a = (int)obj; //合法
   ```

4. **可空值类型装箱**的特殊行为

   ```C#
   int? a = null;
   object obj = a; //obj 是 null ，不装箱
   ```

   `null`的可空值类型装箱后得到`null`，而不是一个包含`null`的对象。

---

## 四、隐式装箱

装箱有时候是隐式的，容易被忽略

1. 把值类型赋给`object`

   ```C#
   int a = 10;
   object obj = a;
   ```

2. 把值类型存入非泛型集合(内部把元素都当作`object`来存)

   ```C#
   ArrayList list = new ArrayList();
   list.Add(10); //装箱
   ```

   这会导致批量操作时产生大量装箱，因此更推荐使用泛型集合，如`List<int>`来避免装箱。

3. 值类型传给object/接口参数

   ```C#
   void F(object obj) { }

   int a = 10;
   F(a); //装箱
   ```

4. 字符串拼接

   ```C#
   int a = 10;
   string s = "a = " + a;   // 装箱

   string s = string.Concat("a = ", a); //等价
   ```

   在C#中，如果"+"两边有任意一边是`string`类型，另一边就会被当作字符串拼接，而不是算数加法。可以使用`ToString()`避免装箱或字符串插值

   ```C#
   string s = "a = " + a.ToString();   // 不装箱
   string s = $"a = {a}";   // 现代 C# 通常不装箱
   ```

## 五、装箱拆箱的性能代价

- 装箱：堆分配、内存分配、GC压力
- 拆箱：类型检查、内存复制

以上消耗在循环中更易显出弊端

## 六、避免非必要装箱

1. **优先使用泛型集合**：`List<T>`、`Dictionary<K,V>` 代替 `ArrayList`、`Hashtable`。

2. **使用泛型方法**：`void F<T>(T x)` 代替 `void F(object x)`。

3. **使用 StringBuilder 或插值字符串的优化版本**。

4. **实现泛型接口**，避免通过接口调用时装箱：

   实现泛型接口 `IComparable<T>` 可以避免装箱；只实现 `IComparable` 则可能装箱。

5. **注意 == 和 Equals 的调用**：值类型调用 `Equals(object)` 可能装箱，使用泛型 `EqualityComparer<T>.Default` 可以避免。