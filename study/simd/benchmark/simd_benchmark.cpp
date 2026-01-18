#include <iostream>
#include <chrono>
#include <cmath>
#include <xmmintrin.h>  // SSE
#include <iomanip>

using namespace std;
using namespace std::chrono;

// Timer helper
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
// Test 1: Vector Addition (10 million)
// ============================================
void test_vector_addition() {
    cout << "\n========================================\n";
    cout << "Test 1: Vector Addition (10 million)\n";
    cout << "========================================\n";

    const int SIZE = 10000000;

    // Memory allocation (16-byte aligned)
    float* a = (float*)_aligned_malloc(SIZE * sizeof(float), 16);
    float* b = (float*)_aligned_malloc(SIZE * sizeof(float), 16);
    float* result_scalar = (float*)_aligned_malloc(SIZE * sizeof(float), 16);
    float* result_simd = (float*)_aligned_malloc(SIZE * sizeof(float), 16);

    // Initialize
    for (int i = 0; i < SIZE; i++) {
        a[i] = (float)i;
        b[i] = (float)i * 2.0f;
    }

    // [Scalar] One by one
    {
        Timer timer;
        for (int i = 0; i < SIZE; i++) {
            result_scalar[i] = a[i] + b[i];
        }
        double elapsed = timer.elapsed();
        cout << "Scalar: " << fixed << setprecision(2) << elapsed << " ms\n";
    }

    // [SIMD] 4 at a time
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
        cout << "SIMD:   " << fixed << setprecision(2) << elapsed << " ms\n";
    }

    // Verify
    bool correct = true;
    for (int i = 0; i < 100; i++) {
        if (abs(result_scalar[i] - result_simd[i]) > 0.001f) {
            correct = false;
            break;
        }
    }
    cout << "Result: " << (correct ? "[OK] Match" : "[FAIL] Mismatch") << "\n";

    _aligned_free(a);
    _aligned_free(b);
    _aligned_free(result_scalar);
    _aligned_free(result_simd);
}

// ============================================
// Test 2: Dot Product (1 million times)
// ============================================
void test_dot_product() {
    cout << "\n========================================\n";
    cout << "Test 2: Dot Product (1 million times)\n";
    cout << "========================================\n";

    const int COUNT = 1000000;

    alignas(16) float a[4] = {1.0f, 2.0f, 3.0f, 4.0f};
    alignas(16) float b[4] = {5.0f, 6.0f, 7.0f, 8.0f};

    // [Scalar]
    float result_scalar = 0.0f;
    {
        Timer timer;
        for (int iter = 0; iter < COUNT; iter++) {
            result_scalar = a[0]*b[0] + a[1]*b[1] + a[2]*b[2] + a[3]*b[3];
        }
        double elapsed = timer.elapsed();
        cout << "Scalar: " << fixed << setprecision(2) << elapsed << " ms\n";
        cout << "  Result: " << result_scalar << "\n";
    }

    // [SIMD]
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
        cout << "SIMD:   " << fixed << setprecision(2) << elapsed << " ms\n";
        cout << "  Result: " << result_simd << "\n";
    }

    cout << "Result: " << (abs(result_scalar - result_simd) < 0.001f ? "[OK] Match" : "[FAIL] Mismatch") << "\n";
}

// ============================================
// Test 3: Distance Calculation (1 million monsters)
// ============================================
void test_distance_calculation() {
    cout << "\n========================================\n";
    cout << "Test 3: Distance Calculation (1M monsters)\n";
    cout << "========================================\n";

    const int MONSTER_COUNT = 1000000;

    // Player position
    alignas(16) float playerX[4] = {0.0f, 0.0f, 0.0f, 0.0f};
    alignas(16) float playerY[4] = {0.0f, 0.0f, 0.0f, 0.0f};
    alignas(16) float playerZ[4] = {0.0f, 0.0f, 0.0f, 0.0f};

    // Monster positions
    float* monsterX = (float*)_aligned_malloc(MONSTER_COUNT * sizeof(float), 16);
    float* monsterY = (float*)_aligned_malloc(MONSTER_COUNT * sizeof(float), 16);
    float* monsterZ = (float*)_aligned_malloc(MONSTER_COUNT * sizeof(float), 16);

    float* dist_scalar = (float*)_aligned_malloc(MONSTER_COUNT * sizeof(float), 16);
    float* dist_simd = (float*)_aligned_malloc(MONSTER_COUNT * sizeof(float), 16);

    // Initialize
    for (int i = 0; i < MONSTER_COUNT; i++) {
        monsterX[i] = (float)(i % 100);
        monsterY[i] = (float)(i % 50);
        monsterZ[i] = (float)(i % 75);
    }

    // [Scalar] Distance calculation
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
        cout << "Scalar: " << fixed << setprecision(2) << elapsed << " ms\n";
    }

    // [SIMD] Distance calculation (4 at a time)
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
        cout << "SIMD:   " << fixed << setprecision(2) << elapsed << " ms\n";
    }

    // Verify
    bool correct = true;
    for (int i = 0; i < 100; i++) {
        if (abs(dist_scalar[i] - dist_simd[i]) > 0.01f) {
            correct = false;
            break;
        }
    }
    cout << "Result: " << (correct ? "[OK] Match" : "[FAIL] Mismatch") << "\n";

    _aligned_free(monsterX);
    _aligned_free(monsterY);
    _aligned_free(monsterZ);
    _aligned_free(dist_scalar);
    _aligned_free(dist_simd);
}

// ============================================
// Main
// ============================================
int main() {
    cout << "===========================================\n";
    cout << "     SIMD Performance Benchmark\n";
    cout << "===========================================\n";
    cout << "CPU: SSE supported (128-bit register)\n";
    cout << "Compiler: MSVC with SSE\n";

    test_vector_addition();
    test_dot_product();
    test_distance_calculation();

    cout << "\n===========================================\n";
    cout << "     Benchmark Complete!\n";
    cout << "===========================================\n";

    return 0;
}
