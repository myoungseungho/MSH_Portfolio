@echo off
echo Noita Pixel Physics - Build Script
echo.

REM Visual Studio 2022 찾기
set MSBUILD=""

REM Community Edition
if exist "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" (
    set MSBUILD="C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe"
)

REM Professional Edition
if exist "C:\Program Files\Microsoft Visual Studio\2022\Professional\MSBuild\Current\Bin\MSBuild.exe" (
    set MSBUILD="C:\Program Files\Microsoft Visual Studio\2022\Professional\MSBuild\Current\Bin\MSBuild.exe"
)

REM Enterprise Edition
if exist "C:\Program Files\Microsoft Visual Studio\2022\Enterprise\MSBuild\Current\Bin\MSBuild.exe" (
    set MSBUILD="C:\Program Files\Microsoft Visual Studio\2022\Enterprise\MSBuild\Current\Bin\MSBuild.exe"
)

REM Fallback to VS2019
if exist "C:\Program Files (x86)\Microsoft Visual Studio\2019\Community\MSBuild\Current\Bin\MSBuild.exe" (
    set MSBUILD="C:\Program Files (x86)\Microsoft Visual Studio\2019\Community\MSBuild\Current\Bin\MSBuild.exe"
)

if %MSBUILD%=="" (
    echo ERROR: Visual Studio not found!
    echo Please install Visual Studio 2019 or 2022
    pause
    exit /b 1
)

echo Using MSBuild: %MSBUILD%
echo.

REM 빌드
%MSBUILD% NoitaPixelPhysics.sln /p:Configuration=Release /p:Platform=x64

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================
    echo Build SUCCESS!
    echo ================================
    echo.
    echo Output: x64\Release\NoitaPixelPhysics.exe
    echo.
    pause
) else (
    echo.
    echo ================================
    echo Build FAILED!
    echo ================================
    pause
    exit /b 1
)
