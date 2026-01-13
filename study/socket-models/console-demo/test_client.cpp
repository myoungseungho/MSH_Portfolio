/*
 * ============================================
 *  테스트 클라이언트
 * ============================================
 *  사용법:
 *    test_client.exe [포트] [클라이언트수]
 *
 *  예:
 *    test_client.exe 9000 5   (동기 서버 테스트)
 *    test_client.exe 9001 5   (Select 서버 테스트)
 *    test_client.exe 9002 5   (Overlapped 서버 테스트)
 *    test_client.exe 9003 5   (IOCP 서버 테스트)
 * ============================================
 */

#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <stdio.h>
#include <stdlib.h>
#include <process.h>

#pragma comment(lib, "ws2_32.lib")

#define BUFFER_SIZE 1024

// 콘솔 색상
void SetColor(int color) {
    SetConsoleTextAttribute(GetStdHandle(STD_OUTPUT_HANDLE), color);
}

#define COLOR_DEFAULT 7
#define COLOR_GREEN 10
#define COLOR_YELLOW 14
#define COLOR_CYAN 11
#define COLOR_RED 12

static int g_port = 9000;
static ULONGLONG g_startTick = 0;
static CRITICAL_SECTION g_cs;
static int g_completedCount = 0;
static int g_totalClients = 0;

void PrintTime() {
    ULONGLONG elapsed = GetTickCount64() - g_startTick;
    printf("[%02llu:%02llu.%03llu] ",
           elapsed / 60000,
           (elapsed / 1000) % 60,
           elapsed % 1000);
}

// 클라이언트 스레드
unsigned int __stdcall ClientThread(void* arg) {
    int clientId = (int)(intptr_t)arg;
    ULONGLONG connectTime = GetTickCount64();

    SOCKET sock = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (sock == INVALID_SOCKET) {
        EnterCriticalSection(&g_cs);
        SetColor(COLOR_RED);
        PrintTime();
        printf("Client %d: 소켓 생성 실패\n", clientId);
        SetColor(COLOR_DEFAULT);
        LeaveCriticalSection(&g_cs);
        return 1;
    }

    sockaddr_in serverAddr;
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_port = htons(g_port);
    inet_pton(AF_INET, "127.0.0.1", &serverAddr.sin_addr);

    // 서버에 연결
    if (connect(sock, (sockaddr*)&serverAddr, sizeof(serverAddr)) == SOCKET_ERROR) {
        EnterCriticalSection(&g_cs);
        SetColor(COLOR_RED);
        PrintTime();
        printf("Client %d: 연결 실패\n", clientId);
        SetColor(COLOR_DEFAULT);
        LeaveCriticalSection(&g_cs);
        closesocket(sock);
        return 1;
    }

    EnterCriticalSection(&g_cs);
    SetColor(COLOR_CYAN);
    PrintTime();
    printf("Client %d: 서버 연결 성공!\n", clientId);
    SetColor(COLOR_DEFAULT);
    LeaveCriticalSection(&g_cs);

    // 데이터 전송
    char sendBuffer[BUFFER_SIZE];
    sprintf_s(sendBuffer, "Hello from Client %d", clientId);

    if (send(sock, sendBuffer, (int)strlen(sendBuffer), 0) == SOCKET_ERROR) {
        EnterCriticalSection(&g_cs);
        SetColor(COLOR_RED);
        PrintTime();
        printf("Client %d: 전송 실패\n", clientId);
        SetColor(COLOR_DEFAULT);
        LeaveCriticalSection(&g_cs);
        closesocket(sock);
        return 1;
    }

    EnterCriticalSection(&g_cs);
    PrintTime();
    printf("Client %d: 데이터 전송 완료, 응답 대기중...\n", clientId);
    LeaveCriticalSection(&g_cs);

    // 응답 수신
    char recvBuffer[BUFFER_SIZE];
    int bytesReceived = recv(sock, recvBuffer, BUFFER_SIZE - 1, 0);

    if (bytesReceived > 0) {
        recvBuffer[bytesReceived] = '\0';
        ULONGLONG elapsed = GetTickCount64() - connectTime;

        EnterCriticalSection(&g_cs);
        g_completedCount++;
        SetColor(COLOR_GREEN);
        PrintTime();
        printf("Client %d: 응답 수신 '%s' (소요시간: %llu ms)\n",
               clientId, recvBuffer, elapsed);
        SetColor(COLOR_DEFAULT);

        // 모두 완료 체크
        if (g_completedCount == g_totalClients) {
            ULONGLONG totalElapsed = GetTickCount64() - g_startTick;
            printf("\n");
            SetColor(COLOR_YELLOW);
            printf("═══════════════════════════════════════════════════════════════\n");
            printf("  모든 클라이언트 처리 완료!\n");
            printf("  총 클라이언트: %d\n", g_totalClients);
            printf("  총 소요시간: %.2f초\n", totalElapsed / 1000.0);
            printf("  처리량: %.2f req/sec\n", g_totalClients * 1000.0 / totalElapsed);
            printf("═══════════════════════════════════════════════════════════════\n");
            SetColor(COLOR_DEFAULT);
        }
        LeaveCriticalSection(&g_cs);
    } else {
        EnterCriticalSection(&g_cs);
        SetColor(COLOR_RED);
        PrintTime();
        printf("Client %d: 응답 수신 실패\n", clientId);
        SetColor(COLOR_DEFAULT);
        LeaveCriticalSection(&g_cs);
    }

    closesocket(sock);
    return 0;
}

int main(int argc, char* argv[]) {
    SetConsoleOutputCP(CP_UTF8);

    // 기본값
    g_port = 9000;
    g_totalClients = 5;

    if (argc >= 2) {
        g_port = atoi(argv[1]);
    }
    if (argc >= 3) {
        g_totalClients = atoi(argv[2]);
    }

    printf("\n");
    SetColor(COLOR_CYAN);
    printf("═══════════════════════════════════════════════════════════════\n");
    printf("  [테스트 클라이언트] Socket Server Test Client\n");
    printf("═══════════════════════════════════════════════════════════════\n");
    SetColor(COLOR_DEFAULT);
    printf("  서버 포트: %d\n", g_port);
    printf("  클라이언트 수: %d\n", g_totalClients);
    printf("═══════════════════════════════════════════════════════════════\n\n");

    InitializeCriticalSection(&g_cs);

    WSADATA wsaData;
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
        SetColor(COLOR_RED);
        printf("WSAStartup 실패\n");
        return 1;
    }

    g_startTick = GetTickCount64();

    SetColor(COLOR_YELLOW);
    PrintTime();
    printf("클라이언트 %d개 동시 접속 시작!\n\n", g_totalClients);
    SetColor(COLOR_DEFAULT);

    // 모든 클라이언트를 동시에 시작
    HANDLE* threads = new HANDLE[g_totalClients];

    for (int i = 0; i < g_totalClients; i++) {
        threads[i] = (HANDLE)_beginthreadex(
            NULL, 0, ClientThread, (void*)(intptr_t)(i + 1), 0, NULL);

        // 약간의 딜레이 (동시 접속 시뮬레이션)
        Sleep(50);
    }

    // 모든 스레드 완료 대기
    WaitForMultipleObjects(g_totalClients, threads, TRUE, INFINITE);

    // 정리
    for (int i = 0; i < g_totalClients; i++) {
        CloseHandle(threads[i]);
    }
    delete[] threads;

    DeleteCriticalSection(&g_cs);
    WSACleanup();

    printf("\n테스트 완료. 아무 키나 누르면 종료...\n");
    getchar();

    return 0;
}
