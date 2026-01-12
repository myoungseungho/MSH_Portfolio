# ShaderTechniques 프로젝트 빌드 가이드

## 프로젝트 구조

```
ShaderTechniques/
├── src/
│   ├── Framework/
│   │   ├── DXApp.h / .cpp        # DirectX 기본 프레임워크
│   │   ├── Camera.h / .cpp        # 카메라
│   │   └── Mesh.h / .cpp          # 메시 (구체 생성)
│   ├── FresnelApp.h / .cpp        # Fresnel 데모 앱
│   └── main.cpp                    # 진입점
│
├── Shaders/
│   ├── Fresnel_VS.hlsl                    # Vertex Shader (공통)
│   ├── Fresnel_Step1_Basic_PS.hlsl       # Step 1: 기본 단색
│   ├── Fresnel_Step2_DotNV_PS.hlsl       # Step 2: dot(N,V) 시각화
│   ├── Fresnel_Step3_Invert_PS.hlsl      # Step 3: 반전
│   ├── Fresnel_Step4_Power_PS.hlsl       # Step 4: pow() 적용
│   └── Fresnel_Step5_Final_PS.hlsl       # Step 5: 최종 색상
│
└── BUILD_GUIDE.md                 # 이 파일
```

## Visual Studio 2019 프로젝트 생성

### 1. 새 프로젝트 만들기

```
파일 > 새로 만들기 > 프로젝트
→ "Windows 데스크톱 애플리케이션" 선택
→ 프로젝트 이름: ShaderTechniques
→ 위치: C:\Users\gnidev0095\OneDrive\바탕 화면\MSH_P\ShaderTechniques
→ 만들기
```

### 2. 기존 파일 제거

- 자동 생성된 파일들 제거 (framework.h, Resource.h 등)

### 3. 프로젝트에 파일 추가

**소스 파일 추가**:
- src/main.cpp
- src/FresnelApp.h / .cpp
- src/Framework/DXApp.h / .cpp
- src/Framework/Camera.h / .cpp
- src/Framework/Mesh.h / .cpp

**솔루션 탐색기에서**:
- 소스 파일 우클릭 → 추가 → 기존 항목
- 해당 파일들 선택하여 추가

**쉐이더 파일 추가** (빌드하지 않음):
- Shaders/ 폴더의 모든 .hlsl 파일
- 필터 만들기: "Shaders" 필터 생성
- 각 .hlsl 파일 우클릭 → 속성 → 구성: 모든 구성
  - 빌드에서 제외: 예 (Yes)

### 4. 프로젝트 속성 설정

**모든 구성, x64 플랫폼 선택**

#### C/C++ > 일반
- 추가 포함 디렉터리: `$(ProjectDir)src;%(AdditionalIncludeDirectories)`

#### C/C++ > 언어
- C++ 언어 표준: `ISO C++17 표준 (/std:c++17)`

#### C/C++ > 전처리기
- 전처리기 정의 (Debug): `_DEBUG;_WINDOWS;%(PreprocessorDefinitions)`
- 전처리기 정의 (Release): `NDEBUG;_WINDOWS;%(PreprocessorDefinitions)`

#### C/C++ > 코드 생성
- 런타임 라이브러리 (Debug): `다중 스레드 디버그 DLL (/MDd)`
- 런타임 라이브러리 (Release): `다중 스레드 DLL (/MD)`

#### 링커 > 시스템
- 하위 시스템: `창(/SUBSYSTEM:WINDOWS)`

#### 링커 > 입력
- 추가 종속성: `d3d11.lib;d3dcompiler.lib;dxguid.lib;%(AdditionalDependencies)`

#### 링커 > 일반
- 출력 디렉터리 (Debug): `$(SolutionDir)bin\Debug\`
- 출력 디렉터리 (Release): `$(SolutionDir)bin\Release\`

### 5. 플랫폼 설정

- 구성 관리자에서 x64 플랫폼 선택 (x86 제거 가능)

## 빌드 및 실행

### 빌드

```
빌드 > 솔루션 빌드 (Ctrl+Shift+B)
```

### 실행

```
디버그 > 디버깅 시작 (F5)
또는
디버그 > 디버깅하지 않고 시작 (Ctrl+F5)
```

### 실행 시 쉐이더 경로 문제 해결

프로젝트는 상대 경로 `../../Shaders/`로 쉐이더를 로드합니다.

**작업 디렉터리 설정**:
1. 프로젝트 우클릭 → 속성
2. 디버깅 > 작업 디렉터리
3. 설정: `$(ProjectDir)src`

이렇게 하면 `src/` 폴더에서 실행되어 `../../Shaders/` 경로가 정상 작동합니다.

## 사용법

### 키 조작

#### 단계 전환 (Step 1~5)
- **1키**: Step 1 - 기본 단색 구체
- **2키**: Step 2 - dot(N,V) 시각화
- **3키**: Step 3 - 1-dot(N,V) 반전
- **4키**: Step 4 - pow() 적용
- **5키**: Step 5 - 최종 색상 (청록색 글로우)

#### 파라미터 조정
- **Q/W키**: Fresnel Power 감소/증가 (0.5 ~ 10.0)
- **A/S키**: Fresnel Intensity 감소/증가 (0.1 ~ 5.0)
- **ESC키**: 종료

### 카메라
- 자동으로 구체 주위를 회전합니다.

## 단계별 효과 설명

### Step 1: 기본 단색 (회색)
- 목적: 기본 렌더링 확인
- 쉐이더: `Fresnel_Step1_Basic_PS.hlsl`
- 결과: 회색 구체

### Step 2: dot(N,V) 시각화
- 목적: 노말과 시선 벡터의 내적 값 확인
- 공식: `dot(N, V)`
- 결과: 정면은 밝고 (1.0), 가장자리는 어둡다 (0.0)

### Step 3: 반전 효과
- 목적: 가장자리를 밝게 만들기
- 공식: `1 - dot(N, V)`
- 결과: 정면은 어둡고, 가장자리는 밝다

### Step 4: Power 적용
- 목적: 가장자리만 강조
- 공식: `pow(1 - dot(N, V), power) * intensity`
- 결과: 가장자리만 더 강하게 빛남
- 조절: Q/W키로 Power 조정, A/S키로 Intensity 조정

### Step 5: 최종 색상
- 목적: 예쁜 청록색 글로우 효과
- 공식: `color * pow(1 - dot(N, V), power) * intensity`
- 결과: 청록색 외곽 글로우 완성!
- 알파 블렌딩 활성화

## 스크린샷 캡처

각 단계(1~5)마다 스크린샷을 캡처하여 다음 위치에 저장:
```
MSH_Portfolio/Screenshots/
├── fresnel_step1.png
├── fresnel_step2.png
├── fresnel_step3.png
├── fresnel_step4.png
└── fresnel_step5.png
```

**캡처 방법**:
- PrintScreen 키 → 그림판에 붙여넣기 → 저장
- 또는 Windows + Shift + S (화면 캡처 도구)

## 트러블슈팅

### 쉐이더 컴파일 에러
- Output 창에 오류 메시지 확인
- 경로가 올바른지 확인: `../../Shaders/`
- .hlsl 파일이 프로젝트에 포함되어 있는지 확인

### 검은 화면만 나옴
- 쉐이더가 정상적으로 로드되었는지 확인
- 카메라 위치 확인 (0, 0, -5)
- 메시가 정상적으로 생성되었는지 확인

### 빌드 에러: DirectX 헤더 찾을 수 없음
- Windows SDK 설치 확인
- Visual Studio Installer에서 "Windows 10 SDK" 설치

### 실행 시 작업 디렉터리 오류
- 프로젝트 속성 > 디버깅 > 작업 디렉터리를 `$(ProjectDir)src`로 설정

## 다음 단계

1. **빌드 성공 확인**
2. **각 Step(1~5) 실행 및 스크린샷 캡처**
3. **MSH_Portfolio/Screenshots/에 이미지 저장**
4. **HTML 페이지 업데이트**
5. **Git 커밋 & 푸시**
6. **GitHub Pages 확인**

---

**모든 코드가 준비되었습니다! Visual Studio에서 프로젝트를 열고 빌드해보세요!** 🚀
