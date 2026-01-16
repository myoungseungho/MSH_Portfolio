#include <windows.h>
#include <stdio.h>
#include <chrono>
#include <thread>
#include <atomic>

HANDLE g_mutex;
HANDLE g_semaphore;
std::atomic<bool> g_testDone(false);
std::atomic<bool> g_dataReady(false);
std::atomic<long long> g_pollCount(0);

void Test1_Ownership() {
    printf("==========================================\n");
    printf(" [Test 1] Ownership Difference\n");
    printf("==========================================\n\n");

    printf("[Mutex]\n");
    HANDLE mutex = CreateMutex(NULL, FALSE, NULL);

    printf("  Thread A: Lock (WaitForSingleObject)\n");
    WaitForSingleObject(mutex, INFINITE);
    printf("  Thread A: Mutex acquired\n");

    std::thread threadB([&mutex]() {
        printf("  Thread B: Try Unlock (ReleaseMutex)\n");
        BOOL result = ReleaseMutex(mutex);
        if (result) {
            printf("  Thread B: Success?! (abnormal)\n");
        } else {
            DWORD err = GetLastError();
            printf("  Thread B: FAILED! error=%lu\n", err);
            printf("           (ERROR_NOT_OWNER)\n");
        }
    });
    threadB.join();

    printf("  Thread A: Unlock (ReleaseMutex)\n");
    ReleaseMutex(mutex);
    printf("  Thread A: Success!\n");
    CloseHandle(mutex);

    printf("\n");

    printf("[Semaphore]\n");
    HANDLE sem = CreateSemaphore(NULL, 1, 1, NULL);

    printf("  Thread A: Wait (WaitForSingleObject)\n");
    WaitForSingleObject(sem, INFINITE);
    printf("  Thread A: Semaphore acquired (count: 1->0)\n");

    std::thread threadC([&sem]() {
        printf("  Thread C: Try Signal (ReleaseSemaphore)\n");
        BOOL result = ReleaseSemaphore(sem, 1, NULL);
        if (result) {
            printf("  Thread C: Success! (count: 0->1)\n");
            printf("           -> Anyone can Signal semaphore!\n");
        } else {
            printf("  Thread C: Failed\n");
        }
    });
    threadC.join();

    CloseHandle(sem);
    printf("\n");
}

void Test2_SignalPattern() {
    printf("==========================================\n");
    printf(" [Test 2] Signal Wait Pattern\n");
    printf("==========================================\n\n");

    printf("[Semaphore - start with count=0]\n");
    HANDLE sem = CreateSemaphore(NULL, 0, 1, NULL);

    auto startTime = std::chrono::high_resolution_clock::now();

    std::thread waiter([&sem, &startTime]() {
        printf("  Waiter: Wait()... (count=0, sleep immediately)\n");
        WaitForSingleObject(sem, INFINITE);

        auto endTime = std::chrono::high_resolution_clock::now();
        auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime).count();
        printf("  Waiter: Woke up! (waited: %lld ms)\n", elapsed);
    });

    std::thread signaler([&sem]() {
        printf("  Signaler: Will signal after 1 sec...\n");
        Sleep(1000);
        printf("  Signaler: Signal! (ReleaseSemaphore)\n");
        ReleaseSemaphore(sem, 1, NULL);
    });

    waiter.join();
    signaler.join();
    CloseHandle(sem);

    printf("\n[With Mutex?]\n");
    printf("  -> Mutex has no count=0 concept\n");
    printf("  -> If no one holds it, it passes through immediately\n");
    printf("  -> Cannot 'wait for signal'!\n");
    printf("\n");
}

void Test3_CPUUsage() {
    printf("==========================================\n");
    printf(" [Test 3] CPU Usage Comparison\n");
    printf("==========================================\n\n");

    printf("[Mutex approach - Polling]\n");
    g_dataReady = false;
    g_pollCount = 0;

    HANDLE mutex = CreateMutex(NULL, FALSE, NULL);

    std::thread poller([&mutex]() {
        while (!g_dataReady) {
            WaitForSingleObject(mutex, INFINITE);
            g_pollCount++;
            ReleaseMutex(mutex);
        }
    });

    std::thread producer1([]() {
        Sleep(2000);
        g_dataReady = true;
    });

    poller.join();
    producer1.join();
    CloseHandle(mutex);

    printf("  Poll count: %lld times (in 2 sec)\n", g_pollCount.load());
    printf("  -> Keeps checking even when no data! CPU waste!\n\n");

    printf("[Semaphore approach - Wait]\n");

    HANDLE sem = CreateSemaphore(NULL, 0, 1, NULL);
    std::atomic<long long> waitCount(0);

    std::thread waiter([&sem, &waitCount]() {
        waitCount++;
        WaitForSingleObject(sem, INFINITE);
        printf("  Wait count: %lld\n", waitCount.load());
    });

    std::thread producer2([&sem]() {
        Sleep(2000);
        printf("  Signaler: Signal!\n");
        ReleaseSemaphore(sem, 1, NULL);
    });

    waiter.join();
    producer2.join();
    CloseHandle(sem);

    printf("  -> Sleeps until signal. CPU 0%%!\n\n");

    printf("[Comparison]\n");
    printf("  Mutex polling: %lld loops (CPU full)\n", g_pollCount.load());
    printf("  Semaphore wait: 1 wait (CPU rest)\n");
    printf("\n");
}

void Test4_ProducerConsumer() {
    printf("==========================================\n");
    printf(" [Test 4] Producer-Consumer Pattern\n");
    printf("==========================================\n\n");

    HANDLE sem = CreateSemaphore(NULL, 0, 100, NULL);
    std::atomic<int> itemCount(0);
    std::atomic<bool> done(false);

    printf("[3 Producers, 1 Consumer]\n\n");

    std::thread consumer([&]() {
        while (true) {
            DWORD result = WaitForSingleObject(sem, 500);
            if (result == WAIT_TIMEOUT) {
                if (done) break;
                continue;
            }
            int count = ++itemCount;
            printf("  Consumer: Item processed! (total: %d)\n", count);
        }
    });

    auto producerFunc = [&sem](int id) {
        for (int i = 0; i < 3; i++) {
            Sleep(200 + id * 100);
            printf("  Producer%d: Item created! Signal!\n", id);
            ReleaseSemaphore(sem, 1, NULL);
        }
    };

    std::thread p1(producerFunc, 1);
    std::thread p2(producerFunc, 2);
    std::thread p3(producerFunc, 3);

    p1.join();
    p2.join();
    p3.join();

    Sleep(600);
    done = true;
    consumer.join();

    CloseHandle(sem);
    printf("\n  Total items processed: %d\n", itemCount.load());
    printf("  -> Consumer wakes only when produced!\n\n");
}

int main() {
    printf("\n");
    printf("########################################\n");
    printf("#  Mutex vs Semaphore Comparison Test  #\n");
    printf("########################################\n\n");

    Test1_Ownership();
    printf("\n");

    Test2_SignalPattern();
    printf("\n");

    Test3_CPUUsage();
    printf("\n");

    Test4_ProducerConsumer();

    printf("==========================================\n");
    printf(" Summary\n");
    printf("==========================================\n\n");
    printf("  [Mutex]\n");
    printf("    - Has ownership (only locker can unlock)\n");
    printf("    - Purpose: Data protection\n");
    printf("\n");
    printf("  [Semaphore]\n");
    printf("    - No ownership (anyone can Signal)\n");
    printf("    - Purpose: Signaling, resource count limit\n");
    printf("\n");

    printf("Press any key to exit...\n");
    getchar();

    return 0;
}
