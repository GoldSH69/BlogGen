/**
 * Gemini API Service for AffiliWrite AI
 */

const GEMINI_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash'
];

/**
 * Nano Banana 2 (Gemini image model) 전용 영문 이미지 프롬프트 작성 가이드.
 * - 나노바나나2는 Midjourney/DALL-E의 --ar, --no, --style 같은 파라미터 접미사를 무시하므로,
 *   자연스러운 영문 서술문(구문 형식) 프롬프트가 가장 잘 반응합니다.
 * - 완성도 높은 이미지를 위해 1) 피사체/장면 묘사, 2) 구도/카메라 앵글, 3) 조명, 4) 색감·무드,
 *   5) 사진/일러스트 스타일, 6) 가로형 넓은 화면 비율, 7) 텍스트·워터마크·로고 배제를 한 문장으로 녹여내야 합니다.
 */
const NANO_BANANA_2_PROMPT_GUIDE = `
- 이미지 생성 프롬프트는 반드시 **영문 자연어 서술문(Dense Description) 한 구절**로 작성하고, 단순 키워드 나열은 금지합니다.
- 다음 요소를 자연스럽게 조합하십시오: ① 피사체와 구성(장면에 무엇이 놓여 있는지), ② 구도·카메라 앵글(예: 45도 오버헤드 컷, 클로즈업 등), ③ 조명(예: 부드러운 창가 자연광, 스튜디오 소프트박스), ④ 색감·무드(은은한 따뜻한 톤 등), ⑤ 스타일(사실적 제품/푸드 포토그래피 또는 미니멀 일러스트), ⑥ 가로형 전체 비율(wide/landscape), ⑦ 텍스트·워터마크·로고·자막이 전혀 없이 깔끔하게(no text, no watermark).
- 사람이 등장하는 경우에는 항상 한국인(한국형 외모, Korean/East Asian)으로 묘사하도록 영문 단어를 포함하십시오.
- Midjourney의 '--ar 1200:514', '--no xxx', 반복 키워드 덤프 같은 파라미터 표기를 절대 추가하지 마십시오(나나바나2는 이를 무시함).`;

/**
 * Robustly extract a JSON object from a model response.
 * Handles ```json fences and stray surrounding text.
 */
function extractJson(text) {
  if (!text) return null;
  let t = text.trim();

  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/i);
  if (fence) t = fence[1].trim();

  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function postToGemini(model, apiKey, prompt, generationConfig) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'API 호출에 실패했습니다.');
  }

  const data = await response.json();
  const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) {
    throw new Error('AI의 응답 형식이 올바르지 않습니다.');
  }

  const parsed = extractJson(textResponse);
  if (!parsed) {
    throw new Error('AI의 응답을 유효한 JSON으로 파싱할 수 없습니다.');
  }
  return parsed;
}

async function executeWithFallback(apiKey, prompt, generationConfig) {
  let lastError = null;

  for (const model of GEMINI_MODELS) {
    try {
      console.log(`[Gemini] Attempting to call model: ${model}`);
      const result = await postToGemini(model, apiKey, prompt, generationConfig);
      console.log(`[Gemini] Success using model: ${model}`);
      return result;
    } catch (error) {
      console.warn(`[Gemini] Model ${model} failed:`, error.message);
      lastError = new Error(`[${model}] ${error.message}`);
    }
  }

  throw lastError || new Error('모든 Gemini 모델 호출에 실패했습니다.');
}

/**
 * Utility to get the API Key (reads from env or local storage fallback)
 */
export function getApiKey() {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  const localKey = localStorage.getItem('affiliwrite_gemini_api_key');
  return localKey || envKey || '';
}

/**
 * Save the API Key to local storage
 */
export function saveApiKey(key) {
  if (key) {
    localStorage.setItem('affiliwrite_gemini_api_key', key);
  } else {
    localStorage.removeItem('affiliwrite_gemini_api_key');
  }
}

/**
 * Primary experience suggestion helper that calls Gemini
 * @param {string} topic - The topic to brainstorm experience for
 * @param {string} keywords - The keywords to incorporate
 */
export async function suggestExperience(topic, keywords) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API Key가 설정되지 않았습니다. 설정 단추를 눌러 API 키를 입력해주세요.');
  }

  const prompt = `
당신은 네이버 블로그 DIA+ 알고리즘의 E-E-A-T(경험/전문성/신뢰성) 점수를 만족하기 위해 지극히 자연스럽고 사람 냄새 나는 개인의 체험담/경험담을 창작하는 마케팅 작가입니다.

[작성 대상 주제]: "${topic}"
[관련 키워드]: "${keywords}"

위 주제와 키워드에 대해, 블로그 글쓴이가 일상에서 겪었거나 혹은 이전에 비슷한 일로 겪었던 구체적이고 생생한 가상의 실패 또는 성공 에피소드(체험담) 2~3문장을 한글로 작성해 주세요.
로봇이 쓴 느낌이 나지 않도록 구어체 어미(~요, ~더라고요, ~했어요, ~인 것 같아요)를 자연스럽게 섞어서 문장을 완성하세요.

출력 형식: 반드시 아래 JSON 구조로만 응답해 주세요. 백틱(\`\`\`) 기호나 그 외 설명 텍스트는 일절 포함하지 말고 순수 JSON만 응답해 주세요.
\`\`\`json
{
  "experience": "여기에 2~3문장의 생생한 경험담을 작성해 주세요."
}
\`\`\`
`;

  try {
    const parsed = await executeWithFallback(apiKey, prompt, { responseMimeType: 'application/json' });
    return parsed.experience || '';
  } catch (error) {
    console.error('Gemini Experience Suggestion Error:', error);
    throw error;
  }
}

/**
 * Primary generation function that calls Gemini
 * @param {Object} params 
 * @param {string} params.sourceText - The original article or product info
 * @param {string} params.affiliateLink - The user's affiliate marketing URL
 * @param {string} params.tone - Base tone (e.g. '친근한 대화체', '신뢰감 정보체', '활력 후킹체')
 * @param {string} [params.customPrompt] - Optional custom prompt override
 */
export async function generateContent({ 
  sourceText, 
  affiliateLink, 
  tone, 
  selectedPlatforms = ['naverBlog', 'shorts', 'instagram', 'tiktok', 'mdx'], 
  customPrompt = '', 
  disclaimerType = 'auto',
  naverSeoType = 'info',
  humanPersonaEnabled = false,
  humanPersonaExperience = '',
  imgCount = 5,
  videoCount = 1,
  mediaExcluded = false
}) {
  const apiKey = getApiKey();
  
/**
 * Auto-detect the appropriate disclaimer type based on the source text.
 */
function detectDisclaimerType(sourceText) {
  const text = sourceText || '';
  const medical = /건강|의학|질병|영양제|다이어트|치료|증상|면역|혈압|당뇨|운동|식단|보충제/i;
  const financial = /주식|투자|재테크|펀드|코인|부동산|연금|예금|적금|세금|수익|ETF/i;

  if (financial.test(text)) return 'financial';
  if (medical.test(text)) return 'medical';
  return 'general';
}

const TONE_GUIDES = {
  '친근한 대화체': '독자와 대화하듯 부드럽고 편안한 구어체로 서술하세요. 문장을 짧게 끊고 일상적인 표현을 섞어 친근감을 주되, 가족이나 지인에게 설명하듯 자연스럽게 쓰세요.',
  '신뢰감 정보체': '객관적 근거와 수치, 사실 중심의 정돈된 존댓말체로 서술하세요. 감정 표현을 자제하고 정보의 신뢰도를 최우선으로 하세요.',
  '활력 후킹체': '감탄사와 반전, 짧고 강렬한 문장으로 독자의 흥미를 끌어올리는 활기찬 어조로 서술하세요. 단, 지나친 과장은 삼가고 사실을 과장하지 마세요.'
};

const disclaimers = {
    general: '> 본 포스팅에서 제공하는 정보는 일반적인 참고용 자료이며, 정확성이나 완결성을 보장하지 않습니다. 본문의 내용을 신뢰하여 행해진 개별적인 결정이나 행동에 대한 최종 책임은 독자 본인에게 있습니다.',
    medical: '> 본 포스팅에서 제공하는 정보는 일반적인 건강 상식 및 참고용 자료이며, 전문의의 개별적인 진단이나 진료를 절대 대신할 수 없습니다. 개별적인 증상이나 구체적인 치료 처방은 반드시 전문 의료진과의 직접 상담을 권장합니다.',
    financial: '> 본 포스팅은 투자 참고용 정보이며, 특정 종목 추천이나 투자 권유가 아닙니다. 모든 투자 결정 및 그로 인해 발생하는 손익에 대한 최종 책임은 투자자 본인에게 귀속됩니다.',
    none: ''
  };

  const effectiveDisclaimerType = disclaimerType === 'auto' ? detectDisclaimerType(sourceText) : disclaimerType;
  const disclaimerText = disclaimers[effectiveDisclaimerType] || disclaimers.general;
  if (!apiKey) {
    throw new Error('Gemini API Key가 설정되지 않았습니다. 설정 단추를 눌러 API 키를 입력해주세요.');
  }

  const hasLink = affiliateLink && affiliateLink.trim() !== '';

  // Get KST time for MDX frontmatter
  const kstFormatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const parts = kstFormatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  const hour = parts.find(p => p.type === 'hour').value;
  const minute = parts.find(p => p.type === 'minute').value;
  
  const kstDateTimeString = `${year}-${month}-${day} ${hour}:${minute}`;
  const kstDateOnlyString = `${year}-${month}-${day}`;
  const randomNum = Math.floor(1000 + Math.random() * 9000);

  // Naver Blog SEO custom strategies (2026 최신 스마트블록 & 홈판 피드 알고리즘 대응)
  const naverSeoInstructions = {
    'info': `
[정보성 SEO 모드 가이드라인 (스마트블록 검색 유입 최적화)]:
- **검색 의도 자동 역추적**: 입력된 주제/상품에서 사용자가 진짜 궁금해하는 4대 의도(핵심 기능, 가격/가성비, 실제 장단점, 주의사항)를 파악하여 '질문형 H2 소제목'(예: '📌 1. 핵심 스펙과 주요 기능은 무엇인가요?', '📌 2. 가격 대비 성능과 가성비는?')으로 본문을 구획하십시오.
- **최상단 [📌 3줄 핵심 요약 브리핑]**: 서론 시작 부분에 바쁜 독자의 0.9초 이탈(Bounce)을 방지하는 [3줄 핵심 요약 브리핑] 박스를 반드시 배치하십시오. (1줄: 핵심 결론, 2줄: 추천 대상, 3줄: 주요 수치/가격 요약)
- **구체적 수치/상황 표현 의무화**: '좋아요', '추천해요', '만족스러워요' 같은 모호한 감정 표현은 일체 배제하고, '소음 32dB로 야간 사용 적합', '배터리 12시간 지속', '실제 무게 450g' 등 구체적 수치와 실제 사용 상황으로 서술하십시오.
- **비교/스펙 정리용 마크다운 표(Table)**와 [구매 전 필수 체크리스트 3가지]를 중간 영역에 포함하여 정보 밀도를 극대화하십시오.
- **스마트블록 LSI 연관 키워드 자연 분산**: 하단에 키워드를 억지로 나열하는 어뷰징을 금지하고, 연관 키워드를 본문 문맥과 FAQ 소제목에 자연스럽게 녹여내십시오.
- **하단 두괄식 FAQ 3선**: 검색 의도에 정확히 대응하는 '자주 묻는 질문(FAQ)' 3개를 두괄식 Q&A로 구성하십시오.
`,
    'story': `
[감성 스토리 모드 가이드라인 (홈피드 추천 노출 최적화)]:
- 네이버 홈피드 추천 노출을 목표로 감성적이고 몰입감 있는 스토리텔링으로 전개하십시오.
- 글 서두에는 호기심과 클릭을 유도하는 [📌 3줄 핵심 요약 브리핑]을 두어 초반 3초 이탈을 방지하십시오.
- 첫 문장은 주제에 특화된 강한 훅(의문, 감탄, 반전)으로 시작하고 감정이 담긴 서사로 자연스럽게 이어가십시오.
- 모호한 형용사 대신 구체적인 일상 에피소드와 상황 묘사로 공감을 형성하십시오.
- 본문 끝에는 댓글·이웃 추가·공유를 자연스럽게 유도하는 소통 CTA를 넣으십시오.
`,
    'curation': `
[🏆 네이버 홈판 큐레이션 모드 가이드라인 (3인칭 팩트/비교/스마트블록 최적화)]:
- **1인칭 가짜 후기 엄격 금지**: 1인칭 가짜 사용/구매 후기("내가 직접 써보니", "직접 샀다") 작성을 철저히 금지하고, 100% 3인칭 전문 큐레이터 시점으로 서술하십시오.
- **최상단 [📌 3줄 핵심 요약 브리핑] 박스 강제 배치**: 모바일 독자의 0.9초 룰 만족 및 네이버 AI 브리핑 시스템 만족을 위해 서두에 다음 형식의 요약 박스를 반드시 최상단에 배치하십시오:
  [📌 3줄 핵심 요약 브리핑]
  - 핵심 결론: (이 주제/제품의 가장 중요한 결론 1문장)
  - 추천 대상: (어떤 사람에게 가장 알맞은지 1문장)
  - 가격/스펙 핵심: (구체적인 가격대 및 주요 수치 1문장)
- **검색 의도 맞춤 질문형 H2 소제목**: 독자가 가장 궁금해하는 핵심 질문(스펙, 가격, 실사용 장단점, 비교 분석)으로 H2 소제목을 구획하고, 소제목 바로 아래 1~2문장으로 명확한 두괄식 결론을 먼저 제시하십시오.
- **본문 첫 영역 [💡 실사용자 100여 명 평점 및 메타 반응 종합 분석]**: 실제 구매자/사용자들의 공통 긍정 반응과 아쉬운 점을 3인칭 통계형으로 요약하십시오.
- **본문 중반 [마크다운 비교 표(Table)] & [⚠️ 구매 전 체크리스트 3가지]**: 제품의 핵심 스펙, 가격, 특징을 한눈에 비교할 수 있는 표준 마크다운 표(| 항목 | 스펙/내용 |)를 반드시 구성하십시오.
- **모호한 표현의 구체적 수치화**: '좋아요', '추천해요' 대신 구체적 수치(시간, 데시벨, 중량, 금액, 비율 등)와 구체적 사용 환경으로 표현하십시오.
- **LSI 키워드 문맥 결합**: 하단 키워드 도배를 금지하고, 스마트블록 연관 키워드를 본문 문맥과 FAQ 소제목에 분산 배치하십시오.
- **하단 실질적 판단을 돕는 두괄식 FAQ 3선**과 이웃추가/공감 소통 CTA 문구를 수록하십시오.
`
  };

  const seoInstruction = naverSeoInstructions[naverSeoType] || naverSeoInstructions['curation'] || naverSeoInstructions['info'];

  // 모드 기반 첫 문장 훅 지침 (고정 문구 강제 금지, 주제·모드에 맞춰 매번 창작)
  const naverHookInstruction = naverSeoType === 'curation'
    ? `글의 첫 머리는 상단 [📌 3줄 핵심 요약 브리핑] 박스로 시작하고, 그 바로 아래 서론은 팩트 기반 두괄식 문장으로 자연스럽게 이어가십시오. 1인칭 감성·감탄·반전형 훅('이거 진짜 몰랐는데', '직접 써보니')은 절대 사용하지 마십시오.`
    : naverSeoType === 'story'
    ? `글의 첫 줄은 주제와 밀접하게 특화된 새로운 훅(의문·감탄·반전)을 매번 새로 창작하십시오. '이거 진짜 몰랐는데' 같은 고정 문구를 반복적으로 베껴 쓰는 것은 금지합니다.`
    : `글의 첫 문단은 핵심 결론을 먼저 제시하는 두괄식으로 시작하되, 검색 유입 관점에서 자연스러운 문장을 쓰십시오(감성 감탄 강제 없음).`;

  // Experience / Humanization instructions
  const personaInstruction = humanPersonaEnabled && humanPersonaExperience.trim() !== ''
    ? `
[인간화 페르소나 및 경험담 반영 지침]:
- 본문 서론 혹은 본론 1 시작 부근에 사용자가 제공한 다음의 실제/가상 경험담을 글의 맥락과 완벽하게 연결하여 1인칭 시점의 에피소드로 반드시 자연스럽게 녹여내십시오.
- 경험담 내용: "${humanPersonaExperience.trim()}"
`
    : `
[경험담 지어내기 금지 지침 (페르소나 비활성 상태)]:
- 사용자가 페르소나 경험담을 제공하지 않았으므로, 본문에 '제가 직접 써봤다', '제가 직접 구매했다', '며칠 써보니' 등 1인칭 직접 사용/구매/체험 경험을 절대 지어내어 서술하지 마십시오.
- 신뢰도는 객관적 사실이나 실사용자 후기를 3인칭으로 인용('실사용자 후기에서 공통적으로...', '확인해 보니...')하는 방식과 팩트 중심 서술로 확보하십시오.
`;

  // Media instructions
  let mediaInstruction;
  if (mediaExcluded || (imgCount === 0 && videoCount === 0)) {
    mediaInstruction = `
[미디어 제외 지침]:
- 본문에는 이미지나 동영상을 위한 안내 가이드를 절대 포함하지 마십시오.
- JSON 응답의 "imageGuides" 배열은 빈 배열([])로 반환하십시오.
`;
  } else if (imgCount > 0 && videoCount === 0) {
    mediaInstruction = `
[미디어(이미지) 배치 지침]:
- 본문 전체의 자연스러운 흐름을 고려하여 총 ${imgCount}개의 이미지 위치 안내 표시(예: [이미지 1: 맛집의 정갈한 반찬 구성 사진])만 본문 중간중간에 적절히 삽입하시고, 동영상 위치 안내 표시는 절대 포함하지 마십시오.
- JSON 응답의 "imageGuides" 배열에는 각각의 이미지 위치 안내에 대응하여, 나나바나2(Gemini 이미지 모델)용으로 사실적인 이미지를 만들 수 있도록 정교한 영문 서술형 이미지 프롬프트(prompt)와 한글 가이드(desc)를 총 ${imgCount}개 생성하십시오. imageGuides 배열에는 반드시 빠짐없이 정확히 ${imgCount}개의 요소를 채워 응답하십시오.
- 프롬프트 작성 규칙:${NANO_BANANA_2_PROMPT_GUIDE}
`;
  } else if (imgCount === 0 && videoCount > 0) {
    mediaInstruction = `
[미디어(동영상) 배치 지침]:
- 본문 전체의 자연스러운 흐름을 고려하여 총 ${videoCount}개의 동영상 위치 안내 표시(예: [동영상 1: 보글보글 끓는 전골 찌개 생생한 영상])만 본문 중간중간에 적절히 삽입하시고, 이미지 위치 안내 표시는 절대 포함하지 마십시오.
- 본문에 이미지가 들어가지 않으므로, JSON 응답의 "imageGuides" 배열은 빈 배열([])로 반환하십시오.
`;
  } else {
    mediaInstruction = `
[미디어(이미지 및 동영상) 배치 지침]:
- 본문 전체의 자연스러운 흐름을 고려하여 총 ${imgCount}개의 이미지 위치 안내 표시(예: [이미지 1: 맛집의 정갈한 반찬 구성 사진])와 총 ${videoCount}개의 동영상 위치 안내 표시(예: [동영상 1: 보글보글 끓는 전골 찌개 생생한 영상])를 본문 중간중간에 적절히 삽입하십시오.
- JSON 응답의 "imageGuides" 배열에는 각각의 이미지 위치 안내에 대응하여, 나나바나2(Gemini 이미지 모델)용으로 사실적인 이미지를 만들 수 있도록 정교한 영문 서술형 이미지 프롬프트(prompt)와 한글 가이드(desc)를 총 ${imgCount}개 생성하십시오. imageGuides 배열에는 반드시 빠짐없이 정확히 ${imgCount}개의 요소를 채워 응답하십시오.
- 프롬프트 작성 규칙:${NANO_BANANA_2_PROMPT_GUIDE}
`;
  }

  const prompt = `
당신은 대한민국 최고의 제휴 마케팅 기획자이자 억대 연봉의 카피라이터이며, 특히 네이버 D.I.A.+ 알고리즘과 C-Rank 로직의 AI 자동 문서 탐지 시스템을 무력화하고 구글 애드센스 승인(애드고시)을 단번에 통과하기 위해 구글 유용성 콘텐츠 시스템(Helpful Content System)의 '독창적이고 가치 있는 콘텐츠' 기준을 완벽하게 마스터한 전문 SEO 카피라이터이자 블로그 운영 전문가입니다.

아래 제공된 [기사 원문/상품 정보/주제]를 바탕으로, 저작권 침해와 네이버 AI 필터링을 완벽하게 우회하면서 독자의 눈길을 사로잡는 **"스텔스 바이럴 마케팅 및 고품질 정보성 블로그 콘텐츠"**를 제작해야 합니다.

사용자가 삽입하려는 제휴 마케팅 링크: ${hasLink ? `"${affiliateLink}"` : "없음 (단순 정보 공유형 콘텐츠이므로 제휴 마케팅 링크나 대가성 법적 고지 문구는 절대로 삽입하지 말아야 하며, 독자가 순수하게 유용한 정보를 자연스럽게 전달받도록 글을 구성하세요.)"}
기본 원고 어조: "${tone}"
어조 상세 지침: ${TONE_GUIDES[tone] || TONE_GUIDES['친근한 대화체']}

다음 선택된 플랫폼들[${selectedPlatforms.join(', ')}]에 대한 맞춤형 원고만 작성하고, 선택되지 않은 플랫폼은 JSON 객체 내부의 키값을 null로 설정해 주세요.

---
### 작성 지침:
1. **기사 비틀기 (Stealth Copywriting) 및 제목 최적화**:
   - **원본 정보(Fact)의 엄격한 보존**: 제공된 [기사 원문/상품 정보/주제]에 포함된 객관적인 수치, 핵심 사실, 제품 스펙 등은 절대 왜곡하거나 없는 내용을 허위로 지어내지 마십시오(환각 절대 금지).
   - **문장 구조 및 표현의 완전한 재구성**: 사실 관계(Fact)는 철저히 유지하되, 문장 구조, 어휘, 조사 및 서술 흐름은 원본과 완전히 다르게 변형하여 새로 작성하십시오. 원본 단락을 통째로 복사하거나 3단어 이상 연속으로 동일하게 기술하는 행위는 절대로 금지됩니다. 완전히 독창적인 어투로 패러프레이징하십시오.
   - **검색 의도 자동 역추적 & LSI 키워드 설계**: 주제를 검색하는 독자의 핵심 의도(가격, 비교, 후기, 장단점, 사용 팁)를 분석하여 메인 키워드 1개와 이를 뒷받침하는 LSI 연관 키워드 5~8개를 스스로 설계하십시오. 메인 키워드는 사람들이 실제로 많이 검색하는 표현으로 선정하십시오.
   - **제목(H1) 최적화**: 클릭 욕구를 강하게 자극하는 카피(의문형, 반전, 해결책 제시)를 사용하되, 구체적인 숫자(예: '3가지 비결', '가격 40% 아끼는 법')를 적절히 활용하고 모바일 가독성을 위해 30자 내외로 구성해 제안하십시오. **추천 제목 3개는 '정보형(총정리/가이드)', '리스트형(숫자/단계)', '의문·반전형(질문/공감)'으로 서로 다른 각도**로 제안하십시오.
   - **제목 키워드 선배치**: 네이버 검색은 제목 앞부분의 키워드 가중치가 높습니다. 모든 추천 제목의 **앞부분(앞 3~5자 이내)에 메인 키워드가 배치**되도록 구성하십시오.
   - **핵심 키워드 문맥 분산**: 설계한 메인/연관 키워드를 본문 전체에 걸쳐 기계적으로 중복 도배되지 않도록 자연스러운 어순과 문맥, FAQ 소제목 속에 골고루 분산 배치하십시오.
2. **자연스러운 제휴 링크 삽입**: ${hasLink ? `글의 맥락상 가장 적절하고 궁금증이 극대화되는 시점에 제휴 링크(${affiliateLink})를 자연스러운 앵커 텍스트('자세한 상품 스펙과 가격은 여기서 확인하실 수 있어요', '관련 정보를 정리한 페이지를 참고해 보세요')와 함께 삽입하세요. 단, '직접 써봤다'는 1인칭 주장과 결합하지 말 것.` : '제휴 링크가 지정되지 않았으므로 본문에 구매 링크나 상품 추천 링크를 일체 삽입하지 마시고, 독자의 유입과 공감을 이끄는 순수 유용 정보로 매끄럽게 마무리해 주세요.'}
3. **법적 고지 필수 삽입**: ${hasLink ? `텍스트 기반 소셜 플랫폼(네이버 블로그, 인스타그램)의 하단에는 공정거래위원회 지침에 의거한 투명한 대가성 표기 문구(예: '이 포스팅은 제휴 마케팅 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받을 수 있습니다.')를 고급스럽고 가시성 있게 포함해 주세요. 단, 개인 블로그 MDX 원고의 경우 구글 애드센스 심사를 위해 제휴 마케팅 링크(${affiliateLink})가 있더라도 법적 고지 문구를 삽입하지 않고 본문에만 자연스럽게 삽입되도록 하거나 생략하여 순수 전문 정보성 글로 보이도록 하십시오.` : '제휴 링크가 없으므로 공정위 법적 고지(대가성 수수료 표기 등) 문구를 절대로 삽입하지 마세요. 순수 정보성 글처럼 작성해야 합니다.'}
4. **네이버 AI 필터 무력화 및 저품질 회피를 위한 무설정(Zero-Config) 자동 인간화 규칙 (네이버 블로그 naverBlog 및 MDX 필수 적용)**:
   - **문장 어미 자동 혼용 (로봇 어조 완전 차단)**: 모든 문장이 "~입니다", "~습니다" 등의 획일화되고 딱딱한 명사형 어미로 끝나지 않도록 철저히 통제하십시오. 본문 어미의 60% 이상은 자연스러운 구어체("~해요", "~하더라고요", "~했어요", "~인 것 같아요", "~일지도 몰라요")를 적절히 섞어 사람이 직접 말하듯 유연한 리듬으로 서술하십시오.
   - **문장 호흡 및 엔트로피 변동성 극대화**: AI 특유의 정형화되고 균일한 문장 길이를 타파하십시오. 의도적으로 10자 내외의 짧은 생각이나 감탄사('진짜 대박이죠.', '그럴 리가요.')를 섞어서 흐름을 깨뜨리고 긴 서술형 문장과 불규칙하게 배치하십시오.
   - **기계적 상투어 소거**: GPT나 Gemini 등의 흔적인 "첫째, 둘째, 셋째" 등의 기계적 나열 구조나 "결론적으로", "요약하자면", "~에 대해 알아보겠습니다", "그렇다면 지금부터 X에 주목해 보겠습니다" 같은 상투형 연결 문장을 100% 완전 소거하고, 대신 사람처럼 유연하고 세련된 어조('우선 가장 먼저 봐야 할 건', '참 신기하게도', '결국 핵심은 이렇습니다')를 자연스럽게 이식하십시오.
   - **모호한 표현의 구체적 수치/상황 전환**: '좋아요', '추천해요', '만족스러워요' 등의 추상적 감정 표현은 D.I.A.+ 알고리즘에서 감점 요인입니다. 반드시 구체적인 성능 수치(시간, 데시벨, 중량, 용량, 금액)나 구체적인 사용 환경('퇴근 후 야간에 원룸에서 사용할 때도 층간소음 걱정 없는 32dB')으로 바꾸어 서술하십시오.
   - **경험담 삽입 (페르소나 활성 시에만)**: 네이버 DIA+ 알고리즘의 '개인의 실제 경험' 가점을 위해, 사용자가 페르소나 경험담을 활성화한 경우에만 본문 중간에 그 경험담을 자연스럽게 녹여내십시오. 페르소나가 비활성 상태라면 1인칭 직접 사용/구매 경험을 지어내는 서술은 절대 금지하고, 팩트와 3인칭 후기 인용으로 신뢰도를 확보하십시오.
   - **리드문(첫 문단) 메인 키워드 배치 & 3줄 핵심 요약**: 서론의 첫 2문장 안에 메인 키워드를 자연스럽게 1회 포함하고, 최상단 [📌 3줄 핵심 요약 브리핑]으로 바쁜 모바일 독자의 이탈률을 방어하십시오.
   - **모바일 가독성 개행**: 사용자가 스마트폰으로 포스팅을 볼 때 이탈률을 최소화하고 체류 시간(Retention)을 보장하기 위해 한 문단은 최대 3문장 이내로만 구성하고, 단락 사이에 2~3줄의 넉넉한 여백(빈 공백 라인)을 자동 삽입하십시오.
   - **시선강탈 훅 도입 및 댓글 소통 유도 (모드 연동)**: 첫 문장의 훅은 선택된 SEO 모드에 맞춰 작성하십시오. 큐레이션(홈판) 모드에서는 1인칭 감성/감탄 훅을 쓰지 않고 팩트 기반 두괄식 훅으로 시작하십시오. 스토리 모드는 주제에 특화된 훅을 매번 새로 창작하되, '이거 진짜 몰랐는데' 같은 고정 문구를 반복 베이스로 쓰지 마십시오. 결론 마지막 부분은 항상 독자와의 정겨운 소통을 유도하는 질문과 당부('여러분은 어떠신가요? 댓글로 편하게 나누어 주세요!')로 유려하게 매듭지으십시오.

   - **구글 애드센스 승인(애드고시) 및 기타 규칙 (MDX에 추가 적용)**:
     - **타겟 날짜 제약**: 본 콘텐츠 작성 기준일은 ${kstDateOnlyString}입니다. 콘텐츠의 모든 날짜 관련 정보(최신 정보임을 암시하는 서술 등)는 이 기준일에 맞춰 작성하십시오.
     - **외부 링크 생성 절대 금지 (No Outbound Links)**: 본문, 출처 표기, 참고 문헌 등 그 어떤 형태의 외부 웹사이트 URL이나 하이퍼링크도 본문에 절대 포함하지 마십시오. 오직 텍스트 정보로만 완결성을 가질 것. (예외: 사용자가 명시적으로 전달한 제휴 마케팅 링크는 사용자가 원한 경우에만 최소한으로 본문에 텍스트 앵커 형태로 자연스럽게 녹여내고, 그 외의 불필요한 링크는 철저히 배제)
     - **키워드 반복 및 도배 금지**: 타겟 검색어(주요 키워드)를 문장 내에서 기계적으로 연속 반복하지 마십시오. 문장마다 어순을 바꾸거나, 동의어 및 문맥적 연관어(LSI 키워드)로 자연스럽게 전환할 것. (예: '식단 관리' -> '영양 섭취 방식', '균형 잡힌 식사 구성' 등)
     - **불필요한 인트로/아웃트로 생략**: 독자가 검색 후 유입되었을 때 즉시 정보를 얻을 수 있도록 "안녕하세요", "반갑습니다", "오늘 알아볼 내용은" 같은 블로그 인사말이나 소감은 일절 배제하고 바로 제목과 본론으로 들어갈 것.
     - **이모지 및 특수문자 라인 사용 금지**: 구글 봇이 텍스트의 전문성을 오판하지 않도록 본문 내 이모티콘이나 문단 구분용 특수문자 선(예: ---, ***)은 일절 사용하지 마십시오. (단, MDX의 YAML frontmatter 구분선인 맨 위/아래의 ---는 시스템 구동을 위해 유지함)
     - **글자수 분량**: 공백 제외 최소 1,500자 ~ 2,000자 이상의 깊이 있는 정보성 글로 작성하되, 의미 없는 수식어나 미사여구로 분량을 채우지 말 것 (Thin Content 방지).
     - **구조화**: H2(소제목, 마크다운 ##), H3(하위 소제목, 마크다운 ###)의 명확한 계층 구조를 갖추어 논리적으로 작성하십시오. 한 단락은 독자의 가독성을 위해 3~4문장 단위로 줄바꿈을 할 것.
     - **전개 방식**:
       - 서론: 독자가 겪는 현실적인 문제 제기 및 본문에서 얻을 수 있는 해결책 제시
       - 본론 1, 2, 3 (H2, H3): 주제와 관련된 원인 분석, 구체적인 실행 지침(행동 가능한 팁과 수치 포함), 흔히 하는 실수나 주의사항 기술
       - 결론 (H2): 본문 내용을 다른 어휘로 자연스럽게 요약하며 신뢰감을 주는 당부의 말로 마무리
       - **면책 고지 자동 삽입 (구글 E-E-A-T 신뢰도 강화)**: ${disclaimerText ? `본문 맨 마지막 라인에는 신뢰성 확보 및 구글의 정보성 기준을 충족하기 위해, 다음 면책 문구를 마크다운 인용구(>) 형태로 완전히 토씨 하나 틀리지 않고 그대로 본문 끝에 반드시 포함하십시오.\n      ${disclaimerText}` : `이 포스팅에는 별도의 면책 문구를 본문 끝에 포함하지 마십시오.`}

5. **쌍따옴표 사용 절대 금지 (JSON 구조 파싱 오류 원천 차단)**: 모든 본문 원고(content, caption, audio 등) 내에서 인용, 대화, 강조, 앵커 텍스트 링크 표시 등을 적을 때 일반 영어 쌍따옴표를 절대 직접 사용하지 마십시오. 강조나 앵커 텍스트 표시가 필요한 경우 반드시 싱글 따옴표('), 한국식 홑/겹따옴표(「 」, 『 』) 또는 유니코드 스마트 쌍따옴표(“ ”)를 사용하십시오.

6. **선택된 플랫폼별 상세 작성 가이드**:
${selectedPlatforms.includes('naverBlog') ? `   - naverBlog: 네이버 블로그 글은 일반 마크다운 기호(**, # 등) 및 HTML 태그는 포함하지 않되, 제품 비교, 스펙 정리, 핵심 요약이 필요한 본문 중간 영역에는 헤더 바로 아래에 구분선(| --- | --- |)을 명확하게 포함한 표준 마크다운 표 형식(| 항목 | 내용 |\n| --- | --- |\n| 모터 출력 | 3500W |)을 사용하여 구조화된 표를 적극적으로 작성하십시오. 또한 네이버 AI 로봇 저품질 필터를 무력화하고 가독성을 극대화하기 위해 다음 인간화 법칙을 100% 자동 적용하여 완벽하게 서술하십시오:
     * [🚨핵심 어미 자동 혼용]: 모든 서술형 문말이 "~입니다/습니다"로만 단조롭게 끝나지 않도록 철저히 차단하고, 본문 전체 어미의 60% 이상은 자연스러운 구어체(~해요, ~하더라고요, ~했어요, ~인 것 같아요)를 번갈아 섞어 쓰며 말하듯 리듬감 있게 서술하십시오.
     * [🚨시선강탈 훅 & 댓글 유도]: ${naverHookInstruction} 마지막 문단은 항상 독자와 소통/댓글을 유도하는 친근한 질문으로 마무리하십시오.
     * 각 소제목은 반드시 '📌 소제목' 또는 '【 소제목 】' 형태로 눈에 띄게 이모티콘을 조합해 단 1회 구성하십시오. 소제목을 제외한 일반 서술 텍스트 내에는 구글 애드센스 품질 가이드라인 준수를 위해 어떠한 이모티콘이나 이모지도 일절 사용을 금지합니다.
     * 제목 제안 3개와 해시태그 5~10개를 포함하십시오.
     * 아래 상세 SEO 전략 가이드, 인간화 페르소나 지침, 미디어 지침을 네이버 블로그에 반영하여 완벽하게 생성하십시오:
       ${seoInstruction}
       ${personaInstruction}
       ${mediaInstruction}
` : ''}
${selectedPlatforms.includes('shorts') ? `   - shorts: 유튜브 쇼츠 대본. 3초 시선강탈 훅, 비주얼 가이드와 대사가 포함된 타임라인 스크립트, CTA 포함.` : ''}
${selectedPlatforms.includes('instagram') ? `   - instagram: 인스타그램 피드용 가독성 높은 캡션, 해시태그 묶음, 카드뉴스 표지/본문 문구 4페이지분량 가이드 포함.` : ''}
${selectedPlatforms.includes('tiktok') ? `   - tiktok: 틱톡 대본. 역동적 연출가이드, 틱톡 자막 텍스트, 빠른 나레이션 대사, CTA 포함.` : ''}
${selectedPlatforms.includes('mdx') ? `   - mdx: 구글 애드센스 승인 기준을 엄격히 준수한 개인 블로그용 MDX 포맷. YAML Frontmatter(아래 제공된 필수 키 목록 준수)로 시작하고 마크다운 본문만을 포함한 고품질 원고.` : ''}

---
[기사 원문/상품 정보/주제]
${sourceText}
---

${customPrompt ? `[추가 요구사항]\n${customPrompt}\n` : ''}

반드시 다음 JSON 구조를 완벽하게 만족하여 답변해야 하며, 선택된 키에 해당하는 세부 객체는 완성도 있게 채우고 선택되지 않은 키는 반드시 null로 채워 응답하세요.

\`\`\`json
{
  "naverBlog": ${selectedPlatforms.includes('naverBlog') ? `{
    "titleProposals": ["제목 추천 1", "제목 추천 2", "제목 추천 3"],
    "content": "네이버 블로그 본문 (제목 제외, 문맥에 제휴 링크 및 하단 법적 고지 문구 포함. 서두 최상단에 반드시 [📌 3줄 핵심 요약 브리핑] 박스를 배치하고, 본문 중간에는 헤더 바로 아래 구분선(| --- | --- |)을 반드시 기입한 표준 마크다운 표 형식(| 항목 | 스펙/내용 |\n| --- | --- |\n| 소음도 | 32dB |)을 적극적으로 사용하십시오. 소제목은 📌 또는 【】 등의 특수 괄호와 이모티콘으로 구성하고, 본문 서술 텍스트 내에는 구글 애드센스 품질 심사 통과를 위해 어떠한 이모티콘이나 이모지도 절대 단 한 개도 쓰지 말아야 하며, '좋아요/추천해요' 대신 구체적 수치(시간, 데시벨, 중량, 금액)와 구체적 상황을 기술하고, 문장 호흡에 맞춰 2~3줄의 풍부한 여백(빈 줄)을 적극적으로 삽입하여 가시성이 극대화된 원고를 생성하십시오. 본문 중간에 적절한 문맥에 맞춰 이미지 및 동영상 가이드 표시인 [이미지 1: 설명], [동영상 1: 설명] 형태도 텍스트로 자연스럽게 이식해야 하며, 서론 첫 문단에 메인 키워드를 자연스럽게 배치하십시오.)",
    "hashtags": ["해시태그1", "해시태그2"],
    "faq": [
      { "q": "자주 묻는 질문 1", "a": "두괄식 핵심 답변 1" },
      { "q": "자주 묻는 질문 2", "a": "두괄식 핵심 답변 2" },
      { "q": "자주 묻는 질문 3", "a": "두괄식 핵심 답변 3" }
    ],
    "imageGuides": [
      {
        "pos": "이미지가 들어갈 본문 문맥 위치 설명 (예: 본론 1 시작 부근)",
        "prompt": "해당 영역에 생성해 넣을 Nano Banana 2(나나바나2)용 영문 서술형 이미지 프롬프트. 피사체·구도·조명·색감·스타일·가로형 비율·무텍스트(no text)를 자연스러운 문장으로 조합 (키워드 나열이나 --ar 등 파라미터 금지)",
        "desc": "어떤 사진을 삽입해야 하는지에 대한 한글 설명"
      }
    ],
    "seoReport": {
      "score": 95,
      "checklist": [
        { "item": "두괄식 3줄 핵심 브리핑 (0.9초 이탈 방어)", "status": "PASS", "desc": "최상단 3줄 브리핑 박스를 통해 초반 이탈률(Bounce)을 방어하고 즉각적인 결론을 제시했습니다." },
        { "item": "구체적 수치/스펙 및 비교 표 구성 (D.I.A.+)", "status": "PASS", "desc": "모호한 감정 표현 대신 구체적 수치(시간, 무게, 데시벨 등)와 마크다운 비교 표로 정보 밀도를 확보했습니다." },
        { "item": "스마트블록 LSI 연관 키워드 자연 분산", "status": "PASS", "desc": "메인 키워드: [선정한 핵심 키워드] / LSI 연관 키워드: [본문 및 FAQ에 녹여낸 5~8개 키워드]" },
        { "item": "모바일 가독성 개행 및 시각적 브레이크", "status": "PASS", "desc": "2~3문장 단위 개행과 표/체크리스트 배치를 통해 스크롤 체류시간(Retention)을 극대화했습니다." },
        { "item": "메타 설명 및 URL 슬러그", "status": "PASS", "desc": "설명: [본문 요약 메타설명 1~2문장] / 슬러그: /[추천 영문 URL 슬러그]" }
      ]
    },
    "aiOdorSafe": true
  }` : `null`},
  "shorts": ${selectedPlatforms.includes('shorts') ? `{
    "title": "쇼츠 제목",
    "hook": "첫 3초 시선을 사로잡는 강력한 훅 대사",
    "script": [
      {
        "time": "0:00 - 0:05",
        "visual": "쇼츠 화면 구도 및 비주얼 연출 묘사",
        "audio": "내레이션 스크립트 대사"
      }
    ],
    "cta": "마지막 행동 유도 멘트"
  }` : `null`},
  "instagram": ${selectedPlatforms.includes('instagram') ? `{
    "caption": "인스타그램 피드 내용 (이모지와 매끄러운 줄바꿈 적용, 링크 유도 멘트, 법적 고지 포함)",
    "hashtags": ["인스타태그1", "인스타태그2"],
    "cardNewsGuides": [
      "1페이지 표지: 자극적인 카피 문구",
      "2페이지 본문 핵심 요약",
      "3페이지 해결책 제시",
      "4페이지 구매 유도"
    ]
  }` : `null`},
  "tiktok": ${selectedPlatforms.includes('tiktok') ? `{
    "title": "틱톡 제목",
    "hook": "틱톡 맞춤 트렌디 훅 대사",
    "script": [
      {
        "time": "0:00 - 0:03",
        "subtitle": "센스있는 자막 문구",
        "visual": "연출 동작 설명",
        "audio": "말투가 빠른 나레이션 대사"
      }
    ],
    "cta": "프로필 링크 클릭 유도"
  }` : `null`},
  "mdx": ${selectedPlatforms.includes('mdx') ? `{
    "filename": "${kstDateOnlyString}-영문슬러그.mdx 형태로 작성하되 영문 슬러그는 글 주제를 나타내는 2~4개 영단어를 하이픈으로 연결하여 소문자로만 생성하시오 (예: ${kstDateOnlyString}-dark-psychology-jade.mdx)",
    "frontmatter": {
      "title": "글 제목 (애드센스 SEO 최적화 직관적 제목)",
      "description": "글 전체를 명확히 요약해 주는 1~2문장의 핵심 설명",
      "date": "${kstDateTimeString}",
      "category": "주제와 관련된 적절한 영문 소문자 카테고리 (예: mind, health, tech, study, life 등)",
      "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"],
      "keywords": "키워드1, 키워드2, 키워드3, 키워드4, 키워드5",
      "thumbnail": "/images/blog/${randomNum}.webp",
      "author": "Insight Retreat",
      "published": false
    },
    "content": "MDX 본문 내용. 절대 이모지나 특수문자 구분선(---, ***)을 쓰지 말고, ## 와 ### 로만 문단을 완벽하게 구조화하여 최소 1,500자에서 2,000자 사이의 사람이 직접 쓴 듯 깊이 있는 정보글로 작성하시오. 하단 대가성 법적 고지 문구 및 무분별한 외부 링크는 구글 애드센스 감점을 피하기 위해 절대 포함하지 마십시오. ${disclaimerText ? `단, 본문 맨 마지막 라인에는 구글 E-E-A-T 신뢰도 확보를 위해 다음의 면책 고지 문구를 마크다운 인용구 형태로 반드시 포함해 주십시오. [문구: ${disclaimerText}]` : `별도의 면책 고지 문구는 본문에 포함하지 마십시오.`}"
  }` : `null`},
  "thumbnailPrompt": ${selectedPlatforms.includes('naverBlog') || selectedPlatforms.includes('mdx') ? `"기사/상품 주제와 밀접하게 연관된 Nano Banana 2(나나바나2)용 영문 서술형 이미지 프롬프트. 피사체·구도·조명·색감·사진 스타일(사실적 썸네일/광고 이미지)·가로형 전체 비율(wide landscape)·무텍스트(no text, no watermark)를 자연스러운 문장으로 조합. 인물 등장 시 반드시 한국인(Korean, East Asian) 묘사 단어를 포함. --ar 나 --no 같은 파라미터 접미사 금지. 벡터/사진 여부는 주제에 맞게 설명으로 표현."` : `null`}
}
\`\`\`
`;

  try {
    const parsed = await executeWithFallback(apiKey, prompt, { responseMimeType: 'application/json', temperature: 0.7 });
    return processMdxFrontmatter(parsed);
  } catch (error) {
    console.error('Gemini Generation Error:', error);
    throw error;
  }
}

/**
 * Adjusts or regenerates a specific section or changes the overall tone of an existing output
 * @param {Object} params
 * @param {Object} params.existingData - The fully parsed JSON data generated previously
 * @param {string} params.platform - The target platform ('naverBlog', 'shorts', etc.)
 * @param {string} params.action - The adjustment action ('hook_only', 'cta_only', 'change_tone', 'custom_refine')
 * @param {string} params.value - The extra context or new tone (e.g. '더 후킹하게', '더 친근하게', or a custom prompt)
 */
export async function adjustContent({ existingData, platform, action, value, affiliateLink }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API Key가 설정되지 않았습니다.');
  }

  const prompt = `
당신은 최고급 제휴 마케팅 카피라이터입니다. 
기존에 생성된 결과물 중 **[특정 플랫폼: ${platform}]**의 콘텐츠를 사용자의 요구사항에 맞게 정밀하게 다듬어야 합니다.

---
### 조정 요청 사항:
- 대상 플랫폼: **${platform}**
- 처리할 액션 유형: **${action}** (예: hook_only = 훅 부분만 수정, cta_only = 행동 유도 부분만 수정, change_tone = 전체 톤앤매너 변경, custom_refine = 사용자 입력 피드백 적용)
- 사용자 지시 사항: **"${value}"**
- 제휴 마케팅 링크: **"${affiliateLink}"**

---
### 기존에 생성된 전체 데이터 (참고용):
${JSON.stringify(existingData, null, 2)}

---
### 지침:
1. 기존 데이터의 구조와 맥락을 유지하되, 지정된 플랫폼의 해당 부분만 사용자의 요청대로 완벽하게 고쳐주세요.
2. 다른 플랫폼의 데이터는 절대 변경하지 마시고 원본 그대로 두고, **요청된 플랫폼의 데이터만 정밀 수정하여** 전체 구조와 동일한 JSON 형태로 응답해 주세요.
3. 제휴 마케팅 링크(${affiliateLink})와 법적 고지 문구가 훼손되지 않도록 주의하세요.

반드시 전체 구조가 유효한 JSON 형식이어야 하며, 다른 텍스트는 일체 포함하지 마세요.
`;

  try {
    const parsed = await executeWithFallback(apiKey, prompt, { responseMimeType: 'application/json', temperature: 0.7 });
    return processMdxFrontmatter(parsed);
  } catch (error) {
    console.error('Gemini Adjustment Error:', error);
    throw error;
  }
}

/**
 * Helper to dynamically format mdx.frontmatter object into valid YAML string if returned as object
 */
function processMdxFrontmatter(parsed) {
  if (parsed && parsed.mdx && parsed.mdx.frontmatter && typeof parsed.mdx.frontmatter === 'object') {
    const fm = parsed.mdx.frontmatter;
    parsed.mdx.frontmatter = Object.entries(fm)
      .map(([k, v]) => {
        if (Array.isArray(v)) {
          return `${k}: [${v.map(x => `"${x}"`).join(', ')}]`;
        }
        if (typeof v === 'boolean') {
          return `${k}: ${v}`;
        }
        return `${k}: "${String(v).replace(/"/g, '\\"')}"`;
      })
      .join('\n');
  }
  return parsed;
}
