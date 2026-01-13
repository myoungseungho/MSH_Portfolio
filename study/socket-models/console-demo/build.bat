@echo off
chcp 65001 > nul
echo.
echo ═══════════════════════════════════════════════════════════════
echo   Socket I/O Models - Build Script
echo ═══════════════════════════════════════════════════════════════
echo.

REM Visual Studio 환경 설정 (필요시 경로 수정)
if exist "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" (
    call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" > nul 2>&1
) else if exist "C:\Program Files (x86)\Microsoft Visual Studio\2019\Community\VC\Auxiliary\Build\vcvars64.bat" (
    call "C:\Program Files (x86)\Microsoft Visual Studio\2019\Community\VC\Auxiliary\Build\vcvars64.bat" > nul 2>&1
)

echo [1/5] 동기 서버 빌드중...
cl /EHsc /Fe:01_sync_server.exe 01_sync_server.cpp ws2_32.lib /nologo > nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo       ✓ 01_sync_server.exe 빌드 완료
) else (
    echo       ✗ 빌드 실패
)

echo [2/5] Select 서버 빌드중...
cl /EHsc /Fe:02_select_server.exe 02_select_server.cpp ws2_32.lib /nologo > nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo       ✓ 02_select_server.exe 빌드 완료
) else (
    echo       ✗ 빌드 실패
)

echo [3/5] Overlapped 서버 빌드중...
cl /EHsc /Fe:03_overlapped_server.exe 03_overlapped_server.cpp ws2_32.lib /nologo > nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo       ✓ 03_overlapped_server.exe 빌드 완료
) else (
    echo       ✗ 빌드 실패
)

echo [4/5] IOCP 서버 빌드중...
cl /EHsc /Fe:04_iocp_server.exe 04_iocp_server.cpp ws2_32.lib /nologo > nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo       ✓ 04_iocp_server.exe 빌드 완료
) else (
    echo       ✗ 빌드 실패
)

echo [5/5] 테스트 클라이언트 빌드중...
cl /EHsc /Fe:test_client.exe test_client.cpp ws2_32.lib /nologo > nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo       ✓ test_client.exe 빌드 완료
) else (
    echo       ✗ 빌드 실패
)

REM 임시 파일 정리
del *.obj > nul 2>&1

echo.
echo ═══════════════════════════════════════════════════════════════
echo   빌드 완료!
echo ═══════════════════════════════════════════════════════════════
echo.
echo   사용법:
echo     1. 서버 실행 (터미널 1)
echo        ^> 01_sync_server.exe       (포트 9000)
echo        ^> 02_select_server.exe     (포트 9001)
echo        ^> 03_overlapped_server.exe (포트 9002)
echo        ^> 04_iocp_server.exe       (포트 9003)
echo.
echo     2. 클라이언트 실행 (터미널 2)
echo        ^> test_client.exe [포트] [클라이언트수]
echo        ^> test_client.exe 9000 5   (동기 서버 테스트)
echo        ^> test_client.exe 9003 5   (IOCP 서버 테스트)
echo.
pause
