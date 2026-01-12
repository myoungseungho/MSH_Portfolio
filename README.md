# MSH Portfolio - 쉐이더 테크닉 학습 프로젝트

## 🎯 프로젝트 개요
DirectX 11 기반으로 8가지 쉐이더 테크닉을 직접 구현하고 학습 내용을 GitHub Pages에 정리하는 프로젝트입니다.

## 📚 학습 진행 상황

### ✅ 완료 (1/8)
- [x] 01. Fresnel (프레넬 효과) - 외곽 글로우

### 🔄 진행 예정 (7/8)
- [ ] 02. Toon Shading - 툰 쉐이딩
- [ ] 03. Dissolve - 디졸브
- [ ] 04. Hologram - 홀로그램
- [ ] 05. Outline - 외곽선
- [ ] 06. Screen Distortion - 화면 왜곡
- [ ] 07. Water/Wave - 물/파도
- [ ] 08. Fire/Smoke - 불/연기

## 📁 프로젝트 구조

```
MSH_P/
│
├── MSH_Portfolio/                    # GitHub Pages 저장소 (클론됨)
│   ├── index.html                    # 메인 페이지
│   ├── study/
│   │   └── shader-techniques/
│   │       ├── index.html            # 쉐이더 테크닉 목록
│   │       └── 01-fresnel/           # 첫 번째 테크닉 문서
│   │           └── index.html
│   └── Screenshots/                  # 결과 스크린샷 폴더
│
├── ShaderTechniques/                 # DirectX 프로젝트 (생성 예정)
│   ├── src/
│   │   ├── Framework/                # 공통 프레임워크
│   │   └── Techniques/               # 각 테크닉 구현
│   │       ├── 01_Fresnel/
│   │       ├── 02_ToonShading/
│   │       └── ...
│   ├── Shaders/                      # HLSL 파일
│   └── Assets/                       # 텍스처, 모델
│
├── PROJECT_GUIDE.md                  # 프로젝트 전체 가이드
├── DIRECTX_SETUP_GUIDE.md            # DirectX 세팅 가이드
├── LEARNING_ROADMAP.md               # 학습 로드맵
└── README.md                         # 이 파일
```

## 🚀 다음 단계

### 1. DirectX 프로젝트 생성
```
Visual Studio 2019 → 새 프로젝트
→ Windows 데스크톱 애플리케이션
→ 이름: ShaderTechniques
→ 위치: MSH_P 폴더
```

**자세한 내용**: `DIRECTX_SETUP_GUIDE.md` 참고

### 2. 기본 프레임워크 구축
- [ ] DXApp 클래스 (DirectX 초기화)
- [ ] Camera 클래스 (카메라 컨트롤)
- [ ] Mesh 클래스 (기본 도형)
- [ ] 쉐이더 컴파일 유틸리티

### 3. 첫 번째 테크닉 구현 (Fresnel)
- [ ] `01_Fresnel_VS.hlsl` 작성
- [ ] `01_Fresnel_PS.hlsl` 작성
- [ ] C++ 연동 코드
- [ ] 파라미터 조절 UI (ImGui 추천)

### 4. 문서화 & 배포
- [ ] 스크린샷 캡처 → `Screenshots/01_fresnel.png`
- [ ] HTML 페이지 내용 완성 (이미 템플릿 준비됨)
- [ ] Git 커밋 & 푸시
- [ ] GitHub Pages 확인

## 📖 참고 문서

### 학습 가이드
- **PROJECT_GUIDE.md**: 포트폴리오 사이트 전체 구조와 사용법
- **DIRECTX_SETUP_GUIDE.md**: DirectX 11 프로젝트 세팅 상세 가이드
- **LEARNING_ROADMAP.md**: 8가지 테크닉 학습 순서와 난이도

### 기존 학습 기록
- **MSH_Portfolio/study/**: 다른 주제들 (DB, 멀티스레드, 웹서버 등)
- **MSH_Portfolio/study/shader-techniques/01-fresnel/**: Fresnel 템플릿 (작성 완료)

## 💡 작업 흐름 (Workflow)

### 각 테크닉마다 반복할 프로세스:

1. **이론 학습**
   - 효과 원리 이해
   - 수학 공식 분석
   - 레퍼런스 수집

2. **구현**
   - HLSL 쉐이더 작성
   - C++ 연동
   - 파라미터 조정

3. **테스트 & 스크린샷**
   - 다양한 파라미터 실험
   - 최적 설정 찾기
   - 화면 캡처

4. **문서화**
   - HTML 페이지 작성/수정
   - 코드 설명 추가
   - 학습 포인트 정리

5. **배포**
   - Git 커밋
   - GitHub 푸시
   - Pages 확인

## 🛠️ 개발 환경

- **IDE**: Visual Studio 2019
- **API**: DirectX 11
- **언어**: C++17, HLSL
- **플랫폼**: Windows 10/11 (x64)

## 🌐 GitHub Pages

- **저장소**: https://github.com/myoungseungho/MSH_Portfolio
- **사이트**: https://myoungseungho.github.io/MSH_Portfolio/
- **쉐이더 테크닉 페이지**: https://myoungseungho.github.io/MSH_Portfolio/study/shader-techniques/

## 📝 커밋 메시지 컨벤션

```
Add: 새 테크닉 추가/구현
Update: 기존 내용 수정
Fix: 버그 수정
Docs: 문서 업데이트
Style: 디자인 변경
```

예시:
```bash
git add .
git commit -m "Add: Fresnel 쉐이더 구현 및 학습 정리"
git push origin master
```

## 🎓 학습 목표

이 프로젝트를 완료하면:
- ✅ DirectX 11 기본 파이프라인 이해
- ✅ HLSL 쉐이더 프로그래밍 숙달
- ✅ 8가지 핵심 쉐이더 테크닉 습득
- ✅ 수학적 원리와 실전 응용 연결
- ✅ 체계적인 학습 문서화 능력

---

**다음 작업**: `DIRECTX_SETUP_GUIDE.md`를 보고 프로젝트 생성 시작!
