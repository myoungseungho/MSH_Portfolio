@echo off
echo Noita Pixel Physics - Running...
echo.

if exist "x64\Release\NoitaPixelPhysics.exe" (
    x64\Release\NoitaPixelPhysics.exe
) else if exist "x64\Debug\NoitaPixelPhysics.exe" (
    echo Warning: Running Debug build
    x64\Debug\NoitaPixelPhysics.exe
) else (
    echo ERROR: NoitaPixelPhysics.exe not found!
    echo Please build the project first (run build.bat)
    pause
)
