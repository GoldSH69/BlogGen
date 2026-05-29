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
export async function generateContent({ sourceText, affiliateLink, targetAudience, tone, selectedPlatforms = ['naverBlog', 'shorts', 'instagram', 'tiktok', 'mdx'], customPrompt = '', disclaimerType = 'general' }) {
  const apiKey = getApiKey();
  
  const disclaimers = {
    general: '> 본 포스팅에서 제공하는 정보는 일반적인 참고용 자료이며, 정확성이나 완결성을 보장하지 않습니다. 본문의 내용을 신뢰하여 행해진 개별적인 결정이나 행동에 대한 최종 책임은 독자 본인에게 있습니다.',
    medical: '> 본 포스팅에서 제공하는 정보는 일반적인 건강 상식 및 참고용 자료이며, 전문의의 개별적인 진단이나 진료를 절대 대신할 수 없습니다. 개별적인 증상이나 구체적인 치료 처방은 반드시 전문 의료진과의 직접 상담을 권장합니다.',
    financial: '> 본 포스팅은 투자 참고용 정보이며, 특정 종목 추천이나 투자 권유가 아닙니다. 모든 투자 결정 및 그로 인해 발생하는 손익에 대한 최종 책임은 투자자 본인에게 귀속됩니다.',
    none: ''
  };

  const disclaimerText = disclaimers[disclaimerType] || disclaimers.general;
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

  const prompt = `
당신은 대한민국 최고의 제휴 마케팅 기획자이자 억대 연봉의 카피라이터이며, 특히 구글 애드센스 승인(애드고시)을 단번에 통과하기 위해 최신 구글 유용성 콘텐츠 시스템(Helpful Content System)의 '독창적이고 가치 있는 콘텐츠' 기준을 완벽하게 마스터한 전문 SEO 카피라이터이자 블로그 운영 전문가입니다.

아래 제공된 [기사 원문/상품 정보/주제]를 바탕으로, 저작권 침해를 완벽히 피하면서 독자의 눈길을 사로잡는 **"스텔스 바이럴 마케팅 및 고품질 정보성 블로그 콘텐츠"**를 제작해야 합니다.

사용자가 삽입하려는 제휴 마케팅 링크: ${hasLink ? `"${affiliateLink}"` : "없음 (단순 정보 공유형 콘텐츠이므로 제휴 마케팅 링크나 대가성 법적 고지 문구는 절대로 삽입하지 말아야 하며, 독자가 순수하게 유용한 정보를 자연스럽게 전달받도록 글을 구성하세요.)"}
타겟 고객층: "${targetAudience}"
기본 원고 어조: "${tone}"

다음 선택된 플랫폼들[${selectedPlatforms.join(', ')}]에 대한 맞춤형 원고만 작성하고, 선택되지 않은 플랫폼은 JSON 객체 내부의 키값을 null로 설정해 주세요.

---
### 작성 지침:
1. **기사 비틀기 (Stealth Copywriting)**: 기사의 핵심적 정보(Fact)는 그대로 살리되, 문장 구조와 단어를 완전히 재배열하고 흥미진진한 스토리텔링 형식으로 비틀어 작성하세요. 절대로 단순 기사 요약처럼 느껴지지 않게 하세요.
2. **자연스러운 제휴 링크 삽입**: ${hasLink ? `글의 맥락상 가장 적절하고 궁금증이 극대화되는 시점에 제휴 링크(${affiliateLink})를 자연스러운 앵커 텍스트("제가 직접 써본 실리콘 찜기는 여기서...", "자세한 상품 스펙 확인은...")와 함께 삽입하세요.` : '제휴 링크가 지정되지 않았으므로 본문에 구매 링크나 상품 추천 링크를 일체 삽입하지 마시고, 독자의 유입과 공감을 이끄는 순수 유용 정보로 매끄럽게 마무리해 주세요.'}
3. **법적 고지 필수 삽입**: ${hasLink ? `텍스트 기반 소셜 플랫폼(네이버 블로그, 인스타그램)의 하단에는 공정거래위원회 지침에 의거한 투명한 대가성 표기 문구(예: "이 포스팅은 제휴 마케팅 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받을 수 있습니다.")를 고급스럽고 가시성 있게 포함해 주세요. 단, 개인 블로그 MDX 원고의 경우 구글 애드센스 심사를 위해 제휴 마케팅 링크(${affiliateLink})가 있더라도 법적 고지 문구를 삽입하지 않고 본문에만 자연스럽게 삽입되도록 하거나 생략하여 순수 전문 정보성 글로 보이도록 하십시오.` : '제휴 링크가 없으므로 공정위 법적 고지(대가성 수수료 표기 등) 문구를 절대로 삽입하지 마세요. 순수 정보성 글처럼 작성해야 합니다.'}
4. **구글 애드센스 승인(애드고시) & SEO 최적화 규칙 (개인 블로그 MDX에 엄격 적용)**:
   - **외부 링크 생성 절대 금지 (No Outbound Links)**: 본문, 출처 표기, 참고 문헌 등 그 어떤 형태의 외부 웹사이트 URL이나 하이퍼링크도 본문에 절대 포함하지 마십시오. 오직 텍스트 정보로만 완결성을 가질 것. (예외: 사용자가 명시적으로 전달한 제휴 마케팅 링크는 사용자가 원한 경우에만 최소한으로 본문에 텍스트 앵커 형태로 자연스럽게 녹여내고, 그 외의 불필요한 링크는 철저히 배제)
   - **키워드 반복 및 도배 금지**: 타겟 검색어(주요 키워드)를 문장 내에서 기계적으로 연속 반복하지 마십시오. 문장마다 어순을 바꾸거나, 동의어 및 문맥적 연관어(LSI 키워드)로 자연스럽게 전환할 것. (예: '식단 관리' -> '영양 섭취 방식', '균형 잡힌 식사 구성' 등)
   - **AI 특유의 정형화된 어투 제거**: "~에 대해 알아보겠습니다", "~하는 방법이 있습니다", "첫째, 둘째" 같은 획일적이고 기계적인 문장 구조를 완전히 탈피할 것. 진짜 사람이 자신의 전문 지식과 노하우를 친절하게 구어체와 서술형을 섞어 설명하듯 자연스러운 어조(~습니다, ~입니다)로 작성하십시오.
   - **불필요한 인트로/아웃트로 생략**: 독자가 검색 후 유입되었을 때 즉시 정보를 얻을 수 있도록 "안녕하세요", "반갑습니다", "오늘 알아볼 내용은" 같은 블로그 인사말이나 소감은 일절 배제하고 바로 제목과 본론으로 들어갈 것.
   - **이모지 및 특수문자 라인 사용 금지**: 구글 봇이 텍스트의 전문성을 오판하지 않도록 본문 내 이모티콘이나 문단 구분용 특수문자 선(예: ---, ***)은 일절 사용하지 마십시오. (단, MDX의 YAML frontmatter 구분선인 맨 위/아래의 ---는 시스템 구동을 위해 유지함)
   - **글자수 분량**: 공백 제외 최소 1,500자 ~ 2,000자 이상의 깊이 있는 정보성 글로 작성하되, 의미 없는 수식어나 미사여구로 분량을 채우지 말 것 (Thin Content 방지).
   - **구조화**: H2(소제목, 마크다운 ##), H3(하위 소제목, 마크다운 ###)의 명확한 계층 구조를 갖추어 논리적으로 작성하십시오. 한 단락은 독자의 가독성을 위해 3~4문장 단위로 줄바꿈을 할 것.
   - **전개 방식**:
     - 서론: 독자가 겪는 현실적인 문제 제기 및 본문에서 얻을 수 있는 해결책 제시
     - 본론 1, 2, 3 (H2, H3): 주제와 관련된 원인 분석, 구체적인 실행 지침(행동 가능한 팁과 수치 포함), 흔히 하는 실수나 주의사항 기술
     - 결론 (H2): 본문 내용을 다른 어휘로 자연스럽게 요약하며 신뢰감을 주는 당부의 말로 마무리
     - **면책 고지 자동 삽입 (구글 E-E-A-T 신뢰도 강화)**: ${disclaimerText ? `본문 맨 마지막 라인에는 신뢰성 확보 및 구글의 정보성 기준을 충족하기 위해, 다음 면책 문구를 마크다운 인용구(>) 형태로 완전히 토씨 하나 틀리지 않고 그대로 본문 끝에 반드시 포함하십시오.\n      ${disclaimerText}` : `이 포스팅에는 별도의 면책 문구를 본문 끝에 포함하지 마십시오.`}
5. **선택된 플랫폼별 상세 작성 가이드**:
${selectedPlatforms.includes('naverBlog') ? `   - naverBlog: 기사 비틀기 기법을 사용한 네이버 블로그 포스팅 본문. 네이버 에디터는 마크다운이나 HTML 기호를 지원하지 않으므로 본문 내부에는 **볼드 기호 나 # 등 어떠한 마크다운/HTML 강조 기호도 절대로 포함하지 않는 100% 완전무결한 순수 플레인 텍스트(Plain Text)로만 본문을 작성하고, 제목 제안 3개와 해시태그를 포함할 것.` : ''}
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
    "content": "네이버 블로그 본문 (제목 제외, 문맥에 제휴 링크 및 하단 법적 고지 문구 포함. 절대로 **와 같은 마크다운 강조 기호나 HTML 태그를 일절 사용하지 말고, 가독성을 극대화하기 위해 매끄러운 문맥적 전개와 자연스러운 줄바꿈만으로 단락을 구별하는 100% 깨끗한 순수 플레인 텍스트로만 본문을 생성하십시오.)",
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
    "filename": "${kstDateOnlyString}-영문슬러그.mdx 형태로 작성하되 영문 슬러그는 글 주제를 나타내는 2~4개 영단어를 하이픈으로 연결하여 소문자로만 생성하시오 (예: ${kstDateOnlyString}-dark-psychology-jade.mdx)",
    "frontmatter": "title: \\"글 제목 (애드센스 SEO 최적화 직관적 제목)\\"\\ndescription: \\"글 전체를 명확히 요약해 주는 1~2문장의 핵심 설명\\"\\ndate: \\"${kstDateTimeString}\\"\\ncategory: \\"주제와 관련된 적절한 영문 소문자 카테고리 (예: mind, health, tech, study, life 등)\\"\\ntags: [\\"태그1\\", \\"태그2\\", \\"태그3\\", \\"태그4\\", \\"태그5\\"] (본문 내용과 밀접한 연관 핵심 태그 5개, 한글 단어 위주)\\nkeywords: \\"키워드1, 키워드2, 키워드3, 키워드4, 키워드5\\" (쉼표로 구분된 핵심 키워드 5개 나열)\\nthumbnail: \\"/images/blog/${randomNum}.webp\\"\\nauthor: \\"Insight Retreat\\"\\npublished: false (실제 발행 시에는 true로 변경)",
    "content": "MDX 본문 내용. 절대 이모지나 특수문자 구분선(---, ***)을 쓰지 말고, ## 와 ### 로만 문단을 완벽하게 구조화하여 최소 1,500자에서 2,000자 사이의 사람이 직접 쓴 듯 깊이 있는 정보글로 작성하시오. 하단 대가성 법적 고지 문구 및 무분별한 외부 링크는 구글 애드센스 감점을 피하기 위해 절대 포함하지 마십시오. ${disclaimerText ? `단, 본문 맨 마지막 라인에는 구글 E-E-A-T 신뢰도 확보를 위해 다음의 면책 고지 문구를 마크다운 인용구 형태로 반드시 포함해 주십시오. [문구: ${disclaimerText}]` : `별도의 면책 고지 문구는 본문에 포함하지 마십시오.`}"
  }` : `null`},
  "thumbnailPrompt": ${selectedPlatforms.includes('naverBlog') || selectedPlatforms.includes('mdx') ? `"기사/상품 주제와 밀접하게 연관된 영문 이미지 생성 프롬프트. 만약 프롬프트에 인물(모델, 얼굴, 손, 전신 등)이 포함되는 경우 반드시 한국인 모델(Korean, East Asian style)로 묘사되도록 영문 키워드(예: Korean man, Korean woman, Korean couple 등)를 필수로 포함할 것. 텍스트 배제 지침(no text, without any letters)과 미드저니/Dall-E용 가로세로 비율 접미사(--ar 1200:514)를 반드시 포함한 photorealistic 혹은 vector illustration 묘사"` : `null`}
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
