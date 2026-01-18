@echo off
echo ========================================
echo SIMD Benchmark 빌드 스크립트
echo ========================================
echo.

REM Visual Studio 2022 개발자 명령 프롬프트 환경 설정
if exist "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvarsall.bat" (
    call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvarsall.bat" x64
) else if exist "C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvarsall.bat" (
    call "C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvarsall.bat" x64
) else if exist "C:\Program Files\Microsoft Visual Studio\2022\Enterprise\VC\Auxiliary\Build\vcvarsall.bat" (
    call "C:\Program Files\Microsoft Visual Studio\2022\Enterprise\VC\Auxiliary\Build\vcvarsall.bat" x64
) else (
    echo Visual Studio 2022를 찾을 수 없습니다.
    echo Developer Command Prompt for VS 2022에서 직접 실행해주세요:
    echo cl /O2 /arch:SSE2 /EHsc simd_benchmark.cpp
    pause
    exit /b 1
)

echo.
echo 컴파일 중...
cl /O2 /arch:SSE2 /EHsc /Fe:simd_benchmark.exe simd_benchmark.cpp

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo 빌드 성공! 실행 중...
    echo ========================================
    echo.
    simd_benchmark.exe
) else (
    echo.
    echo 빌드 실패!
    pause
)
