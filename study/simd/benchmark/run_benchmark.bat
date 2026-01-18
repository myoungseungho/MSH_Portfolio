@echo off
call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvarsall.bat" x64
cd /d "%~dp0"
echo Building...
cl /O2 /arch:SSE2 /EHsc simd_benchmark.cpp
if %errorlevel% equ 0 (
    echo.
    echo Running benchmark...
    echo.
    simd_benchmark.exe
) else (
    echo Build failed!
)
