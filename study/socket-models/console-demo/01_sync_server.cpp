/*
 * ============================================
 *  Synchronous Server Demo
 * ============================================
 *  - recv/send blocks until complete
 *  - Only one client at a time
 *  - Simplest implementation
 *  - No scalability (not for production)
 * ============================================
 */

#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <stdio.h>
#include <stdlib.h>

#pragma comment(lib, "ws2_32.lib")

#define PORT 9000
#define BUFFER_SIZE 1024
#define SIMULATE_WORK_MS 1000

void SetColor(int color) {
    SetConsoleTextAttribute(GetStdHandle(STD_OUTPUT_HANDLE), color);
}

#define COLOR_DEFAULT 7
#define COLOR_GREEN 10
#define COLOR_YELLOW 14
#define COLOR_CYAN 11
#define COLOR_RED 12

void PrintTime() {
    static ULONGLONG startTick = 0;
    if (startTick == 0) startTick = GetTickCount64();

    ULONGLONG elapsed = GetTickCount64() - startTick;
    printf("[%02llu:%02llu.%03llu] ",
           elapsed / 60000,
           (elapsed / 1000) % 60,
           elapsed % 1000);
}

void PrintProgress(int clientId, int progress) {
    printf("\r");
    PrintTime();
    SetColor(COLOR_YELLOW);
    printf("Client %d processing... [", clientId);

    int bars = progress / 5;
    for (int i = 0; i < 20; i++) {
        if (i < bars) printf("#");
        else printf("-");
    }
    printf("] %3d%%", progress);
    SetColor(COLOR_DEFAULT);
    fflush(stdout);
}

int main() {
    printf("\n");
    SetColor(COLOR_CYAN);
    printf("===============================================================\n");
    printf("  [SYNC SERVER] Synchronous Socket Server Demo\n");
    printf("===============================================================\n");
    SetColor(COLOR_DEFAULT);
    printf("  - One client at a time\n");
    printf("  - recv/send blocks until complete\n");
    printf("  - Port: %d\n", PORT);
    printf("===============================================================\n\n");

    WSADATA wsaData;
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
        SetColor(COLOR_RED);
        printf("WSAStartup failed\n");
        return 1;
    }

    SOCKET listenSocket = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (listenSocket == INVALID_SOCKET) {
        SetColor(COLOR_RED);
        printf("Socket creation failed\n");
        WSACleanup();
        return 1;
    }

    sockaddr_in serverAddr;
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_addr.s_addr = INADDR_ANY;
    serverAddr.sin_port = htons(PORT);

    if (bind(listenSocket, (sockaddr*)&serverAddr, sizeof(serverAddr)) == SOCKET_ERROR) {
        SetColor(COLOR_RED);
        printf("Bind failed\n");
        closesocket(listenSocket);
        WSACleanup();
        return 1;
    }

    if (listen(listenSocket, SOMAXCONN) == SOCKET_ERROR) {
        SetColor(COLOR_RED);
        printf("Listen failed\n");
        closesocket(listenSocket);
        WSACleanup();
        return 1;
    }

    PrintTime();
    SetColor(COLOR_GREEN);
    printf("Server started! Waiting for clients...\n");
    SetColor(COLOR_DEFAULT);

    int clientCount = 0;
    int totalProcessed = 0;
    ULONGLONG totalStartTime = GetTickCount64();

    while (1) {
        sockaddr_in clientAddr;
        int clientAddrLen = sizeof(clientAddr);

        SOCKET clientSocket = accept(listenSocket, (sockaddr*)&clientAddr, &clientAddrLen);
        if (clientSocket == INVALID_SOCKET) {
            continue;
        }

        clientCount++;

        PrintTime();
        SetColor(COLOR_CYAN);
        printf("Client %d connected!\n", clientCount);
        SetColor(COLOR_DEFAULT);

        char buffer[BUFFER_SIZE];
        int bytesReceived = recv(clientSocket, buffer, BUFFER_SIZE - 1, 0);

        if (bytesReceived > 0) {
            buffer[bytesReceived] = '\0';

            PrintTime();
            printf("Received from Client %d: %s\n", clientCount, buffer);

            for (int progress = 0; progress <= 100; progress += 5) {
                PrintProgress(clientCount, progress);
                Sleep(SIMULATE_WORK_MS / 20);
            }
            printf("\n");

            const char* response = "OK";
            send(clientSocket, response, (int)strlen(response), 0);

            PrintTime();
            SetColor(COLOR_GREEN);
            printf("Client %d completed!\n", clientCount);
            SetColor(COLOR_DEFAULT);

            totalProcessed++;
        }

        closesocket(clientSocket);

        ULONGLONG elapsed = GetTickCount64() - totalStartTime;
        double throughput = (elapsed > 0) ? (totalProcessed * 1000.0 / elapsed) : 0;

        printf("\n");
        SetColor(COLOR_YELLOW);
        printf("---------------------------------------------------------------\n");
        printf("  Processed: %d | Time: %.2fs | Throughput: %.2f req/sec\n",
               totalProcessed, elapsed / 1000.0, throughput);
        printf("---------------------------------------------------------------\n");
        SetColor(COLOR_DEFAULT);
        printf("\n");
    }

    closesocket(listenSocket);
    WSACleanup();
    return 0;
}
