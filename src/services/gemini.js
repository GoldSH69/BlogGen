/**
 * Gemini API Service for AffiliWrite AI
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

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
 * Primary generation function that calls Gemini
 * @param {Object} params 
 * @param {string} params.sourceText - The original article or product info
 * @param {string} params.affiliateLink - The user's affiliate marketing URL
 * @param {string} params.targetAudience - Description or slider value for target audience
 * @param {string} params.tone - Base tone (e.g. friendly, professional, witty)
 * @param {string} [params.customPrompt] - Optional custom prompt override
 */
export async function generateContent({ sourceText, affiliateLink, targetAudience, tone, selectedPlatforms = ['naverBlog', 'shorts', 'instagram', 'tiktok', 'mdx'], customPrompt = '' }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API Key가 설정되지 않았습니다. 설정 단추를 눌러 API 키를 입력해주세요.');
  }

  const prompt = `
당신은 대한민국 최고의 제휴 마케팅 기획자이자 억대 연봉의 카피라이터입니다.
아래 제공된 [기사 원문/상품 정보]를 바탕으로, 저작권 침해를 완벽히 피하면서 독자의 눈길을 사로잡아 자연스럽게 제품 구매로 이어지게 하는 **"스텔스 마케팅 콘텐츠"**를 제작해야 합니다.

사용자가 삽입하려는 제휴 마케팅 링크: "${affiliateLink}"
타겟 고객층: "${targetAudience}"
기본 원고 어조: "${tone}"

다음 선택된 플랫폼들[${selectedPlatforms.join(', ')}]에 대한 맞춤형 원고만 작성하고, 선택되지 않은 플랫폼은 JSON 객체 내부의 키값을 null로 설정해 주세요.

---
### 작성 지침:
1. **기사 비틀기 (Stealth Copywriting)**: 기사의 핵심적 정보(Fact)는 그대로 살리되, 문장 구조와 단어를 완전히 재배열하고 흥미진진한 스토리텔링 형식으로 비틀어 작성하세요. 절대로 단순 기사 요약처럼 느껴지지 않게 하세요.
2. **자연스러운 제휴 링크 삽입**: 글의 맥락상 가장 적절하고 궁금증이 극대화되는 시점에 제휴 링크(${affiliateLink})를 자연스러운 앵커 텍스트("제가 직접 써본 실리콘 찜기는 여기서...", "자세한 상품 스펙 확인은...")와 함께 삽입하세요.
3. **법적 고지 필수 삽입**: 모든 텍스트 기반 플랫폼(네이버 블로그, 인스타그램, 개인 블로그 MDX)의 하단에는 공정거래위원회 지침에 의거한 투명한 대가성 표기 문구(예: "이 포스팅은 제휴 마케팅 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받을 수 있습니다.")를 고급스럽고 가시성 있게 포함해 주세요.
4. **선택된 플랫폼별 상세 작성 가이드**:
${selectedPlatforms.includes('naverBlog') ? `   - naverBlog: 기사 비틀기 기법을 사용한 네이버 블로그 포스팅 본문, 제목 제안 3개, 해시태그 포함.` : ''}
${selectedPlatforms.includes('shorts') ? `   - shorts: 유튜브 쇼츠 대본. 3초 시선강탈 훅, 비주얼 가이드와 대사가 포함된 타임라인 스크립트, CTA 포함.` : ''}
${selectedPlatforms.includes('instagram') ? `   - instagram: 인스타그램 피드용 가독성 높은 캡션, 해시태그 묶음, 카드뉴스 표지/본문 문구 4페이지분량 가이드 포함.` : ''}
${selectedPlatforms.includes('tiktok') ? `   - tiktok: 틱톡 대본. 역동적 연출가이드, 틱톡 자막 텍스트, 빠른 나레이션 대사, CTA 포함.` : ''}
${selectedPlatforms.includes('mdx') ? `   - mdx: 개인 블로그용 MDX 포맷. YAML Frontmatter(제목, 태그, 날짜 등)로 시작하고 마크다운 본문과 <HighlightBox type="tip" | "warning">을 포함한 원고.` : ''}

---
[기사 원문/상품 정보]
${sourceText}
---

${customPrompt ? `[추가 요구사항]\n${customPrompt}\n` : ''}

반드시 다음 JSON 구조를 완벽하게 만족하여 답변해야 하며, 선택된 키에 해당하는 세부 객체는 완성도 있게 채우고 선택되지 않은 키(예: ${['naverBlog', 'shorts', 'instagram', 'tiktok', 'mdx'].filter(x => !selectedPlatforms.includes(x)).join(', ') || '없음'})는 반드시 null로 채워 응답하세요.

\`\`\`json
{
  "naverBlog": ${selectedPlatforms.includes('naverBlog') ? `{
    "titleProposals": ["제목 추천 1", "제목 추천 2", "제목 추천 3"],
    "content": "네이버 블로그 본문 (제목 제외, 문맥에 제휴 링크 및 하단 법적 고지 문구 포함)",
    "hashtags": ["해시태그1", "해시태그2"]
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
    "frontmatter": "title: \\"글 제목\\"\\ndate: \\"현재 날짜\\"\\ntags: [\\"태그1\\", \\"태그2\\"]\\ndescription: \\"글 요약\\"\\nthumbnail: \\"/images/placeholder.jpg\\"",
    "content": "MDX 본문 내용 (#, ##, ### 제목 태그 및 'HighlightBox' 활용, 자연스럽게 제휴 링크 및 하단 법적 고지 포함)"
  }` : `null`},
  "thumbnailPrompt": ${selectedPlatforms.includes('naverBlog') || selectedPlatforms.includes('mdx') ? `"기사/상품 주제와 밀접하게 연관된 영문 이미지 생성 프롬프트. 텍스트 배제 지침(no text, without any letters)과 미드저니/Dall-E용 가로세로 비율 접미사(--ar 1200:514)를 반드시 포함한 photorealistic 혹은 vector illustration 묘사"` : `null`}
}
\`\`\`
`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
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
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Gemini API 호출에 실패했습니다.');
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResponse) {
      throw new Error('AI의 응답 형식이 올바르지 않습니다.');
    }

    return JSON.parse(textResponse);
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
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
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
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Gemini API 조정에 실패했습니다.');
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResponse) {
      throw new Error('AI의 응답 형식이 올바르지 않습니다.');
    }

    return JSON.parse(textResponse);
  } catch (error) {
    console.error('Gemini Adjustment Error:', error);
    throw error;
  }
}
