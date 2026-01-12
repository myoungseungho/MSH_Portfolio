# Fresnel Shader - Step by Step Implementation

> DirectX 11 기반 Fresnel 효과 단계별 구현 프로젝트

## 🎯 프로젝트 개요

Fresnel 효과를 **5단계**로 나누어 구현하고, 각 단계마다 어떻게 효과가 쌓이는지 시각적으로 보여주는 학습 프로젝트입니다.

## 📁 파일 구조

```
ShaderTechniques/
│
├── src/
│   ├── Framework/
│   │   ├── DXApp.h / .cpp        # DirectX 기본 프레임워크
│   │   ├── Camera.h / .cpp        # 카메라 (자동 회전)
│   │   └── Mesh.h / .cpp          # 구체 메시 생성
│   │
│   ├── FresnelApp.h / .cpp        # Fresnel 데모 애플리케이션
│   └── main.cpp                    # 진입점
│
├── Shaders/
│   ├── Fresnel_VS.hlsl                    # Vertex Shader (공통)
│   │
│   ├── Fresnel_Step1_Basic_PS.hlsl       # Step 1: 기본 회색 구체
│   ├── Fresnel_Step2_DotNV_PS.hlsl       # Step 2: dot(N,V) 시각화
│   ├── Fresnel_Step3_Invert_PS.hlsl      # Step 3: 1-dot(N,V) 반전
│   ├── Fresnel_Step4_Power_PS.hlsl       # Step 4: pow() 가장자리 강조
│   └── Fresnel_Step5_Final_PS.hlsl       # Step 5: 최종 색상 (청록색 글로우)
│
├── BUILD_GUIDE.md                 # 빌드 및 실행 가이드
└── README.md                      # 이 파일
```

## 🚀 빠른 시작

### 1. Visual Studio 2019 프로젝트 생성

```
1. Visual Studio 2019 실행
2. 파일 > 새로 만들기 > 프로젝트
3. "Windows 데스크톱 애플리케이션" 선택
4. 프로젝트 이름: ShaderTechniques
5. 위치: 이 폴더 (MSH_P\ShaderTechniques)
6. 만들기
```

### 2. 프로젝트 설정

**자세한 내용은 `BUILD_GUIDE.md` 참고**

- 플랫폼: x64
- C++ 표준: C++17
- 추가 종속성: `d3d11.lib;d3dcompiler.lib;dxguid.lib`
- 작업 디렉터리: `$(ProjectDir)src`

### 3. 파일 추가

- src/ 폴더의 모든 .h/.cpp 파일 추가
- Shaders/ 폴더의 모든 .hlsl 파일 추가 (빌드에서 제외)

### 4. 빌드 및 실행

```
빌드: Ctrl+Shift+B
실행: F5
```

## 🎮 사용법

### 키 조작

#### 단계 전환 (핵심!)
- **1키**: Step 1 - 기본 단색 (회색)
- **2키**: Step 2 - dot(N,V) 시각화
- **3키**: Step 3 - 1-dot(N,V) 반전
- **4키**: Step 4 - pow() 가장자리 강조
- **5키**: Step 5 - 최종 색상 (청록색 글로우)

#### 파라미터 조정
- **Q / W**: Fresnel Power 감소/증가 (0.5 ~ 10.0)
- **A / S**: Fresnel Intensity 감소/증가 (0.1 ~ 5.0)
- **ESC**: 종료

### 카메라
- 자동으로 구체 주위를 회전합니다.

## 📸 단계별 스크린샷 캡처

각 단계를 실행하면서 스크린샷을 캡처하세요:

1. 프로그램 실행
2. **1키** → PrintScreen → 그림판 붙여넣기 → `fresnel_step1.png` 저장
3. **2키** → PrintScreen → `fresnel_step2.png` 저장
4. **3키** → PrintScreen → `fresnel_step3.png` 저장
5. **4키** → PrintScreen → `fresnel_step4.png` 저장
6. **5키** → PrintScreen → `fresnel_step5.png` 저장

**저장 위치**: `MSH_Portfolio/Screenshots/`

## 🎓 5단계 학습 과정

### Step 1: 기본 단색 구체
- **목적**: 기본 렌더링 확인
- **코드**: `return float4(0.5, 0.5, 0.5, 1.0);`
- **결과**: 회색 구체

### Step 2: dot(N, V) 시각화
- **목적**: 노말과 시선 벡터의 내적 값 확인
- **공식**: `dot(N, V)`
- **결과**: 정면 밝음(1.0), 가장자리 어두움(0.0)

### Step 3: 1 - dot(N, V) 반전
- **목적**: 가장자리를 밝게 만들기
- **공식**: `1 - dot(N, V)`
- **결과**: 정면 어두움(0.0), 가장자리 밝음(1.0)

### Step 4: pow() 가장자리 강조
- **목적**: Power 값으로 곡선 조절
- **공식**: `pow(1 - dot(N, V), power) * intensity`
- **결과**: 가장자리만 훨씬 강하게 빛남
- **파라미터**: Power=3.0, Intensity=2.0

### Step 5: 최종 색상 (완성!)
- **목적**: 예쁜 색상 적용
- **공식**: `FresnelColor * pow(1 - dot(N, V), power) * intensity`
- **결과**: 청록색 외곽 글로우 완성!
- **색상**: (0.3, 0.8, 1.0, 1.0) - 밝은 청록색

## 💡 학습 포인트

### 핵심 개념
1. **Dot Product**: 두 벡터의 방향 유사도 (-1 ~ 1)
2. **View Vector**: 픽셀에서 카메라로 향하는 방향
3. **Power Function**: 비선형 곡선 만들기
4. **Alpha Blending**: 투명도 적용

### 수학 공식 이해
```hlsl
// 1. 노말과 시선 벡터 계산
float3 N = normalize(input.Normal);
float3 V = normalize(CameraPos - input.WorldPos);

// 2. 내적 (각도가 작을수록 큰 값)
float NdotV = saturate(dot(N, V));

// 3. 반전 (가장자리를 밝게)
float fresnel = 1.0 - NdotV;

// 4. Power로 곡선 조절 (가장자리만 강조)
fresnel = pow(fresnel, FresnelPower);

// 5. 강도 배율
fresnel *= FresnelIntensity;

// 6. 최종 색상
float4 finalColor = FresnelColor * fresnel;
finalColor.a = fresnel;
```

## 🎨 응용 예시

### 게임에서의 활용
- **쉴드/보호막**: 캐릭터 주변 에너지 쉴드
- **홀로그램**: SF 게임의 홀로그램 효과
- **영혼/유령**: 반투명 영체 캐릭터
- **마법 버프**: 스킬 사용 시 외곽 글로우

### 다른 기법과 조합
- **+ Dissolve**: 소환 효과 (서서히 나타남)
- **+ Scan Line**: 홀로그램 (다음 과제!)
- **+ Vertex Animation**: 파동치는 쉴드
- **+ Depth Fade**: 지오메트리 교차시 부드럽게

## 🔧 트러블슈팅

### 쉐이더 컴파일 에러
- Output 창에서 오류 메시지 확인
- 경로 확인: `../../Shaders/` (src 폴더 기준)
- .hlsl 파일이 프로젝트에 포함되었는지 확인

### 검은 화면만 나옴
- 쉐이더가 정상 로드되었는지 확인
- 카메라 위치 확인 (0, 0, -5)
- 메시 생성 성공 여부 확인

### 빌드 에러
- Windows SDK 설치 확인
- x64 플랫폼 선택 확인
- d3d11.lib 등 라이브러리 링크 확인

## 📚 다음 단계

1. **프로젝트 빌드 및 실행**
2. **각 Step(1~5) 스크린샷 캡처**
3. **Screenshots 폴더에 이미지 저장**
4. **GitHub Pages 업데이트**
   - HTML 페이지에 이미지 반영 확인
   - Git 커밋 & 푸시
5. **다음 테크닉 도전!**
   - 02. Toon Shading
   - 03. Dissolve
   - 04. Hologram

## 📖 참고 문서

- **BUILD_GUIDE.md**: 상세한 빌드 및 실행 가이드
- **MSH_Portfolio/study/shader-techniques/01-fresnel/**: 학습 정리 HTML 페이지
- **DIRECTX_SETUP_GUIDE.md**: DirectX 11 프로젝트 세팅 가이드

---

**모든 코드가 준비되었습니다!**
**Visual Studio 2019에서 프로젝트를 생성하고 빌드해보세요!** 🚀

단계별로 효과가 쌓이는 과정을 직접 눈으로 확인하실 수 있습니다.
