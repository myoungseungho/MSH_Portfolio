@echo off
setlocal

:: Visual Studio 환경 설정
call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvarsall.bat" x64 > nul 2>&1

:: 현재 디렉토리로 이동
cd /d "%~dp0"

:: 빌드 디렉토리 생성
if not exist "build" mkdir build
cd build

echo ==========================================
echo Compiling Octree Demo (Fixed Unicode)...
echo ==========================================
echo.

:: 컴파일 (Release 최적화)
cl.exe /O2 /EHsc /std:c++17 ^
    /I"..\src" ^
    /Fe"OctreeDemo.exe" ^
    ..\src\main.cpp ..\src\Octree.cpp ^
    /link d3d11.lib d3dcompiler.lib user32.lib

if %errorlevel% equ 0 (
    echo.
    echo ==========================================
    echo Build successful!
    echo ==========================================
    echo.
    echo Executable: build\OctreeDemo.exe
    echo.
    echo To run the demo, execute: OctreeDemo.exe
    echo.
    echo Controls:
    echo - SPACE: Toggle Octree ON/OFF
    echo - ESC: Exit
    echo.
) else (
    echo.
    echo ==========================================
    echo Build failed!
    echo ==========================================
)

echo.
pause

endlocal
