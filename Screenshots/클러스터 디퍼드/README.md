# Clustered Deferred Rendering - DirectX 11 구현

Forward → Deferred → Tiled → Clustered 렌더링 기법의 단계별 발전 과정을 DirectX 11로 구현한 데모입니다.

## 개요

수천 개의 동적 광원을 효율적으로 처리하기 위한 렌더링 기법들의 진화 과정을 보여줍니다.

---

## STEP 1: Forward Rendering

![Forward Rendering](step1.gif)

### 개념
가장 기본적인 렌더링 방식. 각 오브젝트를 렌더링할 때마다 **모든 광원**을 순회하며 조명 계산을 수행합니다.

### 복잡도
```
O(Objects × Lights)
```

### 문제점
- 오브젝트 100개 × 광원 1000개 = **10만 번**의 조명 계산
- 광원 수가 증가하면 성능이 급격히 저하
- 같은 픽셀이 여러 오브젝트에 의해 덮어씌워져도 모든 조명 계산을 수행 (Overdraw 낭비)

### 셰이더 핵심 코드
```hlsl
// Forward: 모든 광원을 순회 (병목 지점!)
for (int i = 0; i < LightCount; i++)
{
    // 광원마다 조명 계산...
}
```

---

## STEP 2: Deferred Rendering

![Deferred Rendering](step2.gif)

### 개념
지오메트리 렌더링과 조명 계산을 **분리**합니다.

1. **G-Buffer Pass**: 모든 오브젝트의 Albedo, Normal, Depth를 텍스처에 저장
2. **Lighting Pass**: 화면 전체에 대해 한 번만 조명 계산

### 복잡도
```
O(Objects) + O(Pixels × Lights)
```

### 장점
- Overdraw 문제 해결: 각 픽셀은 최종 표면에 대해서만 조명 계산
- 오브젝트 수와 광원 수가 분리됨

### 한계점
- 여전히 모든 픽셀이 모든 광원을 체크해야 함
- 화면 해상도가 높을수록 비용 증가

---

## STEP 3: Tiled Deferred Rendering

![Tiled Deferred](step3.gif)

### 개념
화면을 **16×16 픽셀 타일**로 분할하고, 각 타일에 영향을 주는 광원만 미리 계산합니다.

1. **G-Buffer Pass**: Deferred와 동일
2. **Light Culling Pass** (Compute Shader): 각 타일별로 영향을 주는 광원 목록 생성
3. **Lighting Pass**: 각 픽셀은 해당 타일의 광원만 순회

### 복잡도
```
O(Pixels × Tile Lights)  // Tile Lights << Total Lights
```

### 장점
- 광원 1000개 중 특정 타일에는 10~50개만 영향
- 불필요한 광원 계산을 90% 이상 제거

### 셰이더 핵심 코드
```hlsl
// Tiled: 이 타일의 광원만 순회!
uint tileLightCount = TileLightList[baseOffset];
for (uint i = 0; i < tileLightCount; i++)
{
    uint lightIndex = TileLightList[baseOffset + 1 + i];
    // 해당 광원만 계산...
}
```

---

## STEP 4: Clustered Deferred Rendering

![Clustered Deferred](step4.gif)

### 개념
Tiled의 2D 분할을 **3D로 확장**합니다. 화면을 X, Y 타일로 나누고, 추가로 **깊이(Z) 방향으로도 슬라이스**합니다.

```
Tiled:     화면을 X, Y로 분할 (2D)
Clustered: 화면을 X, Y, Z로 분할 (3D)
```

### 이론적 장점
같은 타일 내에서도 깊이가 다른 광원을 분리하여 더 정밀한 컬링 가능.

```
      타일 (2D)              클러스터 (3D)
    ┌─────────┐            ┌─────────┐ Slice 0
    │ ● A     │            │ ● A     │
    │ ● B     │    →       ├─────────┤ Slice 1
    │ ● C     │            │ ● B     │
    └─────────┘            ├─────────┤ Slice 2
                           │ ● C     │
    Tiled: A,B,C 모두 체크  └─────────┘
                           Clustered: 깊이별로 분리
```

---

## 성능 비교 결과

| 렌더링 방식 | 광원 1800개 기준 FPS | 상대 성능 |
|------------|---------------------|----------|
| Forward | ~80 FPS | 1.0x (기준) |
| Deferred | ~128 FPS | 1.6x |
| **Tiled** | **~300 FPS** | **3.75x** |
| Clustered | ~200 FPS | 2.5x |

---

## Clustered가 Tiled보다 느린 이유

### 예상과 다른 결과
이론적으로 Clustered는 Tiled의 발전형이지만, 본 구현에서는 Tiled가 더 빨랐습니다.

### 원인 분석

#### 1. 컴퓨트 셰이더 오버헤드
```
Tiled 컴퓨트:    5,700 타일 × N 광원
Clustered 컴퓨트: 5,700 타일 × N 광원 × 8 깊이슬라이스 분배
```
Clustered는 타일별로 광원을 깊이 슬라이스에 분배하는 추가 작업이 필요합니다.

#### 2. 픽셀 셰이더 오버헤드
```hlsl
// Clustered 픽셀 셰이더 추가 연산
float linearDepth = GetLinearDepth(depth);
int depthSlice = GetDepthSlice(linearDepth);  // log 연산 포함
uint clusterIndex = (depthSlice * TileCountY + tileId.y) * TileCountX + tileId.x;
```
각 픽셀마다 깊이 슬라이스를 계산하는 비용이 추가됩니다.

#### 3. 메모리 접근 패턴
- Clustered 라이트 리스트: 타일 × 깊이슬라이스 = **8배 큰 버퍼**
- 캐시 효율성 저하

#### 4. 씬 특성
- 본 데모의 씬은 주로 **평면 구조** (바닥 + 기둥)
- 깊이 방향 복잡도가 낮아 3D 컬링 이점이 적음
- 깊이 슬라이싱으로 절약되는 것보다 오버헤드가 더 큼

### Clustered가 유리한 상황
- **도시 씬**: 건물들이 깊이 방향으로 많이 겹침
- **실내/복도**: 여러 층, 깊은 복도 구조
- **깊이 복잡도가 높은 장면**: 같은 화면 위치에 다양한 깊이의 오브젝트

### 결론
> **"더 발전된 기법이 항상 더 좋은 것은 아니다"**

렌더링 기법 선택은 씬의 특성에 따라 달라져야 합니다. 실제 게임 엔진(UE5, Unity)도 상황에 따라 다른 라이팅 기법을 선택적으로 사용합니다.

---

## 기술 스택

- **Graphics API**: DirectX 11
- **Shading Language**: HLSL (Shader Model 5.0)
- **Compute Shader**: Light Culling (Tile/Cluster)
- **개발 환경**: Visual Studio 2022, Windows 10/11

---

## 조작법

| 키 | 기능 |
|----|------|
| 1 | Forward Rendering |
| 2 | Deferred Rendering |
| 3 | Tiled Deferred |
| 4 | Clustered Deferred |
| +/- | 광원 수 조절 |
| WASD | 카메라 이동 |
| Q/E | 카메라 상/하 이동 |

---

## 핵심 학습 포인트

1. **Forward → Deferred**: 지오메트리와 라이팅 분리로 Overdraw 해결
2. **Deferred → Tiled**: 2D 공간 분할로 광원 컬링 최적화
3. **Tiled → Clustered**: 3D 공간 분할 (이론적 발전, 실제 효과는 씬에 따라 다름)
4. **최적화 트레이드오프**: 추가 연산 vs 절약되는 연산의 균형
