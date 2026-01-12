# DirectX 11 프로젝트 세팅 가이드 (Visual Studio 2019)

> 쉐이더 테크닉 학습을 위한 DirectX 11 기본 프로젝트 세팅

## 🎯 목표

각 쉐이더 테크닉을 하나씩 구현하고 학습 내용을 정리하는 프로젝트를 만듭니다.

## 📋 사전 준비

### 1. Windows SDK 설치 확인
- Visual Studio Installer 실행
- "개별 구성 요소" 탭
- Windows 10 SDK (10.0.xxxxx) 체크 확인

### 2. DirectX 개발 환경
- DirectX 11은 Windows SDK에 포함되어 있음
- 별도 다운로드 불필요

## 🚀 프로젝트 생성

### 1. 새 프로젝트 만들기
```
파일 > 새로 만들기 > 프로젝트
→ Windows 데스크톱 애플리케이션
→ 이름: ShaderTechniques
→ 위치: MSH_P 폴더
```

### 2. 프로젝트 속성 설정

#### 구성: 모든 구성, 플랫폼: x64

**C/C++ > 일반**
- 추가 포함 디렉터리: (기본값)

**링커 > 입력**
- 추가 종속성: `d3d11.lib;d3dcompiler.lib;dxguid.lib` 추가

**C/C++ > 언어**
- C++ 언어 표준: ISO C++17 표준(/std:c++17)

**C/C++ > 코드 생성** (Debug 구성)
- 런타임 라이브러리: 다중 스레드 디버그 DLL(/MDd)

**C/C++ > 코드 생성** (Release 구성)
- 런타임 라이브러리: 다중 스레드 DLL(/MD)

## 📁 권장 프로젝트 구조

```
ShaderTechniques/
│
├── src/                          # 소스 코드
│   ├── main.cpp                  # 진입점
│   ├── Framework/                # 공통 프레임워크
│   │   ├── DXApp.h/.cpp         # DirectX 기본 앱 클래스
│   │   ├── Camera.h/.cpp        # 카메라
│   │   ├── Mesh.h/.cpp          # 메시 데이터
│   │   └── Utils.h/.cpp         # 유틸리티
│   │
│   └── Techniques/               # 각 테크닉별 구현
│       ├── 01_Fresnel/
│       ├── 02_ToonShading/
│       ├── 03_Hologram/
│       └── ...
│
├── Shaders/                      # HLSL 쉐이더 파일
│   ├── Common.hlsli             # 공통 헤더
│   ├── 01_Fresnel_VS.hlsl
│   ├── 01_Fresnel_PS.hlsl
│   ├── 02_ToonShading_VS.hlsl
│   ├── 02_ToonShading_PS.hlsl
│   └── ...
│
├── Assets/                       # 리소스
│   ├── Textures/
│   └── Models/
│
└── Screenshots/                  # 결과 스크린샷 (GitHub Pages용)
    ├── 01_fresnel.png
    ├── 02_toonshading.png
    └── ...
```

## 🎨 쉐이더 테크닉 학습 순서 (권장)

### 1단계: 기초 (3개) ⭐
1. **Fresnel (프레넬)** - 외곽 글로우
   - 가장 기본적인 효과
   - `dot(N, V)` 이해
   - 공식: `pow(1 - saturate(dot(N, V)), power)`

2. **Toon Shading (툰 쉐이딩)** - 만화 음영
   - 조명 기초 복습
   - `step()`, `smoothstep()` 활용
   - Lambert 조명 → 계단식 변환

3. **Dissolve (디졸브)** - 사라지는 효과
   - 텍스처/노이즈 샘플링
   - `clip()` 함수 이해
   - 타임라인 애니메이션

### 2단계: 중급 (3개) ⭐⭐
4. **Hologram (홀로그램)** - SF 홀로그램 효과
   - Fresnel + 스캔라인 + 노이즈 조합
   - `frac()`, UV 조작
   - 여러 효과 레이어링

5. **Outline (외곽선)** - 캐릭터 테두리
   - 노말 확장 기법
   - 백페이스 렌더링
   - 두 패스 렌더링

6. **Screen Distortion (화면 왜곡)** - 히트 웨이브
   - UV 왜곡
   - 노이즈 기반 오프셋
   - 시간 기반 애니메이션

### 3단계: 고급 (2개) ⭐⭐⭐
7. **Water/Wave (물/파도)** - 물 표면
   - 사인파 중첩
   - 노말맵 왜곡
   - 반사/굴절 시뮬레이션
   - UV 스크롤링

8. **Fire/Smoke (불/연기)** - 파티클 효과
   - Perlin Noise 구현/사용
   - UV 스크롤 + 왜곡
   - 알파 블렌딩
   - 다중 레이어 합성

## 💻 기본 DirectX 11 템플릿 코드

### main.cpp (진입점)
```cpp
#include "Framework/DXApp.h"
#include <Windows.h>

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE, LPSTR, int nCmdShow)
{
    DXApp app;
    if (!app.Initialize(hInstance, 1280, 720, L"Shader Techniques"))
        return -1;

    return app.Run();
}
```

### DXApp.h (기본 프레임워크)
```cpp
#pragma once
#include <d3d11.h>
#include <DirectXMath.h>
#include <wrl/client.h>
#include <string>

using Microsoft::WRL::ComPtr;
using namespace DirectX;

class DXApp
{
public:
    bool Initialize(HINSTANCE hInstance, int width, int height, const std::wstring& title);
    int Run();
    void Shutdown();

protected:
    virtual void OnResize();
    virtual void Update(float deltaTime) = 0;
    virtual void Render() = 0;

    // DirectX 객체
    ComPtr<ID3D11Device> m_device;
    ComPtr<ID3D11DeviceContext> m_context;
    ComPtr<IDXGISwapChain> m_swapChain;
    ComPtr<ID3D11RenderTargetView> m_renderTargetView;
    ComPtr<ID3D11DepthStencilView> m_depthStencilView;
    D3D11_VIEWPORT m_viewport;

    HWND m_hwnd;
    int m_width, m_height;

private:
    bool InitWindow(HINSTANCE hInstance, const std::wstring& title);
    bool InitD3D();
    static LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam);
};
```

## 🎓 각 테크닉 학습 프로세스

### 1단계: 이해하기
- 효과의 원리 이해
- 수학적 공식 분석
- 실사용 사례 조사

### 2단계: 구현하기
- HLSL 쉐이더 작성
- C++ 코드 연동
- 파라미터 조정 가능하도록

### 3단계: 문서화하기
- 스크린샷 캡처
- HTML 페이지 작성 (포트폴리오 양식)
- 코드 설명 + 수식 정리
- 학습 포인트 정리

### 4단계: 배포하기
- 스크린샷 → `Screenshots/` 폴더
- HTML → `study/shader-techniques/[기법명]/` 폴더
- GitHub 커밋 & 푸시
- GitHub Pages 업데이트 확인

## 📝 HTML 페이지 작성 템플릿

각 테크닉 문서에 포함할 내용:
1. **개요**: 효과 설명 + 스크린샷
2. **원리**: 수학 공식, 알고리즘 설명
3. **구현**: HLSL 코드 + 주석
4. **파라미터**: 조정 가능한 값들
5. **응용**: 실제 게임에서의 사용 예
6. **학습 포인트**: 핵심 개념 정리
7. **참고 자료**: 링크

## 🔧 유용한 팁

### 쉐이더 컴파일
```cpp
#include <d3dcompiler.h>

ID3DBlob* CompileShader(const std::wstring& filename, const char* entryPoint, const char* target)
{
    UINT flags = D3DCOMPILE_ENABLE_STRICTNESS;
#ifdef _DEBUG
    flags |= D3DCOMPILE_DEBUG;
#endif

    ID3DBlob* shaderBlob = nullptr;
    ID3DBlob* errorBlob = nullptr;

    HRESULT hr = D3DCompileFromFile(
        filename.c_str(),
        nullptr,
        D3D_COMPILE_STANDARD_FILE_INCLUDE,
        entryPoint,
        target,
        flags,
        0,
        &shaderBlob,
        &errorBlob
    );

    if (FAILED(hr) && errorBlob)
    {
        OutputDebugStringA((char*)errorBlob->GetBufferPointer());
        errorBlob->Release();
        return nullptr;
    }

    if (errorBlob) errorBlob->Release();
    return shaderBlob;
}
```

### 상수 버퍼 (Constant Buffer)
```cpp
// HLSL
cbuffer PerFrame : register(b0)
{
    matrix ViewProj;
    float3 CameraPos;
    float Time;
};

cbuffer PerObject : register(b1)
{
    matrix World;
    float4 Color;
};

// C++
struct PerFrameCB
{
    XMMATRIX ViewProj;
    XMFLOAT3 CameraPos;
    float Time;
};
```

### 기본 Vertex Shader 템플릿
```hlsl
struct VS_INPUT
{
    float3 Position : POSITION;
    float3 Normal : NORMAL;
    float2 TexCoord : TEXCOORD;
};

struct PS_INPUT
{
    float4 Position : SV_POSITION;
    float3 WorldPos : POSITION;
    float3 Normal : NORMAL;
    float2 TexCoord : TEXCOORD;
};

PS_INPUT main(VS_INPUT input)
{
    PS_INPUT output;

    float4 worldPos = mul(float4(input.Position, 1.0f), World);
    output.Position = mul(worldPos, ViewProj);
    output.WorldPos = worldPos.xyz;
    output.Normal = normalize(mul(input.Normal, (float3x3)World));
    output.TexCoord = input.TexCoord;

    return output;
}
```

## 🎯 다음 단계

1. **첫 번째 테크닉 선택**: Fresnel 추천
2. **기본 프레임워크 구축**: DXApp, Camera, Mesh 클래스
3. **테스트 씬 구성**: 구/육면체 메시
4. **첫 쉐이더 구현**: Fresnel Vertex + Pixel Shader
5. **문서화**: HTML 페이지 작성
6. **배포**: GitHub Pages 업로드

---

**준비 완료되면 첫 번째 테크닉(Fresnel)부터 시작하겠습니다!**
