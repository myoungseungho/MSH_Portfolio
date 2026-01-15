#include <windows.h>
#include <psapi.h>
#include <stdio.h>
#include <chrono>
#include <random>
#include <vector>

// ============================================
// 진짜 쓰래싱 테스트 (대용량 메모리)
// ============================================

int main() {
    printf("\n");
    printf("########################################\n");
    printf("#  진짜 쓰래싱(Thrashing) 테스트        #\n");
    printf("########################################\n\n");

    // 시스템 메모리 정보
    MEMORYSTATUSEX memInfo;
    memInfo.dwLength = sizeof(memInfo);
    GlobalMemoryStatusEx(&memInfo);

    printf("[시스템 정보]\n");
    printf("  총 RAM: %.1f GB\n", memInfo.ullTotalPhys / (1024.0 * 1024 * 1024));
    printf("  사용 가능: %.1f GB\n", memInfo.ullAvailPhys / (1024.0 * 1024 * 1024));
    printf("  사용 중: %.1f GB\n\n", (memInfo.ullTotalPhys - memInfo.ullAvailPhys) / (1024.0 * 1024 * 1024));

    // 26GB 할당 (31GB 시스템에서 스왑 유발)
    const size_t ALLOC_SIZE = 26ULL * 1024 * 1024 * 1024;  // 26GB
    const int NUM_ACCESSES = 10000;  // 접근 횟수 (스왑 시 느려서 줄임)

    printf("[테스트 설정]\n");
    printf("  할당 크기: %.1f GB\n", ALLOC_SIZE / (1024.0 * 1024 * 1024));
    printf("  접근 횟수: %d\n\n", NUM_ACCESSES);

    printf("!!! 주의: 시스템이 버벅거릴 수 있습니다 !!!\n\n");

    printf("===========================================\n");
    printf(" 26GB 메모리 할당 중...\n");
    printf("===========================================\n\n");

    // 메모리 할당
    auto allocStart = std::chrono::high_resolution_clock::now();

    char* data = (char*)VirtualAlloc(NULL, ALLOC_SIZE, MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE);
    if (!data) {
        printf("메모리 할당 실패! 에러 코드: %lu\n", GetLastError());
        printf("아무 키나 누르면 종료...\n");
        getchar();
        return 1;
    }

    auto allocEnd = std::chrono::high_resolution_clock::now();
    auto allocTime = std::chrono::duration_cast<std::chrono::milliseconds>(allocEnd - allocStart).count();
    printf("  할당 완료: %lld ms\n\n", allocTime);

    // 페이지 터치 (실제 물리 메모리 할당 유도)
    printf("===========================================\n");
    printf(" 메모리 초기화 중... (스왑 발생!)\n");
    printf("===========================================\n\n");

    auto initStart = std::chrono::high_resolution_clock::now();

    const size_t PAGE_SIZE = 4096;
    size_t numPages = ALLOC_SIZE / PAGE_SIZE;

    for (size_t i = 0; i < numPages; i++) {
        data[i * PAGE_SIZE] = (char)(i % 256);

        // 진행률 표시
        if (i % (numPages / 20) == 0) {
            auto now = std::chrono::high_resolution_clock::now();
            auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(now - initStart).count();
            printf("  진행: %zu%% (경과: %lld초)\n", (i * 100) / numPages, elapsed);
        }
    }

    auto initEnd = std::chrono::high_resolution_clock::now();
    auto initTime = std::chrono::duration_cast<std::chrono::seconds>(initEnd - initStart).count();
    printf("  초기화 완료: %lld 초\n\n", initTime);

    // 현재 메모리 상태
    GlobalMemoryStatusEx(&memInfo);
    printf("[초기화 후 메모리 상태]\n");
    printf("  사용 가능 RAM: %.2f GB\n", memInfo.ullAvailPhys / (1024.0 * 1024 * 1024));
    printf("  페이지 파일 사용: %.1f GB\n\n",
           (memInfo.ullTotalPageFile - memInfo.ullAvailPageFile) / (1024.0 * 1024 * 1024));

    // 랜덤 인덱스 생성
    printf("===========================================\n");
    printf(" 랜덤 인덱스 생성 중...\n");
    printf("===========================================\n\n");

    std::vector<size_t> randomIndices(NUM_ACCESSES);
    std::random_device rd;
    std::mt19937_64 gen(rd());
    std::uniform_int_distribution<size_t> dist(0, numPages - 1);

    for (int i = 0; i < NUM_ACCESSES; i++) {
        randomIndices[i] = dist(gen) * PAGE_SIZE;  // 페이지 경계로 접근
    }

    volatile long long sum = 0;

    // ========== 테스트 1: 순차 접근 ==========
    printf("===========================================\n");
    printf(" [테스트 1] 순차 접근 %d회\n", NUM_ACCESSES);
    printf("===========================================\n\n");

    auto seqStart = std::chrono::high_resolution_clock::now();

    for (int i = 0; i < NUM_ACCESSES; i++) {
        size_t idx = ((size_t)i * PAGE_SIZE) % ALLOC_SIZE;
        sum += data[idx];
    }

    auto seqEnd = std::chrono::high_resolution_clock::now();
    auto seqTime = std::chrono::duration_cast<std::chrono::milliseconds>(seqEnd - seqStart).count();
    printf("  결과: %lld ms (1회당 %.2f us)\n\n", seqTime, (double)seqTime * 1000 / NUM_ACCESSES);

    // ========== 테스트 2: 랜덤 접근 (쓰래싱!) ==========
    printf("===========================================\n");
    printf(" [테스트 2] 랜덤 접근 %d회 (쓰래싱 발생!)\n", NUM_ACCESSES);
    printf("===========================================\n\n");

    printf("  측정 중... (디스크 스왑으로 매우 느릴 수 있음)\n\n");

    auto randStart = std::chrono::high_resolution_clock::now();

    for (int i = 0; i < NUM_ACCESSES; i++) {
        sum += data[randomIndices[i]];

        // 진행률 (느리면 중간 확인용)
        if (i > 0 && i % 1000 == 0) {
            auto now = std::chrono::high_resolution_clock::now();
            auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(now - randStart).count();
            printf("  진행: %d회, 경과: %lld ms\n", i, elapsed);
        }
    }

    auto randEnd = std::chrono::high_resolution_clock::now();
    auto randTime = std::chrono::duration_cast<std::chrono::milliseconds>(randEnd - randStart).count();
    printf("\n  결과: %lld ms (1회당 %.2f us)\n\n", randTime, (double)randTime * 1000 / NUM_ACCESSES);

    // ========== 결과 비교 ==========
    printf("===========================================\n");
    printf(" 최종 결과\n");
    printf("===========================================\n\n");

    printf("  순차 접근: %lld ms\n", seqTime);
    printf("  랜덤 접근: %lld ms\n", randTime);
    printf("\n");

    if (seqTime > 0) {
        double ratio = (double)randTime / seqTime;
        printf("  ★ 랜덤이 순차보다 %.1f배 느림\n", ratio);

        if (ratio > 100) {
            printf("\n  → 이게 바로 쓰래싱! 디스크 I/O가 병목\n");
        }
    } else if (randTime > 0) {
        printf("  ★ 순차는 0ms, 랜덤은 %lld ms\n", randTime);
        printf("\n  → 디스크 스왑으로 인한 극심한 성능 저하!\n");
    }

    // 정리
    printf("\n메모리 해제 중...\n");
    VirtualFree(data, 0, MEM_RELEASE);

    printf("\n아무 키나 누르면 종료...\n");
    getchar();

    return 0;
}
