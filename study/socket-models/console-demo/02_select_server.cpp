/*
 * ============================================
 *  Async (Select) Server Demo
 * ============================================
 *  - select() monitors multiple sockets
 *  - Process only sockets with data ready
 *  - Single thread handles multiple clients
 *  - Polling overhead as sockets increase
 * ============================================
 */

#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <stdio.h>
#include <stdlib.h>
#include <vector>

#pragma comment(lib, "ws2_32.lib")

#define PORT 9001
#define BUFFER_SIZE 1024
#define MAX_CLIENTS 64
#define SIMULATE_WORK_MS 800

void SetColor(int color) {
    SetConsoleTextAttribute(GetStdHandle(STD_OUTPUT_HANDLE), color);
}

#define COLOR_DEFAULT 7
#define COLOR_GREEN 10
#define COLOR_YELLOW 14
#define COLOR_CYAN 11
#define COLOR_RED 12
#define COLOR_MAGENTA 13

struct ClientInfo {
    SOCKET socket;
    int id;
    int progress;
    bool hasData;
    ULONGLONG connectTime;
    ULONGLONG startProcessTime;
    char buffer[BUFFER_SIZE];
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

void PrintAllClients(std::vector<ClientInfo>& clients) {
    printf("\r");
    PrintTime();

    for (auto& client : clients) {
        if (client.progress > 0 && client.progress < 100) {
            SetColor(COLOR_YELLOW);
            printf("C%d[", client.id);
            int bars = client.progress / 10;
            for (int i = 0; i < 10; i++) {
                if (i < bars) printf("#");
                else printf("-");
            }
            printf("] ");
        } else if (client.progress >= 100) {
            SetColor(COLOR_GREEN);
            printf("C%d[done] ", client.id);
        } else {
            SetColor(COLOR_CYAN);
            printf("C%d[wait] ", client.id);
        }
    }
    SetColor(COLOR_DEFAULT);
    fflush(stdout);
}

int main() {
    printf("\n");
    SetColor(COLOR_CYAN);
    printf("===============================================================\n");
    printf("  [SELECT SERVER] Asynchronous Socket Server Demo\n");
    printf("===============================================================\n");
    SetColor(COLOR_DEFAULT);
    printf("  - select() monitors multiple sockets\n");
    printf("  - Single thread handles multiple clients\n");
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

    u_long mode = 1;
    ioctlsocket(listenSocket, FIONBIO, &mode);

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

    std::vector<ClientInfo> clients;
    int clientIdCounter = 0;
    int totalProcessed = 0;
    ULONGLONG totalStartTime = GetTickCount64();
    ULONGLONG totalWaitTime = 0;

    while (1) {
        fd_set readSet;
        FD_ZERO(&readSet);
        FD_SET(listenSocket, &readSet);

        for (auto& client : clients) {
            FD_SET(client.socket, &readSet);
        }

        timeval timeout;
        timeout.tv_sec = 0;
        timeout.tv_usec = 10000;

        int selectResult = select(0, &readSet, NULL, NULL, &timeout);

        if (selectResult > 0) {
            if (FD_ISSET(listenSocket, &readSet)) {
                sockaddr_in clientAddr;
                int clientAddrLen = sizeof(clientAddr);
                SOCKET clientSocket = accept(listenSocket, (sockaddr*)&clientAddr, &clientAddrLen);

                if (clientSocket != INVALID_SOCKET) {
                    u_long mode = 1;
                    ioctlsocket(clientSocket, FIONBIO, &mode);

                    ClientInfo newClient;
                    newClient.socket = clientSocket;
                    newClient.id = ++clientIdCounter;
                    newClient.progress = 0;
                    newClient.hasData = false;
                    newClient.connectTime = GetTickCount64();
                    newClient.startProcessTime = 0;
                    memset(newClient.buffer, 0, BUFFER_SIZE);

                    clients.push_back(newClient);

                    printf("\n");
                    PrintTime();
                    SetColor(COLOR_CYAN);
                    printf("Client %d connected! (total %zu)\n", newClient.id, clients.size());
                    SetColor(COLOR_DEFAULT);
                }
            }

            for (auto& client : clients) {
                if (FD_ISSET(client.socket, &readSet) && !client.hasData) {
                    int bytesReceived = recv(client.socket, client.buffer, BUFFER_SIZE - 1, 0);
                    if (bytesReceived > 0) {
                        client.buffer[bytesReceived] = '\0';
                        client.hasData = true;
                        client.startProcessTime = GetTickCount64();
                        totalWaitTime += (client.startProcessTime - client.connectTime);

                        printf("\n");
                        PrintTime();
                        SetColor(COLOR_MAGENTA);
                        printf("Client %d data received (select detected!)\n", client.id);
                        SetColor(COLOR_DEFAULT);
                    }
                }
            }
        }

        bool anyProcessing = false;
        for (auto& client : clients) {
            if (client.hasData && client.progress < 100) {
                anyProcessing = true;
                client.progress += 2;
                if (client.progress > 100) client.progress = 100;
            }
        }

        if (anyProcessing) {
            PrintAllClients(clients);
            Sleep(SIMULATE_WORK_MS / 50);
        }

        for (auto it = clients.begin(); it != clients.end(); ) {
            if (it->progress >= 100) {
                const char* response = "OK";
                send(it->socket, response, (int)strlen(response), 0);
                closesocket(it->socket);

                printf("\n");
                PrintTime();
                SetColor(COLOR_GREEN);
                printf("Client %d completed!\n", it->id);
                SetColor(COLOR_DEFAULT);

                totalProcessed++;
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
    }

    closesocket(listenSocket);
    WSACleanup();
    return 0;
}
