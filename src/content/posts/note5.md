---
title: C++:移动语义
date: 2026-09-18
summary: 移动语义相关语法与使用方式，左引用右引用区别
tags:
  - C++
  - 面向对象
  - 学习
series: C++
order: 5
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




