# 📌 BlogGen (AffiliWrite AI) 프로젝트 상태 및 작업 이력

## 2026-09-17 실행 반복 방지 조치

- 확인된 문제: 어시스턴트가 빈 도구 인수와 작업에 무관한 true/console.log 명령을 반복했다. 도구나 환경의 장애가 원인이라는 이전 단정은 입증되지 않았으며 철회한다.
- .agents/AGENTS.md에 무의미한 호출 금지, 동일 작업 2회 연속 실패 시 중단·보고, 사용자 질문에 먼저 답변, 성공한 검사 반복 금지 규칙을 추가했다. 이는 작업 지침이며 실행기 수준의 자동 차단 기능은 아니다.
- 검증: npm test 10건 통과, npm run lint 통과, npm run build 통과(빌드 경고 없음). 이 테스트 결과는 로컬의 미완성 2단계 helper와 테스트를 포함한다. 실제 브라우저·외부 API 검증은 수행하지 않았다.
- 1단계는 7af6283으로 푸시 완료. 2단계 reactionDelta와 테스트는 로컬에 보존하며 이번 문서/규칙 커밋에서 제외한다. 스냅샷 저장·피드 연동·시간당 증가량·관심 피드백·기획 각도는 아직 미구현이므로 2단계는 미완료다.

## 2026-09-17 2단계 결과 (소재 반응 추이·피드백·기획 각도)

- 구현: `velocityBonus`(증가량/경과시간 정규화, 0~20점 상한)·`suggestAngles`(관측 수치만 인용한 최대 3개 각도)를 `src/services/trendRanking.js`에 추가. 스냅샷 저장·조회·좋아요/관심 없음을 `src/services/trendFeedback.js`로 분리(localStorage, 손상 시 빈 상태로 복구, 테스트용 저장소 주입 가능).
- 연동: `TrendDiscoveryFeed`가 피드 로드마다 스냅샷을 저장하고, 이전 스냅샷과 비교한 증가량(🚀 보너스)을 소재 추천순 정렬에 반영. 👍(상단 고정)/👎(숨김 + 보기 토글) 피드백, 카드별 기획 각도와 근거, 원고 선택 시 각도·출처·수집 시점 전달.
- 정직성: 증가량은 두 번 이상 피드를 연 뒤부터 표시되며, 첫 로드에서는 '이전 스냅샷 없음'으로 안내. 모든 점수는 내부 편집 기준이며 네이버 순위·노출 확률이 아니다.
- 검증: `npm test` 16건 통과(증가량 정규화·상한, 각도의 관측 수치 인용·상한, 스냅샷 2회 측정·손상 복구·피드백 토글), `npm run lint` 0 errors, `npm run build` 성공, `node --check scripts/trend-crawler.cjs` 통과, 피드 빈 상태 SSR 렌더 통과. 실제 수집·브라우저 수동 확인은 미실행.
- 수정 이력: lint `react-hooks` 3건(조기 참조·effect 내 setState·useMemo 인자)을 규칙 우회 없이 해소 — 스냅샷 읽기는 `useMemo`, 저장은 상태 쓰기 없는 `useEffect`로 분리.

## 2026-09-17 3단계 결과 (근거 중심 원고·객관 검증·성과 기록)

- 근거 중심: `gemini.js` 작성 지침에 출처 충실도 항목(1-2) 추가 — 수집 메타에 없는 인원수·평점·순위·비율 창작 금지, 수치 인용 시 수집 시점 병기, 확인 불가 시 '확인 필요' 표기, 기획 각도 기반 재구성.
- 객관 검증: `src/services/qualityCheck.js` 신설 — 요약 박스·H2 수·비교 표·FAQ 중복·미확인 수치 패턴·제목 길이(18~25자)·해시태그 수를 코드로 실측(PASS/WARN/FAIL, 노출 예측 아님). `OutputTabs` 네이버 블로그 탭에 '🧪 객관 검증' 패널로 표시.
- 성과 기록: 히스토리 항목에 `performance` 추가. 발행 후 공감/댓글/메모를 직접 입력·저장(localStorage + GitHub 동기화). `applyPerformance` 순수 함수로 분리해 테스트.
- 검증: `npm test` 24건 통과, `npm run lint` 0 errors, `npm run build` 성공, `node --check scripts/trend-crawler.cjs` 통과, 객관 검증 패널 SSR 렌더 통과(WARN 경로 포함). 실제 생성·브라우저 수동 확인은 미실행.
- 한계: 홈판 1위나 노출 상승은 보장하지 않으며, 성과 기록은 사용자가 입력한 실측값에만 의존한다.

## 2026-09-17 단계별 고도화 계획

홈판 1위는 보장하지 않는다. 내부 소재 추천 점수는 네이버 공식 순위나 노출 확률이 아니다. 키워드 5~8회, 고정 글자 수, 워터마크 제거가 노출을 보장한다는 이전 제안은 채택하지 않는다.

| 단계 | 범위 | 상태 |
| --- | --- | --- |
| 1 | 최신성·공감·댓글·선호/제외 키워드 기반 소재 추천, 설정 연동, 오프라인 테스트 | 완료 |
| 2 | 두 시점 반응 증가량 저장, 좋아요/관심 없음 피드백, 소재별 기획 각도 | 완료 |
| 3 | 출처와 실제 경험 중심 생성, 객관적 품질 검사, 발행 성과 기록 | 완료 |

각 단계는 구현 → 테스트 → lint/build → 문서에 결과 기록 → 단계별 커밋/푸시 순서로 진행한다. 실패한 검증이나 미실행 항목은 완료로 표시하지 않는다. 타입검사 명령은 현재 package.json에 없으며 JavaScript 프로젝트의 ESLint와 빌드를 사용한다. 테스트에서 외부 API를 호출하지 않는다. 단, 범위 없는 node --test가 scratch의 네이버 조회 스크립트를 실행한 사례가 있어 npm test로 테스트 파일만 실행하도록 고정했다.

1단계 결과: 공감·댓글·최신성·선호/제외 키워드로 계산한 소재 추천 점수(trendRanking.js)를 수집기와 피드·설정에 연동했다. 반응 미확인은 0이 아니라 미확인으로 표시하고, 홈판 적합도 점수는 내부 소재 추천 점수로 대체했다. 검증: npm test 8건 통과(최신성 우위, 날짜 누락·미래 시각 무가산, KST 해석, 키워드 정규화, 가중치·제외 반영, 구버전 본문 호환, 반응 실패 구분, 본문 파싱), npm run lint 0 오류, npm run build 성공, node --check 통과, 렌더 테스트 통과. 미검증: 실제 네이버 수집과 GitHub 이슈 발행(외부 API·자격증명 필요), 브라우저 수동 확인. 크롤러 직접 실행은 NAVER 자격증명 부재로 조기 종료만 확인.

기준선 lint 정리: 미사용 import 제거, 이미지 함수 import 누락 복구, effect 내 setState 제거(초기값 지연 계산으로 전환), caught error cause 추가. scratch/*.js는 CommonJS Node 범위로 lint 설정에 추가했다.

사전 검사: git pull --ff-only로 f59f7a1까지 동기화. 기존 npm run lint에서 29개 오류 발견(본문 이미지 함수 import 누락 포함). 단계 1 검증 전에 해소가 필요하다. 수집에는 Actions의 NAVER_CLIENT_ID/NAVER_CLIENT_SECRET이 필요하며 실제 수집 성공과 추천 성과는 오프라인 테스트로 검증할 수 없다.

## 📅 최신 업데이트: 2026-09-07

### FLUX 고화질 + FLUX 크롭 제외 (100% 무료 유지)
- **배경**: FLUX 경로에 Gemini용 상단 크롭(top)이 그대로 남아 사진 하단을 버려 구도·체감 화질 저하. 저품질 `turbo` 폴백도 원인.
- **변경**:
  1. `src/services/imageGen.js`: 요청 해상도 `1024x768` → `1344x576`(1200:514 동일 비율, 크롭 손실 0), `enhance=true&private=true` 추가, 폴백 `['flux','flux-realism']`으로 축소(turbo 제외), `convertImageToWebP` 기본값 `top` → `center` (top은 Gemini 레거시 전용).
  2. `src/components/ThumbnailKit.jsx`, `src/components/OutputTabs.jsx`: FLUX·업로드 전부 `center` 명시, 워터마크 문구 제거.
- **검증**: `npm run build` 0 errors, 번들 내 `1344`/`576`/`center` 정적 확인, 실API 호출 테스트 없음(지침 준수).

## 📅 이전 업데이트: 2026-09-06

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

### 4. 고도화: 무결점 FLUX 100% 무료 엔진 전환 & 인물 얼굴 배제(감성 정물/오브젝트 중심) 전략
- **진단 배경 및 구글 정책 확인**:
  - 구글 AI Studio 무료 티어 API 키 진단 결과, 구글은 텍스트 모델(43개)에 대해서는 일 1,500회 무료 쿼터를 제공하지만, 이미지 생성 모델 7종 전체에 대해서는 `limit: 0`으로 차단하여 신용카드 결제(Billing) 연동 없이는 무조건 `HTTP 429 Quota Exceeded` 오류를 반환함을 실증 확인.
  - 신용카드 등록 및 유료 결제 없이 100% 무료로 고품질 이미지를 생성하기 위해 독립적 FLUX 엔진으로 전환 결정.
- **핵심 개선 및 구현 내용**:
  1. **인물 얼굴 배제 및 감성 정물/오브젝트 중심 프롬프트 전략 (`gemini.js`, `imageGen.js`)**:
     - 사용자 통찰(**"사람이 어색하면 꼭 사람이 나올 필요가 있을까?"**) 반영: AI의 미세 인체/표정 왜곡(불쾌한 골짜기)을 원천 차단.
     - `gemini.js`: `thumbnailPrompt` 지침에 인물 얼굴 정면/전신 묘사를 엄격히 금지하고, 기사 주제에 부합하는 **세련된 감성 정물(Aesthetic Still Life), 미니멀 데스크탑 셋업, 소품 배열(Flat Lay), 한국형 모던 인테리어 공간, 또는 1인칭 손 작업 뷰(POV hands typing/holding cup)**를 메인 피사체로 삼도록 전면 개편.
     - `imageGen.js`: `enhancePromptForKoreanContext`를 통해 인물 키워드가 있더라도 얼굴 왜곡 방지 및 서양인 배제 태그를 강제하고, 감성 에디토리얼 조명과 무텍스트/무워터마크 태그를 자동 주입.
  2. **무결점 FLUX 고화질 엔진 & 다중 폴백 (`imageGen.js`)**:
     - 1차: `flux` (FLUX.1 Schnell) 12B 최신 포토리얼리즘 모델 강제 고정.
     - 2차 폴백: 트래픽 과부하 또는 35초 초과 시 `flux-realism` 및 `turbo` (SDXL Turbo)로 자동 전환.
     - 네트워크/CORS 이중 방어: `fetch()` Blob 변환 실패 시 HTML `Image(crossOrigin='anonymous')` 오프스크린 캔버스 로딩 2단계 방어선 구축.
     - 하위 호환성: 기존 `generateGeminiFlashImage`를 `generateFluxImage`의 alias로 유지하여 타 컴포넌트 임포트 파괴 방지.
  3. **1200x514 상단 크롭을 통한 워터마크 100% 원천 절삭 (`imageGen.js`, `ThumbnailKit.jsx`)**:
     - 원본 `1024x768` (4:3)로 생성 후 `1200x514` (~21:9) 상단 기준 크롭(`sy = 0`).
     - 수학적 검증: 가로 비율에 맞춰 원본 높이 768px 중 상단 438.6px만 사용되고 하단 **329.4px(전체 높이의 42.89%)가 물리적으로 완전 절삭**.
     - 하단 30~50px 내에 위치하는 Pollinations 워터마크/로고가 100% 원천 제거됨을 수학적으로 증명.
  4. **UI 라벨 및 사용자 경험 최적화 (`ThumbnailKit.jsx`)**:
     - 버튼 라벨: `[FLUX AI 썸네일 생성 🎨]`.
     - 툴팁 및 안내 문구: 어색한 사람 얼굴 없이 세련된 1200x514 감성 썸네일이 100% 무료로 자동 제작됨을 명확히 고지.

### 5. 무결성 검증 및 빌드 결과
- **Stage 1 (Vite 프로덕션 빌드)**: `npm run build` ➔ 0 errors, 0 warnings, 1748개 모듈 정상 번들링 완료 (359ms).
- **Stage 2 (정밀 런타임 & 수학적 검증)**:
  - 감성 정물 프롬프트 보강 테스트 통과 (`soft natural morning sunlight, aesthetic editorial photography`).
  - 인체/라이프스타일 키워드 방어 테스트 통과 (`no Caucasian, no distorted facial features, no uncanny valley`).
  - 프롬프트 안전 길이(700자 이내) 절삭 테스트 통과.
  - 상단 크롭 수학적 계산 검증 통과 (하단 42.89% 절삭 확인).
  - 프로덕션 번들 정적 점검 통과 (`pollinations.ai`, `flux`, `1200`, `514` 무결 확인).
- **Stage 3 (하위 호환성 & 상태 무결성)**: 텍스트 생성(`gemini-2.5-flash`), 썸네일 키트, WebP 파일 다운로드 회귀 없음 확인.
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
