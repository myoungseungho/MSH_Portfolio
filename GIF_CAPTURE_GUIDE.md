# GIF 캡처 가이드 - Fresnel 단계별 효과

> 각 단계를 GIF 애니메이션으로 캡처하여 GitHub Pages에 올리기

## 🎬 추천 도구

### 1. ScreenToGif (제일 추천! ⭐⭐⭐⭐⭐)

**특징**:
- ✅ 완전 무료, 오픈소스
- ✅ 사용하기 엄청 쉬움
- ✅ 강력한 편집 기능 (프레임 삭제, 속도 조절 등)
- ✅ 한국어 지원
- ✅ 파일 크기 최적화 가능
- ✅ 설치 필요 없는 포터블 버전도 있음

**다운로드**:
```
공식 사이트: https://www.screentogif.com/
또는
Microsoft Store에서 "ScreenToGif" 검색
```

**설치**:
1. 위 사이트 접속
2. "Download" 클릭
3. Installer 또는 Portable 다운로드
4. 설치 또는 압축 해제

---

### 2. ShareX (다기능 도구)

**특징**:
- ✅ 무료, 오픈소스
- ✅ GIF 외에도 스크린샷, 동영상 녹화 등 다양한 기능
- ✅ 자동 업로드 기능
- ❌ 조금 복잡할 수 있음

**다운로드**:
```
공식 사이트: https://getsharex.com/
또는
Microsoft Store에서 "ShareX" 검색
```

---

### 3. LICEcap (간단하고 가벼움)

**특징**:
- ✅ 무료
- ✅ 엄청 가볍고 간단
- ✅ 설치 즉시 사용 가능
- ❌ 편집 기능 없음

**다운로드**:
```
https://www.cockos.com/licecap/
```

---

## 🎥 ScreenToGif 사용법 (추천)

### 1. 녹화 시작

```
1. ScreenToGif 실행
2. "Recorder" 클릭
3. 녹화 창을 Fresnel 프로그램 위로 이동
4. 크기 조절 (프로그램 전체 또는 일부만)
5. "Record" 버튼 (빨간 버튼) 클릭
```

### 2. 녹화 중

```
1. 1키 누르기 → 2~3초 대기
2. 2키 누르기 → 2~3초 대기
3. 3키 누르기 → 2~3초 대기
4. 4키 누르기 → 2~3초 대기
5. 5키 누르기 → 2~3초 대기
6. "Stop" 버튼 클릭
```

### 3. 편집

**ScreenToGif 편집기가 자동으로 열림**:

#### 불필요한 프레임 삭제
- 앞뒤 불필요한 부분 선택 → Delete 키

#### 속도 조절
- Edit > Override Delay
- 100ms (빠름) ~ 500ms (느림) 추천
- 단계 전환 순간은 1000ms (1초) 권장

#### 텍스트 추가 (선택)
- Image > Caption
- "Step 1: 기본", "Step 2: dot(N,V)" 등 추가

#### 크기 조절 (용량 최적화)
- Image > Resize
- 너비: 800px ~ 1200px 권장

### 4. 저장

```
File > Save As
→ "GIF" 선택
→ 인코더: "FFmpeg" 또는 "System" 선택
→ 품질: "Medium" 또는 "High"
→ 저장 위치: MSH_Portfolio\Screenshots\
→ 파일명: fresnel_all_steps.gif
→ "Save" 클릭
```

---

## 📸 캡처 시나리오

### 시나리오 1: 전체 단계 (하나의 GIF)

**파일명**: `fresnel_all_steps.gif`

**내용**:
1. Step 1 (회색) → 2초
2. Step 2 (dot) → 2초
3. Step 3 (반전) → 2초
4. Step 4 (pow) → 2초
5. Step 5 (최종) → 3초

**장점**: 전체 과정을 한 번에 보여줌
**단점**: 파일 크기가 클 수 있음

---

### 시나리오 2: 개별 전환 (여러 GIF)

#### GIF 1: Step 1 → Step 2
**파일명**: `fresnel_step1_to_2.gif`
- Step 1 (2초) → Step 2 (2초)

#### GIF 2: Step 2 → Step 3
**파일명**: `fresnel_step2_to_3.gif`
- Step 2 (2초) → Step 3 (2초)

#### GIF 3: Step 3 → Step 4
**파일명**: `fresnel_step3_to_4.gif`
- Step 3 (2초) → Step 4 (2초)

#### GIF 4: Step 4 → Step 5
**파일명**: `fresnel_step4_to_5.gif`
- Step 4 (2초) → Step 5 (2초)

**장점**: 각 전환을 명확하게 보여줌
**단점**: 파일이 여러 개

---

### 시나리오 3: 파라미터 조정 (보너스)

**파일명**: `fresnel_parameter_demo.gif`

**내용**:
- Step 5 상태에서
- Q키 연타 (Power 감소) → 넓은 글로우
- W키 연타 (Power 증가) → 가는 글로우
- A키 연타 (Intensity 감소) → 어두움
- S키 연타 (Intensity 증가) → 밝음

**장점**: 인터랙티브한 면을 보여줌

---

## 💾 파일 크기 최적화

### ScreenToGif에서

1. **Options > Settings > Encoder**
   - Encoder: FFmpeg 선택 (가장 좋은 압축)
   - Quality: 90~95

2. **편집 시**
   - 해상도: 1200px 이하
   - 프레임 레이트: 15~30 FPS
   - 색상: 256 colors

3. **목표 파일 크기**
   - 전체 단계 GIF: 5MB 이하
   - 개별 전환 GIF: 1~2MB
   - 파라미터 데모: 3MB 이하

---

## 🌐 HTML 페이지에 GIF 추가

### 기존 PNG 대신 GIF 사용

```html
<!-- Before (PNG) -->
<img src="../../../Screenshots/fresnel_step5.png" alt="Step 5">

<!-- After (GIF) -->
<img src="../../../Screenshots/fresnel_all_steps.gif" alt="Fresnel 전체 단계">
```

### GIF + 설명 조합

```html
<div class="img-container">
    <img src="../../../Screenshots/fresnel_all_steps.gif" alt="Fresnel 5단계 과정">
    <p class="img-caption">
        Fresnel 효과 5단계: 기본 → dot(N,V) → 반전 → pow() → 최종 색상
    </p>
</div>
```

### 개별 GIF로 각 단계 설명

```html
<h3>Step 1 → Step 2: dot(N,V) 시각화</h3>
<div class="img-container">
    <img src="../../../Screenshots/fresnel_step1_to_2.gif" alt="Step 1에서 2로">
    <p class="img-caption">회색 구체 → 정면 밝음, 가장자리 어두움</p>
</div>

<h3>Step 2 → Step 3: 반전 효과</h3>
<div class="img-container">
    <img src="../../../Screenshots/fresnel_step2_to_3.gif" alt="Step 2에서 3으로">
    <p class="img-caption">1 - dot(N,V)로 가장자리가 밝아짐!</p>
</div>
```

---

## 📋 체크리스트

### 녹화 전 준비
- [ ] ScreenToGif 설치
- [ ] Fresnel 프로그램 실행
- [ ] 창 크기 적절하게 조정
- [ ] 배경 정리 (다른 창 닫기)

### 녹화
- [ ] 전체 단계 GIF (1~5키)
- [ ] 또는 개별 전환 GIF (1→2, 2→3, 3→4, 4→5)
- [ ] (선택) 파라미터 조정 데모 (Q/W/A/S키)

### 편집
- [ ] 불필요한 프레임 삭제
- [ ] 속도 조절 (각 단계 2~3초)
- [ ] 크기 조절 (800~1200px)
- [ ] (선택) 텍스트 캡션 추가

### 저장
- [ ] GIF 형식
- [ ] FFmpeg 인코더
- [ ] 파일 크기 확인 (5MB 이하)
- [ ] `MSH_Portfolio\Screenshots\` 폴더에 저장

### HTML 업데이트
- [ ] `01-fresnel/index.html` 수정
- [ ] GIF 경로 추가
- [ ] 설명 문구 추가

### Git
- [ ] `git add .`
- [ ] `git commit -m "Add: Fresnel 단계별 GIF 애니메이션"`
- [ ] `git push`

---

## 🎯 추천 워크플로우

### 빠른 방법 (추천)

1. **ScreenToGif 다운로드 & 설치** (5분)
   - https://www.screentogif.com/

2. **Fresnel 프로그램 실행**

3. **전체 단계 GIF 하나 녹화** (1분)
   - 1키 → 2초 대기 → 2키 → 2초 대기 → ... → 5키

4. **편집** (3분)
   - 앞뒤 자르기
   - 속도 조절
   - 크기 조절

5. **저장** (1분)
   - `fresnel_all_steps.gif`
   - `MSH_Portfolio\Screenshots\`

6. **HTML에 추가** (2분)
   - `<img src="...fresnel_all_steps.gif">`

7. **Git 커밋 & 푸시** (1분)

**총 소요 시간: 약 13분**

---

## 💡 팁

### 부드러운 전환을 위해
- 각 단계마다 2~3초 대기
- 전환 순간은 천천히 (1초 대기)

### 파일 크기 줄이기
- 해상도: 1200px 이하
- 프레임 삭제: 비슷한 프레임 제거
- 색상: 256 colors로 제한

### 보기 좋게 만들기
- 배경 단색 (검정 또는 어두운 파란색)
- 구체가 중앙에 오도록
- 텍스트 캡션 추가 ("Step 1", "Step 2" 등)

---

**ScreenToGif 설치하고 바로 녹화해보세요!** 🎬
**5분이면 멋진 GIF를 만들 수 있습니다!** ✨
