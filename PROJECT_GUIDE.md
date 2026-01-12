# MSH Portfolio - 프로젝트 가이드

> 게임 서버 개발 학습 기록 & 포트폴리오 웹사이트

## 📋 프로젝트 개요

- **목적**: 게임 서버 개발 관련 학습 내용을 정리하고 공유하는 정적 포트폴리오 사이트
- **기술 스택**: HTML, CSS, JavaScript (순수 바닐라, 프레임워크 없음)
- **호스팅**: GitHub Pages (정적 사이트)
- **작성자**: myoungseungho

## 🗂️ 프로젝트 구조

```
MSH_Portfolio/
│
├── index.html                # 메인 페이지 (카테고리 개요)
│
└── study/                    # 학습 기록 디렉토리
    │
    ├── category-db/          # 카테고리 페이지들
    ├── category-thread/
    ├── category-web/
    ├── category-gpu/
    ├── category-cs/
    │
    ├── redis/                # 주제별 상세 페이지들
    ├── connection-pool/
    ├── lock-free/
    ├── ring-buffer/
    ├── web-basics/
    ├── js-execution/
    ├── web-auth/
    ├── payment-system/
    ├── compute-shader/
    ├── gpu-architecture/
    ├── shader-techniques/
    ├── cpu-basics/
    ├── network/
    │
    └── version-system/       # 비공개 학습 기록 (암호 필요)
        server-move/
        log-server/
```

## 🎯 주요 기능

### 1. 메인 페이지 (index.html)
- **5개 카테고리 카드 그리드**:
  - DB / 캐시 (녹색)
  - 멀티스레드 / 네트워크 (주황)
  - 웹서버 Node.js (파랑)
  - GPU / 그래픽스 (보라)
  - CS 기초 (회색)
- **비밀 입구 기능**:
  - 푸터의 작은 점을 클릭하면 모달 오픈
  - 암호 "1234" 입력시 비공개 학습 기록 접근 가능
  - 3개 비공개 주제: 버전/번들 시스템, 서버 이동 시스템, 로그 서버 시스템

### 2. 카테고리 페이지 (category-*/index.html)
- 해당 카테고리의 주제 목록을 카드 형태로 표시
- 각 카드는 주제 상세 페이지로 링크
- "메인으로" 백링크 제공

### 3. 주제 상세 페이지 (**/index.html)
- 학습 내용 상세 설명
- 코드 예제 (syntax highlighting)
- 네비게이션 (메인, 카테고리로 돌아가기)
- 일관된 스타일 적용

## 🎨 디자인 시스템

### 색상 체계
- **배경**: `#fafafa` (연한 회색)
- **카드 배경**: `white`
- **텍스트**: `#111` (제목), `#333` (본문), `#666` (보조)
- **카테고리별 강조색**:
  - DB: `#4CAF50` (녹색)
  - Thread: `#FF9800` (주황)
  - Web: `#2196F3` (파랑)
  - GPU: `#9C27B0` (보라)
  - CS: `#607D8B` (회색)

### 타이포그래피
- **폰트**: Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI'
- **제목 크기**: 2.5rem (메인 h1), 1.4rem (섹션 제목)
- **본문**: 1rem, line-height 1.6~1.8

### 레이아웃
- **최대 너비**: 1200px (메인), 900px (콘텐츠 페이지)
- **그리드**: `repeat(auto-fill, minmax(320px, 1fr))` (카테고리 카드)
- **카드**: 16px border-radius, hover시 translateY(-4px)

## 📝 콘텐츠 추가 방법

### 새 주제 추가하기

1. **새 폴더 생성**
   ```bash
   mkdir study/new-topic
   ```

2. **index.html 생성**
   - 기존 주제 페이지를 템플릿으로 복사
   - 제목, 메타 정보, 본문 내용 수정
   - 네비게이션 링크 경로 확인

3. **카테고리 페이지에 카드 추가**
   - 해당 `category-*/index.html` 열기
   - `.card-grid` 내에 새 카드 추가:
   ```html
   <a href="../new-topic/" class="card">
       <h3 class="card-title">주제 제목</h3>
       <p class="card-desc">간단한 설명</p>
   </a>
   ```

4. **메인 페이지 업데이트**
   - `index.html`의 해당 카테고리 카드 수정
   - `category-items` 리스트에 주제 추가
   - `category-count` 개수 업데이트

### 새 카테고리 추가하기

1. **카테고리 폴더 생성**
   ```bash
   mkdir study/category-newcat
   ```

2. **카테고리 인덱스 페이지 생성**
   - 기존 카테고리 페이지 복사하여 수정

3. **메인 페이지에 카테고리 카드 추가**
   ```html
   <a href="./study/category-newcat/" class="category-card newcat">
       <div class="category-icon">🔥</div>
       <h3 class="category-title">새 카테고리</h3>
       <p class="category-desc">카테고리 설명</p>
       <ul class="category-items">
           <li>주제 1</li>
           <li>주제 2</li>
       </ul>
       <span class="category-count">2개 주제</span>
   </a>
   ```

4. **스타일 추가**
   ```css
   .category-card.newcat {
       border-top: 4px solid #색상코드;
   }
   ```

## 🔒 비밀 패널 시스템

### 동작 방식
1. 푸터의 작은 점(`.secret-trigger`) 클릭
2. 오버레이 모달(`.secret-overlay`) 표시
3. 암호 입력 필드 포커스
4. "1234" 입력 시 링크 목록 표시
5. ESC 또는 오버레이 클릭으로 닫기

### 암호 변경
`index.html:468`의 `SECRET_CODE` 변수 수정:
```javascript
const SECRET_CODE = "1234";  // 원하는 암호로 변경
```

### 비공개 주제 추가
`index.html:437-458`의 `.secret-links` 내에 링크 추가:
```html
<a href="./study/new-secret-topic/" class="secret-link">
    <span class="link-icon">🔥</span>
    <div class="link-info">
        <h3>새 비공개 주제</h3>
        <p>설명</p>
    </div>
</a>
```

## 💡 개발 팁

### 코드 하이라이팅
- `<pre>` 태그로 코드 블록 작성
- 배경색: `#1e1e1e`, 텍스트: `#d4d4d4`
- 인라인 코드: `<code>` 태그 사용

### 반응형 고려사항
- 그리드는 자동으로 반응형 (`auto-fill, minmax()`)
- 모바일: 최소 280px~320px 카드 너비
- 패딩: `padding: 60px 20px` (좌우 여백 보장)

### 성능 최적화
- 외부 라이브러리 없음 (순수 HTML/CSS/JS)
- 이미지 최소화 (아이콘은 이모지 사용)
- 빠른 로딩 속도

## 📊 현재 콘텐츠 현황

### DB / 캐시 (2개)
- Redis vs MSSQL 랭킹 성능 비교
- Connection Pool 82배 성능 향상

### 멀티스레드 / 네트워크 (2개)
- Lock-Free 자료구조, CAS
- 링버퍼 (Ring Buffer)

### 웹서버 Node.js (4개)
- 브라우저 vs 웹서버 개념
- JS 코드 실행 방식 (C++ 비교)
- 웹서버 인증 시스템 (토큰, JWT)
- 인앱 결제 시스템

### GPU / 그래픽스 (3개)
- Compute Shader 개념과 구현
- GPU 아키텍처 기초
- 쉐이더 테크닉 카탈로그 (예정)

### CS 기초 (1개)
- CPU 기본 동작 원리

### 비공개 (3개)
- 버전 & 번들 시스템
- 서버 이동 시스템
- 로그 서버 시스템

## 🚀 다음 작업시 참고사항

### 일관성 유지
- 모든 페이지는 동일한 스타일 시스템 사용
- 네비게이션 구조 통일 (← 메인으로, ← 카테고리로)
- 색상, 폰트, 간격 일관성 유지

### 콘텐츠 작성 가이드
- 제목은 명확하고 간결하게
- 코드 예제는 실제 동작하는 코드 사용
- 설명은 단계별로 구조화
- 시각적 자료 활용 (다이어그램, 표 등)

### Git 커밋 메시지 스타일
```
Add: 새 기능/페이지 추가
Update: 기존 내용 수정
Fix: 버그 수정
Style: 디자인 변경
Docs: 문서 업데이트
```

### 배포 (GitHub Pages)
1. GitHub 저장소에 푸시
2. Settings → Pages → Source: main branch 선택
3. 사이트 주소: `https://myoungseungho.github.io/MSH_Portfolio/`

## 🔗 링크

- **GitHub 저장소**: https://github.com/myoungseungho/MSH_Portfolio
- **GitHub 프로필**: https://github.com/myoungseungho

---

**작성일**: 2026-01-12
**마지막 업데이트**: 2026-01-12
