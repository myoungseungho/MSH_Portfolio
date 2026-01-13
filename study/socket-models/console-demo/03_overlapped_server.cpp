/*
 * ============================================
 *  Overlapped I/O Server Demo
 * ============================================
 *  - I/O operations delegated to OS
 *  - Returns immediately, notified on completion
 *  - True async I/O
 *  - Simpler than IOCP but less scalable
 * ============================================
 */

#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <mswsock.h>
#include <stdio.h>
#include <stdlib.h>
#include <vector>

#pragma comment(lib, "ws2_32.lib")

#define PORT 9002
#define BUFFER_SIZE 1024
#define MAX_CLIENTS 64
#define SIMULATE_WORK_MS 600

void SetColor(int color) {
    SetConsoleTextAttribute(GetStdHandle(STD_OUTPUT_HANDLE), color);
}

#define COLOR_DEFAULT 7
#define COLOR_GREEN 10
#define COLOR_YELLOW 14
#define COLOR_CYAN 11
#define COLOR_RED 12
#define COLOR_MAGENTA 13

struct OverlappedEx {
    OVERLAPPED overlapped;
    SOCKET socket;
    int clientId;
    WSABUF wsaBuf;
    char buffer[BUFFER_SIZE];
    int progress;
    ULONGLONG connectTime;
    ULONGLONG startProcessTime;
    HANDLE event;
    bool ioCompleted;
};

static ULONGLONG g_startTick = 0;

void PrintTime() {
    if (g_startTick == 0) g_startTick = GetTickCount64();

    ULONGLONG elapsed = GetTickCount64() - g_startTick;
    printf("[%02llu:%02llu.%03llu] ",
           elapsed / 60000,
           (elapsed / 1000) % 60,
           elapsed % 1000);
}

void PrintAllClients(std::vector<OverlappedEx*>& clients) {
    printf("\r");
    PrintTime();

    for (auto client : clients) {
        if (!client->ioCompleted) {
            SetColor(COLOR_CYAN);
            printf("C%d[I/O..] ", client->clientId);
        } else if (client->progress > 0 && client->progress < 100) {
            SetColor(COLOR_YELLOW);
            printf("C%d[", client->clientId);
            int bars = client->progress / 10;
            for (int i = 0; i < 10; i++) {
                if (i < bars) printf("#");
                else printf("-");
            }
            printf("] ");
        } else if (client->progress >= 100) {
            SetColor(COLOR_GREEN);
            printf("C%d[done] ", client->clientId);
        }
    }
    SetColor(COLOR_DEFAULT);
    fflush(stdout);
}

int main() {
    printf("\n");
    SetColor(COLOR_CYAN);
    printf("===============================================================\n");
    printf("  [OVERLAPPED SERVER] Event-based Async Server Demo\n");
    printf("===============================================================\n");
    SetColor(COLOR_DEFAULT);
    printf("  - WSARecv() with OVERLAPPED structure\n");
    printf("  - Event notification on I/O completion\n");
    printf("  - OS handles I/O in background\n");
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

    u_long mode = 1;
    ioctlsocket(listenSocket, FIONBIO, &mode);

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

    std::vector<OverlappedEx*> clients;
    std::vector<HANDLE> events;
    int clientIdCounter = 0;
    int totalProcessed = 0;
    ULONGLONG totalStartTime = GetTickCount64();
    ULONGLONG totalWaitTime = 0;

    while (1) {
        sockaddr_in clientAddr;
        int clientAddrLen = sizeof(clientAddr);
        SOCKET clientSocket = accept(listenSocket, (sockaddr*)&clientAddr, &clientAddrLen);

        if (clientSocket != INVALID_SOCKET) {
            OverlappedEx* newClient = new OverlappedEx();
            memset(newClient, 0, sizeof(OverlappedEx));

            newClient->socket = clientSocket;
            newClient->clientId = ++clientIdCounter;
            newClient->progress = 0;
            newClient->connectTime = GetTickCount64();
            newClient->ioCompleted = false;

            newClient->event = WSACreateEvent();
            newClient->overlapped.hEvent = newClient->event;

            newClient->wsaBuf.buf = newClient->buffer;
            newClient->wsaBuf.len = BUFFER_SIZE;

            DWORD flags = 0;
            DWORD bytesReceived = 0;
            int result = WSARecv(clientSocket, &newClient->wsaBuf, 1,
                                 &bytesReceived, &flags, &newClient->overlapped, NULL);

            if (result == SOCKET_ERROR && WSAGetLastError() != WSA_IO_PENDING) {
                SetColor(COLOR_RED);
                printf("WSARecv failed\n");
                closesocket(clientSocket);
                WSACloseEvent(newClient->event);
                delete newClient;
            } else {
                clients.push_back(newClient);
                events.push_back(newClient->event);

                printf("\n");
                PrintTime();
                SetColor(COLOR_CYAN);
                printf("Client %d connected! Overlapped Recv started (total %zu)\n",
                       newClient->clientId, clients.size());
                SetColor(COLOR_DEFAULT);
            }
        }

        if (!events.empty()) {
            DWORD waitResult = WaitForMultipleObjects(
                (DWORD)events.size(), events.data(), FALSE, 10);

            if (waitResult >= WAIT_OBJECT_0 &&
                waitResult < WAIT_OBJECT_0 + events.size()) {

                size_t index = waitResult - WAIT_OBJECT_0;
                OverlappedEx* client = clients[index];

                if (!client->ioCompleted) {
                    DWORD bytesTransferred = 0;
                    DWORD flags = 0;
                    BOOL result = WSAGetOverlappedResult(
                        client->socket, &client->overlapped,
                        &bytesTransferred, FALSE, &flags);

                    if (result && bytesTransferred > 0) {
                        client->buffer[bytesTransferred] = '\0';
                        client->ioCompleted = true;
                        client->startProcessTime = GetTickCount64();
                        totalWaitTime += (client->startProcessTime - client->connectTime);

                        printf("\n");
                        PrintTime();
                        SetColor(COLOR_MAGENTA);
                        printf("Client %d I/O complete! (Overlapped notification)\n", client->clientId);
                        SetColor(COLOR_DEFAULT);
                    }

                    WSAResetEvent(client->event);
                }
            }
        }

        bool anyProcessing = false;
        for (auto client : clients) {
            if (client->ioCompleted && client->progress < 100) {
                anyProcessing = true;
                client->progress += 3;
                if (client->progress > 100) client->progress = 100;
            }
        }

        if (anyProcessing) {
            PrintAllClients(clients);
            Sleep(SIMULATE_WORK_MS / 33);
        }

        for (auto it = clients.begin(); it != clients.end(); ) {
            OverlappedEx* client = *it;
            if (client->progress >= 100) {
                const char* response = "OK";
                send(client->socket, response, (int)strlen(response), 0);

                closesocket(client->socket);
                WSACloseEvent(client->event);

                size_t index = it - clients.begin();
                events.erase(events.begin() + index);

                printf("\n");
                PrintTime();
                SetColor(COLOR_GREEN);
                printf("Client %d completed!\n", client->clientId);
                SetColor(COLOR_DEFAULT);

                totalProcessed++;
                delete client;
                it = clients.erase(it);

                ULONGLONG elapsed = GetTickCount64() - totalStartTime;
                double throughput = (elapsed > 0) ? (totalProcessed * 1000.0 / elapsed) : 0;
                double avgWait = (totalProcessed > 0) ? (totalWaitTime / (double)totalProcessed / 1000.0) : 0;

                SetColor(COLOR_YELLOW);
                printf("---------------------------------------------------------------\n");
                printf("  Processed: %d | Time: %.2fs | Throughput: %.2f | AvgWait: %.2fs\n",
                       totalProcessed, elapsed / 1000.0, throughput, avgWait);
                printf("---------------------------------------------------------------\n");
                SetColor(COLOR_DEFAULT);
            } else {
                ++it;
            }
        }

        Sleep(1);
    }

    closesocket(listenSocket);
    WSACleanup();
    return 0;
}
