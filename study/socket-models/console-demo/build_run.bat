@echo off
chcp 65001 > nul

cd /d "C:\Users\명승호\Desktop\test\MSH_Portfolio\study\socket-models\console-demo"

call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" > nul 2>&1

echo.
echo [빌드 시작]
echo.

cl /EHsc /Fe:01_sync_server.exe 01_sync_server.cpp ws2_32.lib /nologo
if %ERRORLEVEL% EQU 0 (echo [OK] 01_sync_server.exe) else (echo [FAIL] 01_sync_server)

cl /EHsc /Fe:02_select_server.exe 02_select_server.cpp ws2_32.lib /nologo
if %ERRORLEVEL% EQU 0 (echo [OK] 02_select_server.exe) else (echo [FAIL] 02_select_server)

cl /EHsc /Fe:03_overlapped_server.exe 03_overlapped_server.cpp ws2_32.lib /nologo
if %ERRORLEVEL% EQU 0 (echo [OK] 03_overlapped_server.exe) else (echo [FAIL] 03_overlapped_server)

cl /EHsc /Fe:04_iocp_server.exe 04_iocp_server.cpp ws2_32.lib /nologo
if %ERRORLEVEL% EQU 0 (echo [OK] 04_iocp_server.exe) else (echo [FAIL] 04_iocp_server)

cl /EHsc /Fe:test_client.exe test_client.cpp ws2_32.lib /nologo
if %ERRORLEVEL% EQU 0 (echo [OK] test_client.exe) else (echo [FAIL] test_client)

del *.obj 2>nul

echo.
echo [빌드 완료]
dir *.exe /b 2>nul
