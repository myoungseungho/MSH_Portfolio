# 🎥 GIF 시각 자료 제작 가이드

델타 압축 데모의 시각 자료를 만드는 방법

---

## 🎯 필요한 GIF 목록

### Step 1: 문제 상황 (Full State)
**파일명**: `step1-fullstate.gif`

**내용**: 모든 플레이어가 매번 전체 위치를 전송하는 모습

**캡처 방법**:
1. 플레이어 10명으로 시작
2. Full State 통계에 집중
3. 트래픽이 계속 증가하는 모습 캡처
4. 5-10초 분량

**강조 포인트**:
- 📊 Full State 트래픽이 계속 증가
- ⚠️ 움직이지 않는 플레이어도 패킷 전송
- 🔴 빨간색 통계 증가 속도

---

### Step 2: 델타 압축 (Delta)
**파일명**: `step2-delta.gif`

**내용**: 변화량만 전송하는 모습

**캡처 방법**:
1. 플레이어 10명
2. Delta 통계에 집중
3. Skipped 패킷 수 증가 확인
4. 5-10초 분량

**강조 포인트**:
- 📉 Delta 트래픽이 Full State보다 적음
- ✅ Skipped 패킷 증가 (변화 없는 플레이어)
- 🟢 초록색 통계 증가 느림

---

### Step 3: 비교 (Comparison)
**파일명**: `step3-comparison.gif`

**내용**: Full State vs Delta 동시 비교

**캡처 방법**:
1. 플레이어 20-30명
2. 양쪽 통계를 동시에 보여주기
3. Comparison 섹션 강조
4. 10-15초 분량

**강조 포인트**:
- 📊 두 방식의 트래픽 차이 명확히
- 💰 Saved 바이트 수
- 🔢 Compression Ratio (예: 8.5x)

---

### Step 4: 플레이어 증가 효과
**파일명**: `step4-scaling.gif`

**내용**: 플레이어 수 증가 시 차이 극대화

**캡처 방법**:
1. 10명으로 시작
2. "Add 10 Players" 버튼 2-3회 클릭
3. 30-40명까지 증가
4. 트래픽 차이 확대 확인
5. 15-20초 분량

**강조 포인트**:
- 📈 플레이어 증가 시 Full State 트래픽 급증
- 📉 Delta는 상대적으로 완만하게 증가
- 💡 스케일링 효과

---

### Step 5: 정지 vs 움직임
**파일명**: `step5-movement.gif`

**내용**: 움직임에 따른 패킷 차이

**캡처 방법**:
1. 플레이어 10명
2. Stop 버튼으로 잠시 정지
3. Delta Skipped 패킷 증가 확인
4. Start로 다시 시작
5. 10-15초 분량

**강조 포인트**:
- ⏸️ 정지 시 Skipped 패킷 급증
- ▶️ 재시작 시 패킷 전송 재개
- 🎯 "변화 없으면 전송 안 함" 원리

---

## 🛠️ 녹화 도구

### 추천 도구

1. **ScreenToGif** (무료, Windows)
   - 다운로드: https://www.screentogif.com/
   - 장점: 편집 기능, 최적화
   - 설정: 15-20 FPS, 최적화 ON

2. **LICEcap** (무료, Windows/Mac)
   - 다운로드: https://www.cockos.com/licecap/
   - 장점: 가볍고 간단
   - 설정: 15 FPS

3. **OBS Studio** (무료, 모든 OS)
   - 다운로드: https://obsproject.com/
   - 장점: 고품질
   - 설정: mp4 녹화 → GIF 변환 필요

---

## 📐 GIF 사양

### 기본 설정

| 항목 | 값 |
|------|-----|
| 해상도 | 1280x720 (16:9) |
| FPS | 15-20 |
| 길이 | 5-15초 |
| 파일 크기 | <5MB |
| 색상 | 256 colors |

### 최적화 팁

1. **해상도 줄이기**
   - Unity Game View를 1280x720로 설정
   - 전체 화면 말고 Game View만 캡처

2. **FPS 낮추기**
   - 15-20 FPS면 충분
   - 30 FPS는 파일 크기만 커짐

3. **길이 줄이기**
   - 5-10초가 적당
   - 반복 재생 활용

4. **압축하기**
   - https://ezgif.com/optimize
   - "Remove every 2nd frame" 옵션

---

## 🎨 편집 가이드

### ScreenToGif 사용 시

1. **불필요한 프레임 삭제**
   - 시작/끝 부분 정리
   - 중간에 멈춘 부분 제거

2. **타이틀 추가**
   - `Insert` → `Text`
   - 예: "Step 1: Full State Method"
   - 위치: 상단 중앙
   - 크기: 36px
   - 색상: 흰색, 검은색 테두리

3. **강조 표시**
   - `Image` → `Border`
   - 중요한 통계에 빨간색 박스
   - 예: Compression Ratio 주위

4. **최적화**
   - `File` → `Save As`
   - Format: GIF
   - Encoder: FFmpeg (최고 압축)

---

## 📋 캡처 체크리스트

### 촬영 전

- [ ] Unity Game View 해상도: 1280x720
- [ ] 카메라 높이 적절히 설정
- [ ] UI 폰트 크기 확인 (너무 작지 않게)
- [ ] 배경 깔끔하게 (검은색 or 회색)

### 촬영 중

- [ ] 마우스 커서 움직임 최소화
- [ ] 중요한 수치에 집중
- [ ] 5-10초 유지
- [ ] 갑작스러운 움직임 피하기

### 촬영 후

- [ ] 불필요한 프레임 제거
- [ ] 타이틀 추가
- [ ] 파일 크기 확인 (<5MB)
- [ ] 반복 재생 테스트

---

## 🎬 시나리오별 가이드

### Step 1: Full State (문제 상황)

```
[0-2초] 타이틀 "Step 1: Full State Method"
[2-5초] 플레이어들이 움직임
[5-8초] Full State 트래픽 증가 확인
[8-10초] "모든 플레이어가 매번 전송" 강조
```

**캡처 영역**:
- 왼쪽: Game View (플레이어들)
- 오른쪽: Full State 통계

---

### Step 2: Delta (해결책)

```
[0-2초] 타이틀 "Step 2: Delta Compression"
[2-5초] 플레이어들이 움직임
[5-8초] Skipped 패킷 증가 확인
[8-10초] "변화 없으면 전송 안 함" 강조
```

**캡처 영역**:
- 왼쪽: Game View
- 오른쪽: Delta 통계 (Skipped 강조)

---

### Step 3: 비교 (결과)

```
[0-2초] 타이틀 "Step 3: Comparison"
[2-5초] 양쪽 통계 동시 확인
[5-10초] Compression Ratio 강조
[10-12초] Saved 바이트 수 강조
```

**캡처 영역**:
- 전체 화면 (양쪽 통계 모두)

---

## 💡 고급 기법

### 1. 하이라이트 효과

**방법**: ScreenToGif
1. 중요한 프레임 선택
2. `Image` → `Drawing`
3. 빨간색 원 or 화살표 그리기

**예시**:
- Compression Ratio 8.5x → 빨간색 원
- Skipped 패킷 → 초록색 화살표

---

### 2. 속도 조절

**방법**: ScreenToGif
1. `Edit` → `Change Speed`
2. 지루한 부분 2x 빠르게
3. 중요한 부분 1x 또는 0.5x 느리게

**예시**:
- 플레이어 생성: 2x
- 통계 변화: 1x
- Compression Ratio 표시: 0.5x

---

### 3. 화면 분할

**방법**: After Effects / Premiere (선택사항)
1. Full State와 Delta를 나란히
2. 동시에 비교

**레이아웃**:
```
┌─────────────┬─────────────┐
│ Full State  │    Delta    │
│             │             │
└─────────────┴─────────────┘
```

---

## ✅ 최종 체크

### 품질 확인

- [ ] 텍스트 읽기 쉬운가?
- [ ] 핵심 메시지 전달되는가?
- [ ] 파일 크기 적절한가? (<5MB)
- [ ] 반복 재생 시 자연스러운가?

### 내용 확인

- [ ] Step 1: Full State 문제점 명확
- [ ] Step 2: Delta 해결책 명확
- [ ] Step 3: 비교 결과 명확
- [ ] 수치 정확한가? (8-10배 절약)

---

## 📤 파일 저장

### 저장 위치

```
study/delta-compression/images/
├── step1-fullstate.gif
├── step2-delta.gif
├── step3-comparison.gif
├── step4-scaling.gif
└── step5-movement.gif
```

### HTML에 삽입

```html
<div class="visual-section">
    <h4>Step 1: Full State 방식</h4>
    <img src="./images/step1-fullstate.gif" alt="Full State" class="step-gif">
    <p class="gif-caption">모든 플레이어가 매번 전체 위치 전송</p>
</div>
```

---

## 🎓 완성된 GIF 예시 설명

### step1-fullstate.gif

**보여줄 것**:
1. 플레이어 10명 움직임
2. Full State Packets 빠르게 증가
3. Bytes/s 높은 수치 유지
4. "멈춘 캐릭터도 패킷 전송" 강조

### step2-delta.gif

**보여줄 것**:
1. 플레이어 10명 움직임
2. Delta Packets 상대적으로 느리게 증가
3. Skipped 숫자 증가
4. "변화 없으면 안 보냄" 강조

### step3-comparison.gif

**보여줄 것**:
1. 양쪽 통계 동시 표시
2. Saved: ~7 KB (70%)
3. Compression Ratio: 8.5x
4. 명확한 차이

---

**완료되면 이 가이드 체크**: ✅

- [ ] Step 1 GIF 제작
- [ ] Step 2 GIF 제작
- [ ] Step 3 GIF 제작
- [ ] Step 4 GIF 제작 (선택)
- [ ] Step 5 GIF 제작 (선택)
- [ ] HTML 문서에 삽입
- [ ] 최종 확인
