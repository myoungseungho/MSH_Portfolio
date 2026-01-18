#include <iostream>
#include <chrono>
#include <cmath>
#include <xmmintrin.h>  // SSE
#include <iomanip>

using namespace std;
using namespace std::chrono;

// 시간 측정 헬퍼
class Timer {
private:
    high_resolution_clock::time_point start;
public:
    Timer() : start(high_resolution_clock::now()) {}

    double elapsed() {
        auto end = high_resolution_clock::now();
        return duration_cast<microseconds>(end - start).count() / 1000.0;
    }
};

// ============================================
// 실험 1: 벡터 덧셈 (1000만 개)
// ============================================
void test_vector_addition() {
    cout << "\n========================================\n";
    cout << "실험 1: 벡터 덧셈 (1000만 개)\n";
    cout << "========================================\n";

    const int SIZE = 10000000;

    // 메모리 할당 (16바이트 정렬)
    float* a = (float*)_aligned_malloc(SIZE * sizeof(float), 16);
    float* b = (float*)_aligned_malloc(SIZE * sizeof(float), 16);
    float* result_scalar = (float*)_aligned_malloc(SIZE * sizeof(float), 16);
    float* result_simd = (float*)_aligned_malloc(SIZE * sizeof(float), 16);

    // 초기화
    for (int i = 0; i < SIZE; i++) {
        a[i] = (float)i;
        b[i] = (float)i * 2.0f;
    }

    // [일반 방식] 하나씩 덧셈
    {
        Timer timer;
        for (int i = 0; i < SIZE; i++) {
            result_scalar[i] = a[i] + b[i];
        }
        double elapsed = timer.elapsed();
        cout << "일반 방식: " << fixed << setprecision(2) << elapsed << " ms\n";
    }

    // [SIMD 방식] 4개씩 동시 덧셈
    {
        Timer timer;
        __m128* pA = (__m128*)a;
        __m128* pB = (__m128*)b;
        __m128* pResult = (__m128*)result_simd;

        int simdCount = SIZE / 4;
        for (int i = 0; i < simdCount; i++) {
            pResult[i] = _mm_add_ps(pA[i], pB[i]);
        }
        double elapsed = timer.elapsed();
        cout << "SIMD 방식: " << fixed << setprecision(2) << elapsed << " ms\n";
    }

    // 결과 검증
    bool correct = true;
    for (int i = 0; i < 100; i++) {
        if (abs(result_scalar[i] - result_simd[i]) > 0.001f) {
            correct = false;
            break;
        }
    }
    cout << "결과 검증: " << (correct ? "✅ 일치" : "❌ 불일치") << "\n";

    _aligned_free(a);
    _aligned_free(b);
    _aligned_free(result_scalar);
    _aligned_free(result_simd);
}

// ============================================
// 실험 2: 벡터 내적 (100만 번)
// ============================================
void test_dot_product() {
    cout << "\n========================================\n";
    cout << "실험 2: 벡터 내적 (100만 번)\n";
    cout << "========================================\n";

    const int COUNT = 1000000;

    alignas(16) float a[4] = {1.0f, 2.0f, 3.0f, 4.0f};
    alignas(16) float b[4] = {5.0f, 6.0f, 7.0f, 8.0f};

    // [일반 방식] 내적 계산
    float result_scalar = 0.0f;
    {
        Timer timer;
        for (int iter = 0; iter < COUNT; iter++) {
            result_scalar = a[0]*b[0] + a[1]*b[1] + a[2]*b[2] + a[3]*b[3];
        }
        double elapsed = timer.elapsed();
        cout << "일반 방식: " << fixed << setprecision(2) << elapsed << " ms\n";
        cout << "  결과: " << result_scalar << "\n";
    }

    // [SIMD 방식] 내적 계산
    float result_simd = 0.0f;
    {
        Timer timer;
        __m128 vecA = _mm_load_ps(a);
        __m128 vecB = _mm_load_ps(b);

        for (int iter = 0; iter < COUNT; iter++) {
            __m128 mul = _mm_mul_ps(vecA, vecB);

            // Horizontal Add
            alignas(16) float temp[4];
            _mm_store_ps(temp, mul);
            result_simd = temp[0] + temp[1] + temp[2] + temp[3];
        }
        double elapsed = timer.elapsed();
        cout << "SIMD 방식: " << fixed << setprecision(2) << elapsed << " ms\n";
        cout << "  결과: " << result_simd << "\n";
    }

    cout << "결과 검증: " << (abs(result_scalar - result_simd) < 0.001f ? "✅ 일치" : "❌ 불일치") << "\n";
}

// ============================================
// 실험 3: 거리 계산 - 충돌 검사 (몬스터 100만 마리)
// ============================================
void test_distance_calculation() {
    cout << "\n========================================\n";
    cout << "실험 3: 거리 계산 (몬스터 100만 마리)\n";
    cout << "========================================\n";

    const int MONSTER_COUNT = 1000000;

    // 플레이어 위치
    alignas(16) float playerX[4] = {0.0f, 0.0f, 0.0f, 0.0f};
    alignas(16) float playerY[4] = {0.0f, 0.0f, 0.0f, 0.0f};
    alignas(16) float playerZ[4] = {0.0f, 0.0f, 0.0f, 0.0f};

    // 몬스터 위치
    float* monsterX = (float*)_aligned_malloc(MONSTER_COUNT * sizeof(float), 16);
    float* monsterY = (float*)_aligned_malloc(MONSTER_COUNT * sizeof(float), 16);
    float* monsterZ = (float*)_aligned_malloc(MONSTER_COUNT * sizeof(float), 16);

    float* dist_scalar = (float*)_aligned_malloc(MONSTER_COUNT * sizeof(float), 16);
    float* dist_simd = (float*)_aligned_malloc(MONSTER_COUNT * sizeof(float), 16);

    // 초기화
    for (int i = 0; i < MONSTER_COUNT; i++) {
        monsterX[i] = (float)(i % 100);
        monsterY[i] = (float)(i % 50);
        monsterZ[i] = (float)(i % 75);
    }

    // [일반 방식] 거리 계산
    {
        Timer timer;
        for (int i = 0; i < MONSTER_COUNT; i++) {
            float dx = monsterX[i] - 0.0f;
            float dy = monsterY[i] - 0.0f;
            float dz = monsterZ[i] - 0.0f;

            float distSq = dx*dx + dy*dy + dz*dz;
            dist_scalar[i] = sqrt(distSq);
        }
        double elapsed = timer.elapsed();
        cout << "일반 방식: " << fixed << setprecision(2) << elapsed << " ms\n";
    }

    // [SIMD 방식] 거리 계산 (4마리씩)
    {
        Timer timer;
        __m128 pX = _mm_set1_ps(0.0f);
        __m128 pY = _mm_set1_ps(0.0f);
        __m128 pZ = _mm_set1_ps(0.0f);

        int simdCount = MONSTER_COUNT / 4;
        __m128* mX = (__m128*)monsterX;
        __m128* mY = (__m128*)monsterY;
        __m128* mZ = (__m128*)monsterZ;
        __m128* distResult = (__m128*)dist_simd;

        for (int i = 0; i < simdCount; i++) {
            __m128 dx = _mm_sub_ps(mX[i], pX);
            __m128 dy = _mm_sub_ps(mY[i], pY);
            __m128 dz = _mm_sub_ps(mZ[i], pZ);

            __m128 dx2 = _mm_mul_ps(dx, dx);
            __m128 dy2 = _mm_mul_ps(dy, dy);
            __m128 dz2 = _mm_mul_ps(dz, dz);

            __m128 distSq = _mm_add_ps(_mm_add_ps(dx2, dy2), dz2);
            distResult[i] = _mm_sqrt_ps(distSq);
        }
        double elapsed = timer.elapsed();
        cout << "SIMD 방식: " << fixed << setprecision(2) << elapsed << " ms\n";
    }

    // 결과 검증
    bool correct = true;
    for (int i = 0; i < 100; i++) {
        if (abs(dist_scalar[i] - dist_simd[i]) > 0.01f) {
            correct = false;
            break;
        }
    }
    cout << "결과 검증: " << (correct ? "✅ 일치" : "❌ 불일치") << "\n";

    _aligned_free(monsterX);
    _aligned_free(monsterY);
    _aligned_free(monsterZ);
    _aligned_free(dist_scalar);
    _aligned_free(dist_simd);
}

// ============================================
// 메인
// ============================================
int main() {
    cout << "===========================================\n";
    cout << "     SIMD 성능 벤치마크 테스트\n";
    cout << "===========================================\n";
    cout << "CPU: SSE 지원 (128비트 레지스터)\n";
    cout << "컴파일러: MSVC / GCC with SSE\n";

    test_vector_addition();
    test_dot_product();
    test_distance_calculation();

    cout << "\n===========================================\n";
    cout << "     벤치마크 완료!\n";
    cout << "===========================================\n";

    return 0;
}
