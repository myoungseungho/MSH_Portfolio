/*
 * ============================================
 *  IOCP (I/O Completion Port) 서버 데모
 * ============================================
 *  특징:
 *  - 완료된 I/O를 큐에 모아서 관리
 *  - Worker Thread들이 큐에서 작업을 꺼내 처리
 *  - Windows 최고 성능의 네트워크 모델
 *  - 대규모 게임서버의 표준!
 * ============================================
 */

#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <mswsock.h>
#include <stdio.h>
#include <stdlib.h>
#include <process.h>
#include <vector>
#include <map>

#pragma comment(lib, "ws2_32.lib")

#define PORT 9003
#define BUFFER_SIZE 1024
#define WORKER_THREAD_COUNT 4
#define SIMULATE_WORK_MS 400

// 콘솔 색상
void SetColor(int color) {
    SetConsoleTextAttribute(GetStdHandle(STD_OUTPUT_HANDLE), color);
}

#define COLOR_DEFAULT 7
#define COLOR_GREEN 10
#define COLOR_YELLOW 14
#define COLOR_CYAN 11
#define COLOR_RED 12
#define COLOR_MAGENTA 13
#define COLOR_WHITE 15

// 작업 타입
enum IOType {
    IO_RECV,
    IO_SEND
};

// Per-I/O 데이터
struct PerIoData {
    OVERLAPPED overlapped;
    WSABUF wsaBuf;
    char buffer[BUFFER_SIZE];
    IOType ioType;
    int clientId;
    int progress;
    ULONGLONG connectTime;
    ULONGLONG startProcessTime;
};

// Per-Socket 데이터
struct PerSocketData {
    SOCKET socket;
    int clientId;
};

// 전역 변수
static HANDLE g_hIocp = NULL;
static ULONGLONG g_startTick = 0;
static int g_totalProcessed = 0;
static ULONGLONG g_totalWaitTime = 0;
static ULONGLONG g_totalStartTime = 0;
static CRITICAL_SECTION g_cs;
static std::map<int, PerIoData*> g_clients;
static int g_workerStatus[WORKER_THREAD_COUNT] = {0};  // 0=idle, clientId=busy

void PrintTime() {
    if (g_startTick == 0) g_startTick = GetTickCount64();

    ULONGLONG elapsed = GetTickCount64() - g_startTick;
    printf("[%02llu:%02llu.%03llu] ",
           elapsed / 60000,
           (elapsed / 1000) % 60,
           elapsed % 1000);
}

void PrintStats() {
    ULONGLONG elapsed = GetTickCount64() - g_totalStartTime;
    double throughput = (elapsed > 0) ? (g_totalProcessed * 1000.0 / elapsed) : 0;
    double avgWait = (g_totalProcessed > 0) ? (g_totalWaitTime / (double)g_totalProcessed / 1000.0) : 0;

    SetColor(COLOR_YELLOW);
    printf("─────────────────────────────────────────────────────────────\n");
    printf("  처리: %d | 시간: %.2fs | 처리량: %.2f req/sec | 평균대기: %.2fs\n",
           g_totalProcessed, elapsed / 1000.0, throughput, avgWait);
    printf("─────────────────────────────────────────────────────────────\n");
    SetColor(COLOR_DEFAULT);
}

void PrintWorkerStatus() {
    printf("  Workers: ");
    for (int i = 0; i < WORKER_THREAD_COUNT; i++) {
        if (g_workerStatus[i] == 0) {
            SetColor(COLOR_DEFAULT);
            printf("[W%d:idle] ", i + 1);
        } else {
            SetColor(COLOR_YELLOW);
            printf("[W%d:C%d] ", i + 1, g_workerStatus[i]);
        }
    }
    SetColor(COLOR_DEFAULT);
    printf("\n");
}

// Worker Thread
unsigned int __stdcall WorkerThread(void* arg) {
    int workerId = (int)(intptr_t)arg;

    while (1) {
        DWORD bytesTransferred = 0;
        ULONG_PTR completionKey = 0;
        PerIoData* perIoData = NULL;

        // Completion Port에서 완료된 작업 꺼내기
        BOOL result = GetQueuedCompletionStatus(
            g_hIocp,
            &bytesTransferred,
            &completionKey,
            (LPOVERLAPPED*)&perIoData,
            INFINITE
        );

        if (!result || bytesTransferred == 0) {
            if (perIoData) {
                EnterCriticalSection(&g_cs);
                PrintTime();
                SetColor(COLOR_RED);
                printf("Worker %d: Client %d 연결 종료\n", workerId, perIoData->clientId);
                SetColor(COLOR_DEFAULT);
                g_clients.erase(perIoData->clientId);
                LeaveCriticalSection(&g_cs);

                PerSocketData* perSocketData = (PerSocketData*)completionKey;
                closesocket(perSocketData->socket);
                delete perSocketData;
                delete perIoData;
            }
            continue;
        }

        PerSocketData* perSocketData = (PerSocketData*)completionKey;

        if (perIoData->ioType == IO_RECV) {
            perIoData->buffer[bytesTransferred] = '\0';
            perIoData->startProcessTime = GetTickCount64();

            EnterCriticalSection(&g_cs);
            g_totalWaitTime += (perIoData->startProcessTime - perIoData->connectTime);
            g_workerStatus[workerId - 1] = perIoData->clientId;

            printf("\n");
            PrintTime();
            SetColor(COLOR_MAGENTA);
            printf("Worker %d: Client %d 작업 시작 (큐에서 꺼냄)\n",
                   workerId, perIoData->clientId);
            SetColor(COLOR_DEFAULT);
            PrintWorkerStatus();
            LeaveCriticalSection(&g_cs);

            // 작업 처리 시뮬레이션
            for (int progress = 0; progress <= 100; progress += 5) {
                EnterCriticalSection(&g_cs);
                perIoData->progress = progress;
                LeaveCriticalSection(&g_cs);
                Sleep(SIMULATE_WORK_MS / 20);
            }

            // 응답 전송
            const char* response = "OK";
            send(perSocketData->socket, response, (int)strlen(response), 0);

            EnterCriticalSection(&g_cs);
            g_workerStatus[workerId - 1] = 0;
            g_totalProcessed++;

            printf("\n");
            PrintTime();
            SetColor(COLOR_GREEN);
            printf("Worker %d: Client %d 처리 완료!\n", workerId, perIoData->clientId);
            SetColor(COLOR_DEFAULT);
            PrintWorkerStatus();
            PrintStats();

            g_clients.erase(perIoData->clientId);
            LeaveCriticalSection(&g_cs);

            closesocket(perSocketData->socket);
            delete perSocketData;
            delete perIoData;
        }
    }

    return 0;
}

int main() {
    SetConsoleOutputCP(CP_UTF8);

    printf("\n");
    SetColor(COLOR_CYAN);
    printf("═══════════════════════════════════════════════════════════════\n");
    printf("  [IOCP 서버] I/O Completion Port Server Demo\n");
    printf("═══════════════════════════════════════════════════════════════\n");
    SetColor(COLOR_DEFAULT);
    printf("  - Completion Port로 완료된 I/O를 큐잉\n");
    printf("  - Worker Thread %d개가 큐에서 작업을 꺼내 처리\n", WORKER_THREAD_COUNT);
    printf("  - Windows 최고 성능의 네트워크 모델!\n");
    printf("  - Port: %d\n", PORT);
    printf("═══════════════════════════════════════════════════════════════\n\n");

    InitializeCriticalSection(&g_cs);

    WSADATA wsaData;
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
        SetColor(COLOR_RED);
        printf("WSAStartup 실패\n");
        return 1;
    }

    // IOCP 생성
    g_hIocp = CreateIoCompletionPort(INVALID_HANDLE_VALUE, NULL, 0, 0);
    if (g_hIocp == NULL) {
        SetColor(COLOR_RED);
        printf("IOCP 생성 실패\n");
        WSACleanup();
        return 1;
    }

    PrintTime();
    SetColor(COLOR_GREEN);
    printf("Completion Port 생성 완료!\n");
    SetColor(COLOR_DEFAULT);

    // Worker Thread 생성
    HANDLE workerThreads[WORKER_THREAD_COUNT];
    for (int i = 0; i < WORKER_THREAD_COUNT; i++) {
        workerThreads[i] = (HANDLE)_beginthreadex(
            NULL, 0, WorkerThread, (void*)(intptr_t)(i + 1), 0, NULL);
    }

    PrintTime();
    SetColor(COLOR_GREEN);
    printf("Worker Thread %d개 생성 완료!\n", WORKER_THREAD_COUNT);
    SetColor(COLOR_DEFAULT);
    PrintWorkerStatus();

    // Listen 소켓 생성
    SOCKET listenSocket = WSASocket(AF_INET, SOCK_STREAM, IPPROTO_TCP,
                                     NULL, 0, WSA_FLAG_OVERLAPPED);
    if (listenSocket == INVALID_SOCKET) {
        SetColor(COLOR_RED);
        printf("소켓 생성 실패\n");
        CloseHandle(g_hIocp);
        WSACleanup();
        return 1;
    }

    sockaddr_in serverAddr;
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_addr.s_addr = INADDR_ANY;
    serverAddr.sin_port = htons(PORT);

    if (bind(listenSocket, (sockaddr*)&serverAddr, sizeof(serverAddr)) == SOCKET_ERROR) {
        SetColor(COLOR_RED);
        printf("바인딩 실패\n");
        closesocket(listenSocket);
        CloseHandle(g_hIocp);
        WSACleanup();
        return 1;
    }

    if (listen(listenSocket, SOMAXCONN) == SOCKET_ERROR) {
        SetColor(COLOR_RED);
        printf("리슨 실패\n");
        closesocket(listenSocket);
        CloseHandle(g_hIocp);
        WSACleanup();
        return 1;
    }

    printf("\n");
    PrintTime();
    SetColor(COLOR_GREEN);
    printf("서버 시작! 클라이언트 대기중...\n");
    SetColor(COLOR_DEFAULT);

    int clientIdCounter = 0;
    g_totalStartTime = GetTickCount64();

    while (1) {
        sockaddr_in clientAddr;
        int clientAddrLen = sizeof(clientAddr);

        // 클라이언트 접속 대기
        SOCKET clientSocket = accept(listenSocket, (sockaddr*)&clientAddr, &clientAddrLen);
        if (clientSocket == INVALID_SOCKET) {
            continue;
        }

        clientIdCounter++;

        EnterCriticalSection(&g_cs);
        printf("\n");
        PrintTime();
        SetColor(COLOR_CYAN);
        printf("Client %d 접속! → Completion Port에 등록\n", clientIdCounter);
        SetColor(COLOR_DEFAULT);
        LeaveCriticalSection(&g_cs);

        // Per-Socket 데이터 생성
        PerSocketData* perSocketData = new PerSocketData();
        perSocketData->socket = clientSocket;
        perSocketData->clientId = clientIdCounter;

        // 소켓을 IOCP에 연결
        CreateIoCompletionPort((HANDLE)clientSocket, g_hIocp,
                               (ULONG_PTR)perSocketData, 0);

        // Per-I/O 데이터 생성
        PerIoData* perIoData = new PerIoData();
        memset(perIoData, 0, sizeof(PerIoData));
        perIoData->wsaBuf.buf = perIoData->buffer;
        perIoData->wsaBuf.len = BUFFER_SIZE;
        perIoData->ioType = IO_RECV;
        perIoData->clientId = clientIdCounter;
        perIoData->progress = 0;
        perIoData->connectTime = GetTickCount64();

        EnterCriticalSection(&g_cs);
        g_clients[clientIdCounter] = perIoData;
        LeaveCriticalSection(&g_cs);

        // Overlapped Recv 시작
        DWORD flags = 0;
        DWORD bytesReceived = 0;
        int result = WSARecv(clientSocket, &perIoData->wsaBuf, 1,
                             &bytesReceived, &flags,
                             &perIoData->overlapped, NULL);

        if (result == SOCKET_ERROR && WSAGetLastError() != WSA_IO_PENDING) {
            EnterCriticalSection(&g_cs);
            SetColor(COLOR_RED);
            printf("WSARecv 실패: %d\n", WSAGetLastError());
            SetColor(COLOR_DEFAULT);
            g_clients.erase(clientIdCounter);
            LeaveCriticalSection(&g_cs);

            closesocket(clientSocket);
            delete perSocketData;
            delete perIoData;
        } else {
            EnterCriticalSection(&g_cs);
            PrintTime();
            printf("Client %d → Completion Queue 대기중...\n", clientIdCounter);
            LeaveCriticalSection(&g_cs);
        }
    }

    // 정리
    for (int i = 0; i < WORKER_THREAD_COUNT; i++) {
        CloseHandle(workerThreads[i]);
    }
    closesocket(listenSocket);
    CloseHandle(g_hIocp);
    DeleteCriticalSection(&g_cs);
    WSACleanup();

    return 0;
}
