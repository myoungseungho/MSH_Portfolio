# 델타 압축 데모 (Delta Compression Demo)

**Full State vs Delta Compression 네트워크 트래픽 비교 시뮬레이션**

---

## 📖 개요

이 Unity 프로젝트는 멀티플레이 게임에서 사용되는 두 가지 위치 동기화 방식의 트래픽 차이를 시각적으로 비교합니다:

1. **Full State 방식** - 매번 전체 위치 데이터 전송
2. **Delta Compression 방식** - 변화량만 전송 (압축)

---

## 🎯 학습 목표

- 델타 압축의 개념 이해
- 실제 트래픽 절약 효과 실측
- 패킷 최적화 기법 체험

---

## 🚀 설치 및 실행

### 1. Unity 버전

- Unity 2020.3 LTS 이상 권장
- Unity 2019.4 이상에서도 작동

### 2. 프로젝트 설정

1. 새 Unity 3D 프로젝트 생성
2. `Scripts` 폴더의 모든 파일을 Unity 프로젝트의 `Assets/Scripts`에 복사

### 3. 씬 구성

#### Step 1: 플레이어 Prefab 만들기

1. `Hierarchy` 우클릭 → `3D Object` → `Capsule` 생성
2. 이름을 `Player`로 변경
3. `Add Component` → `Player Movement` 스크립트 추가
4. `Player`를 `Assets`로 드래그하여 Prefab 생성
5. Hierarchy에서 제거

#### Step 2: 메인 오브젝트 설정

1. `Hierarchy` 우클릭 → `Create Empty` → 이름: `DemoController`
2. `DemoController`에 컴포넌트 추가:
   - `Demo Controller` 스크립트
   - `Full State Sync` 스크립트
   - `Delta Sync` 스크립트

3. Inspector에서 설정:
   - `Player Prefab`: 위에서 만든 Player Prefab 연결
   - `Initial Player Count`: 20
   - `Full State Sync`: 같은 오브젝트의 Full State Sync 연결
   - `Delta Sync`: 같은 오브젝트의 Delta Sync 연결

#### Step 3: UI 설정

1. `Hierarchy` 우클릭 → `UI` → `Canvas`
2. `Canvas` 하위에 `Panel` 생성 (이름: `StatsPanel`)
3. `StatsPanel` 하위에 `Text` 오브젝트들 생성:
   - `FullStatePacketsText`
   - `FullStateBytesText`
   - `FullStateBytesPerSecText`
   - `DeltaPacketsText`
   - `DeltaBytesText`
   - `DeltaBytesPerSecText`
   - `DeltaSkippedText`
   - `ComparisonText`
   - `PlayerCountText`

4. `DemoController`에 `Comparison UI` 스크립트 추가
5. Inspector에서 UI 요소들 연결

#### Step 4: 카메라 설정

- Main Camera를 `DemoController`의 `Main Camera`에 연결

---

## 🎮 사용 방법

### 실행

1. Unity에서 Play 버튼 클릭
2. 20명의 플레이어가 랜덤하게 생성됨
3. 플레이어들이 자동으로 움직임
4. 좌측 상단에 컨트롤 버튼 표시
5. 우측에 통계 UI 표시

### 컨트롤

- **Start/Stop**: 시뮬레이션 시작/정지
- **Reset Statistics**: 통계 초기화
- **Add 10 Players**: 플레이어 10명 추가
- **Remove 10 Players**: 플레이어 10명 제거

### 통계 확인

#### Full State (빨간색)
- **Packets**: 전송한 패킷 수
- **Total**: 총 전송 바이트
- **Rate**: 초당 전송 속도 (B/s, KB/s)

#### Delta Compression (초록색)
- **Packets**: 전송한 패킷 수
- **Total**: 총 전송 바이트
- **Rate**: 초당 전송 속도
- **Skipped**: 변화 없어서 건너뛴 패킷 수

#### 비교 (Comparison)
- **Saved**: 절약한 바이트 수 및 비율
- **Compression Ratio**: 압축 비율 (예: 8.5x = 8.5배 절약)

---

## 📊 예상 결과

### 20명 기준 (약 30% 움직임)

| 방식 | 초당 트래픽 | 10분 후 |
|------|------------|---------|
| Full State | ~8-10 KB/s | ~5 MB |
| Delta | ~1-2 KB/s | ~0.7 MB |
| **절약** | **~7배** | **~7배** |

### 100명 기준

| 방식 | 초당 트래픽 | 10분 후 |
|------|------------|---------|
| Full State | ~40-50 KB/s | ~25 MB |
| Delta | ~5-8 KB/s | ~3.5 MB |
| **절약** | **~8배** | **~7배** |

---

## 🔧 커스터마이징

### DemoController

```csharp
public int initialPlayerCount = 20;  // 초기 플레이어 수
public float spawnRadius = 8f;        // 스폰 반경
```

### PlayerMovement

```csharp
public float moveSpeed = 2f;              // 이동 속도
public float moveChangeInterval = 2f;     // 방향 변경 주기
public float stopProbability = 0.3f;      // 정지 확률 (30%)
```

### FullStateSync / DeltaSync

```csharp
public float syncInterval = 0.05f;       // 50ms = 20fps
public float deltaThreshold = 0.01f;     // 델타 임계값 (1cm)
public float fullSyncInterval = 5f;      // 전체 동기화 주기 (5초)
```

---

## 🎓 학습 포인트

### 1. Full State 방식의 문제점

- 움직이지 않아도 패킷 전송
- y축 변화 없어도 매번 전송
- 플레이어 수에 비례하여 트래픽 증가

### 2. Delta 압축의 장점

- 변화 없으면 전송 안 함 → **Skipped 패킷 확인**
- 변화량만 전송 (21 bytes → 13 bytes)
- 약 **8-10배 트래픽 절약**

### 3. Delta 압축의 단점

- 패킷 유실 시 오차 누적
- 주기적 Full State 필요 (5초마다)
- CPU 연산 약간 증가

### 4. 실전 적용

- 중요 이벤트: Full State (스킬 시전)
- 일반 이동: Delta
- 정지 캐릭터: 전송 안 함

---

## 🐛 트러블슈팅

### 문제: UI가 표시되지 않음

**해결**:
- Canvas의 Render Mode가 "Screen Space - Overlay"인지 확인
- EventSystem이 Hierarchy에 있는지 확인

### 문제: 플레이어가 생성되지 않음

**해결**:
- Player Prefab이 DemoController에 연결되었는지 확인
- PlayerMovement 스크립트가 Prefab에 있는지 확인

### 문제: 통계가 0으로 표시됨

**해결**:
- Comparison UI의 Sync References가 올바르게 연결되었는지 확인
- Full State Sync와 Delta Sync가 같은 GameObject에 있는지 확인

---

## 📝 코드 구조

```
DemoController.cs       - 메인 컨트롤러 (플레이어 생성, 시뮬레이션 관리)
├── PlayerMovement.cs   - 플레이어 움직임
├── FullStateSync.cs    - Full State 동기화
├── DeltaSync.cs        - Delta 압축 동기화
└── ComparisonUI.cs     - 통계 UI
```

---

## 🎥 GIF 제작 가이드

`GIF_GUIDE.md` 파일 참조

---

## 📚 참고 자료

- [Overwatch Netcode](https://www.youtube.com/watch?v=W3aieHjyNvw)
- [Valve Source Engine Networking](https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking)
- [Gabriel Gambetta - Fast-Paced Multiplayer](https://www.gabrielgambetta.com/client-server-game-architecture.html)

---

## 📄 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능
