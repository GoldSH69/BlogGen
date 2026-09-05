# 📌 BlogGen (AffiliWrite AI) 프로젝트 상태 및 작업 이력

## 📅 최신 업데이트: 2026-09-05

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
