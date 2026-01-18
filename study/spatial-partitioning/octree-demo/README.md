# Octree Performance Demo (DirectX 11)

## 📋 개요
Octree 공간 분할 기법의 성능을 **실시간**으로 확인하는 데모 프로그램입니다.

**10,000개의 큐브**를 렌더링하며, Brute Force vs Octree의 성능 차이를 직접 체감할 수 있습니다.

## 🎯 실험 목적

### Brute Force (무식한 방법)
- 모든 오브젝트(10,000개)를 카메라 Frustum과 하나씩 비교
- **시간복잡도: O(N)** - 10,000번 검사

### Octree (똑똑한 방법)
- 공간을 8개씩 재귀적으로 분할
- Frustum과 겹치는 노드만 탐색
- **시간복잡도: O(log N)** - 약 10~100번 검사

## 🛠️ 빌드 방법

### 요구사항
- **Visual Studio 2022** (Community 이상)
- **Windows 10/11**
- **DirectX 11 지원 GPU**

### 빌드 및 실행

**방법 1: Visual Studio 2022 IDE 사용 (가장 쉬움)**
1. `OctreeDemo.sln` 파일을 더블클릭
2. Visual Studio 2022에서 열림
3. 상단 메뉴: `빌드 > 솔루션 빌드` (Ctrl+Shift+B)
4. `디버그 > 디버깅 시작` (F5) 또는 `디버깅하지 않고 시작` (Ctrl+F5)

**방법 2: 배치 파일 사용**
```bash
build.bat
```

**방법 3: 수동 빌드 (커맨드라인)**
1. **Developer Command Prompt for VS 2022** 실행
2. 이 폴더로 이동
```bash
cd C:\Users\명승호\Desktop\test\MSH_Portfolio\study\spatial-partitioning\octree-demo
```

3. 컴파일
```bash
mkdir build
cd build
cl /O2 /EHsc /std:c++17 /I"..\src" /Fe"OctreeDemo.exe" ..\src\main.cpp ..\src\Octree.cpp /link d3d11.lib d3dcompiler.lib user32.lib
```

4. 실행
```bash
OctreeDemo.exe
```

## 🎮 사용 방법

### 조작키
- **SPACE** - Octree ON/OFF 토글
- **ESC** - 프로그램 종료

### 화면 정보
```
[OCTREE ON] FPS: 120 | Visible: 500 / 50000 | Checks: 45 (FAST!) | Query: 0.08ms | [LOG: octree_log.txt] | SPACE to toggle
```

### 성능 로그 파일 (자동 생성)
프로그램 실행 중 **1초마다** 성능 통계가 자동으로 파일에 기록됩니다:

- **`octree_log.txt`** - Octree 모드 성능 로그
- **`bruteforce_log.txt`** - Brute Force 모드 성능 로그

**로그 형식 (CSV):**
```csv
Time(s),FPS,Visible,Total,Checks,QueryTime(ms)
0.00,120.50,500,50000,45,0.08
1.00,118.20,520,50000,48,0.09
2.00,119.80,510,50000,46,0.08
...
```

**사용법:**
1. 프로그램 실행
2. Octree 모드로 10~20초 실행 (자동으로 `octree_log.txt` 기록됨)
3. SPACE 눌러서 Brute Force 모드로 전환
4. 10~20초 실행 (자동으로 `bruteforce_log.txt` 기록됨)
5. 프로그램 종료 후 로그 파일 확인

## 📊 예상 실측 결과

### Brute Force 모드
```
FPS: 45~55
Objects: 500 / 10000
Checks: 10000        ← 전부 검사!
Query Time: 1.2 ms
```

### Octree 모드
```
FPS: 55~65
Objects: 500 / 10000
Checks: 30           ← 30개 노드만 검사!
Query Time: 0.08 ms  ← 15배 빠름!
```

## 📝 주요 코드 설명

### Octree 구축 (Build)
```cpp
// 10,000개 오브젝트를 Octree에 삽입
g_octree = new Octree(worldBounds, 6);  // 최대 깊이 6
g_octree->Build(g_objects);

// 자동으로 8개씩 분할
// - 한 노드에 8개 초과 시 분할
// - 최대 6단계까지 분할
```

### Octree 검색 (Query)
```cpp
// Frustum Culling
Frustum frustum;
frustum.Update(viewProj);

std::vector<GameObject*> visibleObjects;
int nodeChecks = 0;

// Octree로 검색
g_octree->Query(frustum, visibleObjects, nodeChecks);

// nodeChecks: 30~100개 (Octree)
// nodeChecks: 10,000개 (Brute Force)
```

### Frustum Culling
```cpp
// 카메라 시야에 있는지 확인
bool Frustum::IntersectsBox(const BoundingBox& box) const {
    // 6개 평면(Left, Right, Top, Bottom, Near, Far)과 비교
    for (int i = 0; i < 6; i++) {
        if (box가 평면 밖에 있으면) return false;
    }
    return true;
}
```

## 🔍 성능 분석

### 왜 Octree가 빠를까?

**Brute Force:**
```
카메라 시야각: 90도
전체 오브젝트: 10,000개
평균 보이는 오브젝트: 500개

검사 횟수: 10,000번 (전부 검사)
→ 쓸데없는 검사 9,500번!
```

**Octree:**
```
Octree 깊이: 6
노드 개수: 최대 8^6 = 262,144개
하지만 실제로는 오브젝트가 있는 곳만 생성

Frustum과 겹치는 노드: 약 30개
평균 보이는 오브젝트: 500개

검사 횟수: 30번 (노드) + 500번 (오브젝트) = 530번
→ Brute Force 10,000번 vs Octree 530번
→ 약 19배 검사 횟수 감소!
```

### 실제 게임에서는?

| 상황 | Brute Force | Octree | 차이 |
|------|-------------|---------|------|
| 오브젝트 1,000개 | 1,000번 | ~100번 | 10배 |
| 오브젝트 10,000개 | 10,000번 | ~300번 | 33배 |
| 오브젝트 100,000개 | 100,000번 | ~1,000번 | 100배 |

**결론:** 오브젝트가 많을수록 Octree의 이점이 커짐!

## 💡 최적화 팁

### 1. 적절한 파라미터
```cpp
const int MAX_OBJECTS = 8;  // 노드당 최대 오브젝트
const int MAX_DEPTH = 6;    // 최대 깊이
```

- `MAX_OBJECTS` 너무 작으면 → 트리가 너무 깊어짐 (메모리 낭비)
- `MAX_OBJECTS` 너무 크면 → 검색 느려짐
- **권장: 4~8개**

- `MAX_DEPTH` 너무 작으면 → 효율 낮음
- `MAX_DEPTH` 너무 크면 → 메모리 낭비
- **권장: 5~8**

### 2. 동적 오브젝트 처리
현재 데모는 정적(Static) 오브젝트만 지원.

실제 게임에서 오브젝트가 움직인다면?

**방법 1:** 매 프레임 Octree 재구성 (느림)
**방법 2:** Loose Octree (노드 경계 2배로)
**방법 3:** Remove & Reinsert (이동한 것만)

### 3. 메모리 풀링
```cpp
// 노드 생성/삭제가 잦으면 GC 발생
// → Object Pooling 사용
```

## 🎓 학습 포인트

### 이 프로젝트에서 배울 수 있는 것
1. **Octree 자료구조** - 3D 공간 분할
2. **Frustum Culling** - 카메라 시야 검사
3. **DirectX 11 렌더링** - Instancing, Vertex/Pixel Shader
4. **성능 측정** - FPS, 검사 횟수, 쿼리 시간
5. **실시간 비교** - Brute Force vs 최적화

### 다음 단계
- **BVH (Bounding Volume Hierarchy)** - 정적 씬에 더 효율적
- **Spatial Hashing** - 균등 분포 오브젝트에 유리
- **kd-Tree** - 2D 게임에 적합
- **R-Tree** - 데이터베이스 공간 인덱싱

## 📁 프로젝트 구조

```
octree-demo/
├── src/
│   ├── main.cpp          - 메인 루프, DirectX 초기화
│   ├── Octree.h          - Octree 인터페이스
│   ├── Octree.cpp        - Octree 구현
│   └── Camera.h          - 카메라 및 Frustum
├── build/                - 빌드 출력 (생성됨)
├── build.bat             - 빌드 스크립트
└── README.md             - 이 파일
```

## 🐛 트러블슈팅

### 컴파일 에러: "d3d11.lib을 찾을 수 없습니다"
→ Visual Studio 2022 Developer Command Prompt에서 실행했는지 확인

### 실행 에러: "d3d11.dll을 찾을 수 없습니다"
→ DirectX 11 지원 GPU 필요 (대부분의 현대 GPU 지원)

### FPS가 너무 낮음 (10 FPS 이하)
→ 통합 그래픽(Intel HD)일 가능성. 외장 그래픽 사용 권장

## 📚 참고 자료

- [Microsoft DirectX 11 Documentation](https://learn.microsoft.com/en-us/windows/win32/direct3d11/atoc-dx-graphics-direct3d-11)
- [Real-Time Rendering, 4th Edition](https://www.realtimerendering.com/)
- [Game Programming Patterns - Spatial Partition](https://gameprogrammingpatterns.com/spatial-partition.html)

## 👤 작성자

MSH Portfolio - 학습용 데모 프로젝트
