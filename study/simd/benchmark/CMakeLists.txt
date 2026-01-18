cmake_minimum_required(VERSION 3.10)
project(SIMD_Benchmark)

set(CMAKE_CXX_STANDARD 17)

# SSE 지원 활성화
if(MSVC)
    # Visual Studio
    add_compile_options(/arch:SSE2)
else()
    # GCC/Clang
    add_compile_options(-msse -msse2)
endif()

add_executable(simd_benchmark simd_benchmark.cpp)
