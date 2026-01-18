@echo off
setlocal

:: Visual Studio 환경 설정
call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvarsall.bat" x64 > nul 2>&1

:: 현재 디렉토리로 이동
cd /d "%~dp0"

:: 컴파일 (최적화 비활성화로 순수 비교)
echo Compiling with optimizations disabled...
cl.exe /Od /EHsc /Fesimd_benchmark.exe simd_benchmark.cpp

if %errorlevel% equ 0 (
    echo.
    echo ===========================================
    echo Running benchmark...
    echo ===========================================
    echo.
    simd_benchmark.exe
    echo.
    echo Benchmark completed!
) else (
    echo Compilation failed!
)

echo.
pause

endlocal
