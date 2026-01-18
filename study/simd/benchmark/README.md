# SIMD 벤치마크 프로젝트

## 📋 개요
일반 연산 vs SIMD 연산의 성능 차이를 실측하는 벤치마크 프로그램입니다.

## 🛠️ 빌드 방법

### 방법 1: Visual Studio Developer Command Prompt 사용

1. **Developer Command Prompt for VS 2022** 실행
   - 시작 메뉴에서 "Developer Command Prompt for VS 2022" 검색

2. 이 폴더로 이동
```bash
cd C:\Users\명승호\Desktop\test\MSH_Portfolio\study\simd\benchmark
```

3. 컴파일
```bash
cl /O2 /arch:SSE2 /EHsc simd_benchmark.cpp
```

4. 실행
```bash
simd_benchmark.exe
```

### 방법 2: 배치 파일 사용

```bash
build.bat
```

### 방법 3: CMake 사용

```bash
mkdir build
cd build
cmake ..
cmake --build . --config Release
Release\simd_benchmark.exe
```

## 📊 벤치마크 항목

### 실험 1: 벡터 덧셈 (1000만 개)
- **일반 방식**: 하나씩 1000만 번 덧셈
- **SIMD 방식**: 4개씩 묶어서 250만 번 덧셈

### 실험 2: 벡터 내적 (100만 번)
- **일반 방식**: 4번의 곱셈 + 3번의 덧셈
- **SIMD 방식**: 1번의 SIMD 곱셈 + Horizontal Add

### 실험 3: 거리 계산 (몬스터 100만 마리)
- **일반 방식**: 각 몬스터마다 sqrt 호출
- **SIMD 방식**: 4마리씩 묶어서 sqrt 호출

## 🎯 실측 결과 (Visual Studio 2022, /Od)

**최적화 비활성화 (/Od)로 순수 비교:**

- **벡터 덧셈 (1000만 개)**: Scalar 11.29ms → SIMD 7.97ms = **1.42배 빠름**
- **벡터 내적 (100만 번)**: Scalar 1.58ms → SIMD 1.61ms = **거의 비슷** (Horizontal Add 오버헤드)
- **거리 계산 (100만 마리)**: Scalar 2.79ms → SIMD 1.52ms = **1.84배 빠름**

**왜 이론상 4배가 안 나올까?**
- 메모리 병목 (Memory Bottleneck) - CPU는 빠른데 메모리가 느림
- 최적화 비활성화 - 실제 게임은 /O2 사용 시 훨씬 빠름
- 컴파일러 자동 벡터화 - /O2 켜면 일반 코드도 SIMD 사용

## 💻 시스템 요구사항

- **CPU**: SSE2 지원 (2004년 이후 대부분의 CPU)
- **컴파일러**: Visual Studio 2017 이상, GCC 7.0 이상
- **OS**: Windows / Linux / macOS

## 📝 코드 설명

### 핵심 SIMD 명령어

```cpp
__m128 _mm_add_ps(a, b)    // 4개 float 동시 덧셈
__m128 _mm_mul_ps(a, b)    // 4개 float 동시 곱셈
__m128 _mm_sub_ps(a, b)    // 4개 float 동시 뺄셈
__m128 _mm_sqrt_ps(a)      // 4개 float 동시 제곱근
```

### 메모리 정렬

SIMD 성능을 위해 16바이트 정렬 필수:

```cpp
float* data = (float*)_aligned_malloc(size * sizeof(float), 16);
alignas(16) float array[4];
```
