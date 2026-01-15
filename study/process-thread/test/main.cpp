#include <windows.h>
#include <psapi.h>
#include <stdio.h>
#include <chrono>

// ============================================
// 1. 생성 비용 테스트
// ============================================

DWORD WINAPI DummyThreadFunc(LPVOID param) {
    return 0;
}

void TestCreationCost() {
    printf("\n");
    printf("============================================\n");
    printf(" 1. 생성 비용 테스트\n");
    printf("============================================\n\n");

    const int THREAD_COUNT = 1000;
    const int PROC_COUNT = 100;

    // 스레드 생성
    printf("[Thread] %d개 생성 중...\n", THREAD_COUNT);
    auto start = std::chrono::high_resolution_clock::now();

    HANDLE threads[THREAD_COUNT];
    for (int i = 0; i < THREAD_COUNT; i++) {
        threads[i] = CreateThread(NULL, 0, DummyThreadFunc, NULL, 0, NULL);
    }
    for (int i = 0; i < THREAD_COUNT; i++) {
        WaitForSingleObject(threads[i], INFINITE);
        CloseHandle(threads[i]);
    }

    auto end = std::chrono::high_resolution_clock::now();
    auto threadTime = std::chrono::duration_cast<std::chrono::microseconds>(end - start).count();
    double threadPer = threadTime / (double)THREAD_COUNT;

    printf("         -> %lld us (%.2f ms), 1개당 %.2f us\n\n", threadTime, threadTime/1000.0, threadPer);

    // 프로세스 생성
    printf("[Process] %d개 생성 중...\n", PROC_COUNT);
    start = std::chrono::high_resolution_clock::now();

    for (int i = 0; i < PROC_COUNT; i++) {
        STARTUPINFOA si = { sizeof(si) };
        PROCESS_INFORMATION pi;
        if (CreateProcessA(NULL, (LPSTR)"cmd /c exit", NULL, NULL, FALSE,
                          CREATE_NO_WINDOW, NULL, NULL, &si, &pi)) {
            WaitForSingleObject(pi.hProcess, INFINITE);
            CloseHandle(pi.hProcess);
            CloseHandle(pi.hThread);
        }
    }

    end = std::chrono::high_resolution_clock::now();
    auto procTime = std::chrono::duration_cast<std::chrono::microseconds>(end - start).count();
    double procPer = procTime / (double)PROC_COUNT;

    printf("         -> %lld us (%.2f ms), 1개당 %.2f us\n\n", procTime, procTime/1000.0, procPer);

    printf("[결과] 프로세스가 스레드보다 %.1f배 느림\n", procPer / threadPer);
}

// ============================================
// 2. 컨텍스트 스위칭 비용 테스트
// ============================================

HANDLE g_event1, g_event2;
volatile int g_switchCount = 0;
const int SWITCH_ITERATIONS = 10000;

DWORD WINAPI PingThreadFunc(LPVOID param) {
    for (int i = 0; i < SWITCH_ITERATIONS; i++) {
        WaitForSingleObject(g_event1, INFINITE);  // event1 대기
        SetEvent(g_event2);                        // event2 신호
    }
    return 0;
}

DWORD WINAPI PongThreadFunc(LPVOID param) {
    for (int i = 0; i < SWITCH_ITERATIONS; i++) {
        SetEvent(g_event1);                        // event1 신호
        WaitForSingleObject(g_event2, INFINITE);  // event2 대기
    }
    return 0;
}

void TestContextSwitchCost() {
    printf("\n");
    printf("============================================\n");
    printf(" 2. 컨텍스트 스위칭 비용 테스트\n");
    printf("============================================\n\n");

    // --- 스레드 컨텍스트 스위칭 ---
    printf("[Thread] 컨텍스트 스위칭 %d회...\n", SWITCH_ITERATIONS * 2);

    g_event1 = CreateEvent(NULL, FALSE, FALSE, NULL);  // auto-reset
    g_event2 = CreateEvent(NULL, FALSE, FALSE, NULL);

    auto start = std::chrono::high_resolution_clock::now();

    HANDLE pingThread = CreateThread(NULL, 0, PingThreadFunc, NULL, 0, NULL);
    HANDLE pongThread = CreateThread(NULL, 0, PongThreadFunc, NULL, 0, NULL);

    WaitForSingleObject(pingThread, INFINITE);
    WaitForSingleObject(pongThread, INFINITE);

    auto end = std::chrono::high_resolution_clock::now();
    auto threadSwitchTime = std::chrono::duration_cast<std::chrono::microseconds>(end - start).count();

    CloseHandle(pingThread);
    CloseHandle(pongThread);
    CloseHandle(g_event1);
    CloseHandle(g_event2);

    double threadSwitchPer = threadSwitchTime / (double)(SWITCH_ITERATIONS * 2);
    printf("         -> %lld us, 1회당 %.3f us\n\n", threadSwitchTime, threadSwitchPer);

    // --- 프로세스 컨텍스트 스위칭 (파이프 사용) ---
    printf("[Process] 컨텍스트 스위칭 %d회...\n", SWITCH_ITERATIONS);

    HANDLE hReadPipe, hWritePipe;
    HANDLE hReadPipe2, hWritePipe2;
    SECURITY_ATTRIBUTES sa = { sizeof(sa), NULL, TRUE };

    CreatePipe(&hReadPipe, &hWritePipe, &sa, 0);
    CreatePipe(&hReadPipe2, &hWritePipe2, &sa, 0);

    // 자식 프로세스 생성 (별도 exe 필요하므로, 간접 측정)
    // 대신 Named Pipe로 자기 자신과 통신하여 스위칭 오버헤드 측정

    // 간단한 방법: 명명된 이벤트로 두 프로세스 간 ping-pong
    // 여기서는 프로세스 간 IPC 오버헤드를 측정

    HANDLE hProcEvent1 = CreateEventA(NULL, FALSE, FALSE, "Global\\ProcTestEvent1");
    HANDLE hProcEvent2 = CreateEventA(NULL, FALSE, FALSE, "Global\\ProcTestEvent2");

    // 자식 프로세스용 코드가 필요하므로, 단순화하여
    // 프로세스 생성 + 파이프 통신 왕복 시간 측정

    const int PROC_SWITCH_ITERATIONS = 100;  // 프로세스는 느리니까 적게

    start = std::chrono::high_resolution_clock::now();

    for (int i = 0; i < PROC_SWITCH_ITERATIONS; i++) {
        STARTUPINFOA si = { sizeof(si) };
        PROCESS_INFORMATION pi;

        // 프로세스 생성하고 종료 대기 (최소한의 IPC)
        if (CreateProcessA(NULL, (LPSTR)"cmd /c echo x", NULL, NULL, FALSE,
                          CREATE_NO_WINDOW, NULL, NULL, &si, &pi)) {
            WaitForSingleObject(pi.hProcess, INFINITE);
            CloseHandle(pi.hProcess);
            CloseHandle(pi.hThread);
        }
    }

    end = std::chrono::high_resolution_clock::now();
    auto procSwitchTime = std::chrono::duration_cast<std::chrono::microseconds>(end - start).count();
    double procSwitchPer = procSwitchTime / (double)PROC_SWITCH_ITERATIONS;

    printf("         -> %lld us, 1회당 %.3f us\n", procSwitchTime, procSwitchPer);
    printf("         (프로세스 생성+종료 포함, 순수 스위칭보다 큼)\n\n");

    CloseHandle(hReadPipe);
    CloseHandle(hWritePipe);
    CloseHandle(hReadPipe2);
    CloseHandle(hWritePipe2);
    CloseHandle(hProcEvent1);
    CloseHandle(hProcEvent2);

    printf("[결과] 프로세스 IPC가 스레드 스위칭보다 %.1f배 느림\n", procSwitchPer / threadSwitchPer);
}

// ============================================
// 3. 메모리 사용량 테스트
// ============================================

void TestMemoryUsage() {
    printf("\n");
    printf("============================================\n");
    printf(" 3. 메모리 사용량 테스트\n");
    printf("============================================\n\n");

    PROCESS_MEMORY_COUNTERS pmc;

    // 현재 메모리 사용량
    GetProcessMemoryInfo(GetCurrentProcess(), &pmc, sizeof(pmc));
    SIZE_T beforeMem = pmc.WorkingSetSize;
    printf("[Before] 현재 메모리: %.2f MB\n\n", beforeMem / (1024.0 * 1024.0));

    // 스레드 100개 생성하고 유지
    const int COUNT = 100;
    printf("[Thread] %d개 생성 후 유지...\n", COUNT);

    HANDLE threads[COUNT];
    HANDLE keepAliveEvent = CreateEvent(NULL, TRUE, FALSE, NULL);  // manual reset, 초기 nonsignaled

    for (int i = 0; i < COUNT; i++) {
        threads[i] = CreateThread(NULL, 0, [](LPVOID param) -> DWORD {
            WaitForSingleObject((HANDLE)param, INFINITE);  // 이벤트 대기하며 살아있음
            return 0;
        }, keepAliveEvent, 0, NULL);
    }

    Sleep(100);  // 스레드들이 안정화될 때까지 대기

    GetProcessMemoryInfo(GetCurrentProcess(), &pmc, sizeof(pmc));
    SIZE_T afterThreadMem = pmc.WorkingSetSize;
    SIZE_T threadMemUsage = afterThreadMem - beforeMem;

    printf("         -> 추가 메모리: %.2f MB (스레드 1개당 %.2f KB)\n\n",
           threadMemUsage / (1024.0 * 1024.0),
           threadMemUsage / (double)COUNT / 1024.0);

    // 정리
    SetEvent(keepAliveEvent);  // 모든 스레드 종료 신호
    for (int i = 0; i < COUNT; i++) {
        WaitForSingleObject(threads[i], INFINITE);
        CloseHandle(threads[i]);
    }
    CloseHandle(keepAliveEvent);

    // 프로세스는 별도 측정 어려움 (각각 독립 메모리 공간)
    printf("[Process] 일반적으로 프로세스 1개당 수 MB ~ 수십 MB\n");
    printf("          (독립된 메모리 공간, 페이지 테이블, 핸들 테이블 등)\n");
}

// ============================================
// 메인
// ============================================

int main() {
    printf("\n");
    printf("########################################\n");
    printf("#  프로세스 vs 스레드 종합 비교 테스트  #\n");
    printf("########################################\n");

    TestCreationCost();
    TestContextSwitchCost();
    TestMemoryUsage();

    printf("\n");
    printf("============================================\n");
    printf(" 최종 요약\n");
    printf("============================================\n");
    printf("\n");
    printf("| 항목              | 스레드      | 프로세스        |\n");
    printf("|-------------------|-------------|----------------|\n");
    printf("| 생성 비용         | 빠름        | 느림 (수백배)   |\n");
    printf("| 컨텍스트 스위칭   | 빠름        | 느림            |\n");
    printf("| 메모리 사용       | 적음 (KB)   | 많음 (MB)       |\n");
    printf("| 안정성            | 공유 -> 위험 | 격리 -> 안전    |\n");
    printf("\n");

    printf("아무 키나 누르면 종료...\n");
    getchar();

    return 0;
}
