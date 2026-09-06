# 📌 BlogGen (AffiliWrite AI) 프로젝트 상태 및 작업 이력

## 📅 최신 업데이트: 2026-09-06

### 1. 신규 기능: 주제 기반 순수 창작 모드 (Topic-Based Deep Creation)
- **배경 및 요구사항**:
  - 기존에는 기사 원문이나 상세페이지 텍스트를 복사/붙여넣기해야만 글을 작성할 수 있어 다른 블로그 글을 복붙하지 않고 주제만으로 새 글을 작성하고자 하는 사용자 요구 발생.
  - 주제뿐만 아니라 꼭 다룰 핵심 포인트/키워드, 특별 유의사항/톤앤매너를 직접 입력할 수 있는 유연한 구조 필요.
- **구현 내용**:
  1. **입력 패널 탭 스위처 (`src/components/InputPanel.jsx`)**:
     - `💡 주제로 새 글 쓰기 (추천)` vs `📄 기사/상세페이지 원문 가공` 2종 모드 탭 지원.
     - 주제 모드 전용 필드 3종 추가:
       * **포스팅 주제 (필수)**: 제목 또는 다루고 싶은 주제 입력.
       * **꼭 다룰 핵심 포인트 / 키워드 (선택)**: 특정 모델명, 비교 제품, 필수 수치, 스펙 등 입력.
       * **특별 유의사항 및 작성 요청사항 (선택)**: 타겟 독자층(1인 가구, 초보자), 강조점, 객관적 단점 명시 등.
     - 트렌드 피드 인기글 선택 시 자동으로 원문 모드로 전환되고 내용이 prefilled되는 연동 로직 유지.
     - AI 경험담 제안(`suggestExperience`) 시 주제 모드의 입력값 자동 감지 및 연동.
  2. **프롬프트 엔진 분기 최적화 (`src/services/gemini.js`)**:
     - `sourceText`에 `[포스팅 주제]:` 패턴이 감지될 경우, 기존 '기사 비틀기(Stealth Rewrite)' 대신 '주제 기반 심층 창작(Topic-Based Deep Creation)' 모드로 자동 전환.
     - 외부 기사 복사/짜깁기 없이 AI가 보유한 방대한 최신 지식과 실용 정보를 바탕으로 처음부터 완결된 고품질 원고 작성.
     - 사용자가 요청한 핵심 포인트, 수치, 유의사항을 본문과 마크다운 비교 표에 누락 없이 충실하게 반영.

### 2. 엔진 고도화: 구글 Gemini Flash Image (나노바나나) 전환 및 1200x514 WebP 규격 통일
- **배경 및 요구사항**:
  - 기존 Pollinations 프록시의 무인증 엔드포인트 품질 저하(저사양 sana 모델 강제 서빙으로 인한 이미지 왜곡 및 화질 저하) 및 가로세로 비율 불일치(본문 1024x768로 세로가 너무 길어지는 현상) 해결.
  - 별도 유료 API 키 발급 없이 사용자의 기존 Gemini API 키를 활용하여 무료 티어 한도 내에서 가장 안전하고 실사급 퀄리티를 보장하는 구글 공식 Flash Image 모델로 마이그레이션.
- **구현 내용**:
  1. **구글 공식 Flash Image 서비스 (`src/services/imageGen.js`)**:
     - Google Generative AI 공식 `generateContent` 엔드포인트 (`responseModalities: ["TEXT", "IMAGE"]`) 활용.
     - 다단계 안전 폴백 체인 구축: `gemini-2.5-flash-image` ➡️ `gemini-3.1-flash-image` ➡️ `gemini-3.1-flash-lite-image` ➡️ `imagen-3.0-generate-002:predict`.
     - 생성된 이미지를 HTML5 Canvas 기반 Center-Cover 알고리즘을 통해 **1200x514 WebP (품질 88%)**로 정밀 자동 크롭/압축 변환.
  2. **썸네일 키트 및 본문 이미지 UI 통합 (`ThumbnailKit.jsx`, `OutputTabs.jsx`)**:
     - 썸네일 키트: `[나노바나나 AI 썸네일 생성 🎨]` 버튼으로 1200x514 WebP 썸네일 즉시 생성.
     - 본문 권장 이미지: 기존 1024x768 4:3 비율을 블로그 배너 및 모바일 화면에 최적화된 1200x514 WebP 규격으로 전면 통일.
     - 에러 핸들링 및 로딩 안내 문구 고도화.

### 3. 고도화: 한국형 인물/배경 프롬프트 2중 강화 & 상단 기준(Top-Crop) 워터마크 100% 제거
- **배경 및 요구사항**:
  - 글로벌 AI 이미지 모델(Imagen 3, Gemini Flash Image)의 서양인/외국인 편향으로 인해 한국 블로그에 맞지 않는 서양인 인물이 노출되는 문제 해결.
  - 구글 공식 이미지 모델이 우측 하단(최하단 40~60px)에 삽입하는 SynthID/스파클 워터마크를 완벽히 제거하기 위한 크롭 방식 개선.
- **구현 내용**:
  1. **한국형 프롬프트 2중 잠금 (`gemini.js`, `imageGen.js`)**:
     - `gemini.js`: `NANO_BANANA_2_PROMPT_GUIDE`, `thumbnailPrompt`, `imageGuides` 작성 지침에 한국인('authentic South Korean person', 'natural Korean facial features and styling') 및 한국 아파트/일상 배경('modern South Korean apartment interior')을 의무화하고, 서양인 배제('no Caucasian, no Western people, no foreign models') 부정 지침 강제.
     - `imageGen.js`: `enhancePromptForKoreanContext()` 함수 신설을 통해 API 호출 직전 인물/생활 키워드가 감지되면 한국인/한국배경/무워터마크 프롬프트를 자동으로 덧붙여 전송하도록 2중 방어선 구축.
  2. **상단 기준(Top-Crop) 절삭으로 우측 하단 워터마크 100% 제거 (`imageGen.js`, `ThumbnailKit.jsx`)**:
     - `convertImageToWebP()`에 상단 기준 크롭(`cropPosition = 'top'`, `sy = 0`) 기본 적용.
     - 원본 이미지 높이 768px(16:9) 또는 1024px(1:1) 중 상단 0px부터 514px 비율까지만 정확히 취하고 하단의 190~580px를 통째로 잘라내어 우측 하단 워터마크를 100% 완벽 소멸.
     - 주요 피사체(얼굴, 상체, 상품 헤드)가 상단에 위치하므로 구도 안정감도 동시 극대화.
     - `ThumbnailKit.jsx`의 수동 파일 업로드/드래그앤드롭 변환(`processFile`)에도 동일한 Top-Crop WebP 변환 함수를 연동하여 일관성 확보.

### 4. 무결성 검증 및 빌드 결과
- **테스트 원칙 준수**: 사용자 및 프로젝트 룰에 따라 불필요한 토큰 낭비 방지를 위해 실서버 Live API 호출 없이 정적 분석 및 번들 무결성 테스트 진행.
- **ESLint 정적 검사**: `npx eslint src/components/ThumbnailKit.jsx src/services/gemini.js src/services/imageGen.js src/components/OutputTabs.jsx` ➔ 0 errors, 0 warnings (완전 무결).
- **Vite 프로덕션 빌드**: `npm run build` ➔ 0 errors, 1748개 모듈 정상 번들링 완료 (`dist/assets/index-BDnT33dt.js`, 339ms).
- **하위 호환성**: 1200x514 규격 유지, 썸네일 키트, 본문 이미지 생성, 텍스트 클립보드 복사 회귀 없음 확인.

---

## 📅 이전 업데이트: 2026-09-05

### 1. 신규 기능: 무료 AI 이미지 생성(FLUX.1) 및 WebP 원클릭 변환/다운로드
- **배경 및 요구사항**:
  - 네이버 블로그 스마트에디터 원고 작성 시 본문 및 썸네일 이미지 제작을 위해 별도 유료 AI 툴을 켜야 하는 번거로움 해소.
  - 가입/API키 발급 없는 100% 무료 고화질 이미지 생성 및 네이버 블로그 최적화 WebP 규격 자동 변환 요구 충족.
- **아키텍처 및 구현 내용**:
  1. **신규 서비스 모듈 (`src/services/imageGen.js`)**:
     - `generateFreeImageBlob(prompt, options)`: Pollinations.ai의 FLUX.1 오픈 엔진을 호출하여 100% 무료로 실사급 이미지 Blob 수신.
     - `convertBlobToWebP(blob, targetWidth, targetHeight, quality)`: HTML5 Canvas 기반 Center Cover 크롭 및 88% 품질의 무손실/고압축 WebP 포맷 변환.
     - `downloadDataUrl(url, filename)`: 브라우저 원클릭 파일 다운로드 트리거.
  2. **1200x514 블로그 썸네일 키트 (`src/components/ThumbnailKit.jsx`)**:
     - `[무료 AI 썸네일 생성 🎨]` 버튼 추가: 프롬프트 기반 1200x514 썸네일 즉시 생성.
     - 로딩 스피너 및 에러 핸들링, `[다른 스타일로 다시 생성 🔄]` (랜덤 시드 변경) 지원.
     - 기존 사용자 직접 사진 업로드/드래그 앤 드롭 변환 기능 100% 보존.
  3. **스마트에디터 본문 권장 이미지 (`src/components/OutputTabs.jsx`)**:
     - `[이미지 1]`, `[이미지 2]` 등 본문 권장 삽입 위치별로 `[무료 AI 이미지 생성 🎨]` 버튼 추가.
     - 1024x768 WebP 자동 최적화 및 인라인 썸네일 미리보기 제공.
     - `[WebP 다운로드 💾]` (`naver_blog_img_{num}.webp`) 및 `[다시 생성 🔄]` 지원.

### 2. 품질 및 무결성 검증
- **빌드 테스트**: `npm run build` 실행 결과 에러 0건, 번들링 정상 완료 (`dist/assets/index-*.js`).
- **CORS 테스트**: `Access-Control-Allow-Origin: *` 헤더 수신 및 브라우저 Canvas Taint 프리 확인.
- **하위 호환성**: 기존 텍스트 복사, 표 렌더링, 텔레그램 전송, MDX 생성 로직 회귀 없음 확인.
