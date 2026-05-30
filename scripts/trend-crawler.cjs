/**
 * TCCG Trend Scraper & Clean Filter Engine (CommonJS)
 * Runs inside GitHub Actions to crawl Naver Search APIs
 */

const fs = require('fs');
const path = require('path');

// Constants
const CONFIG_PATH = path.join(__dirname, '../trend-rules.json');

// HTML tag cleaner helper
function cleanHtml(text) {
  if (!text) return '';
  return text
    .replace(/<\/?[^>]+(>|$)/g, '') // remove HTML tags like <b>, </b>
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

// 3-Stage Clean Filter Algorithm
function calculateCleanScore(item, blacklistWords, checkAdRegex) {
  const title = cleanHtml(item.title);
  const desc = cleanHtml(item.description);
  const fullText = `${title} ${desc}`;

  let score = 100;
  let reasons = [];

  // Stage 1: Structure/Domain Blacklist words
  for (const word of blacklistWords) {
    if (fullText.includes(word)) {
      score -= 35;
      reasons.push(`블랙리스트 키워드 발견 [${word}]`);
    }
  }

  // Stage 2: Ad Regex Check
  if (checkAdRegex) {
    const adPattern = /(소정의\s*원고료|제품을\s*제공받아|지원받아\s*작성|수수료를\s*제공|원고료를\s*지급|체험단|협찬|쿠팡\s*파트너스)/gi;
    if (adPattern.test(fullText)) {
      score -= 50;
      reasons.push('대가성 광고 문구 의심');
    }

    // Emoji density check (e.g. more than 6 emojis/exclamation marks in short desc)
    const emojiMatch = desc.match(/[✨❤️✅🔥👍📢📌⭐✔!]/g);
    if (emojiMatch && emojiMatch.length > 5) {
      score -= 20;
      reasons.push('과도한 광고성 기호 밀도');
    }
  }

  // Stage 3: Information Density (High value checkpoints)
  // Look for product numbers (Alphanumerics, model codes like LG-V10, KQ65) or specific brands
  const modelPattern = /[A-Z]+[0-9]+[A-Z0-9]*/g;
  const brandPattern = /(삼성|LG|애플|다이슨|샤오미|비스포크|오브제|한샘|이케아|무인양품|시디즈|로보락)/g;
  
  const hasModel = modelPattern.test(fullText);
  const hasBrand = brandPattern.test(fullText);

  if (hasModel || hasBrand) {
    score += 15; // Information reward
  } else {
    score -= 10; // thin content penalty
    reasons.push('구체적인 모델명/브랜드 정보 부재');
  }

  // Cap score between 0 and 100
  score = Math.max(0, Math.min(100, score));
  return { score, reasons };
}

async function run() {
  console.log('TCCG Trend Crawler 시작...');

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  const githubToken = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY; // "owner/repo"

  if (!clientId || !clientSecret) {
    console.error('Error: NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET 환경변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  if (!githubToken || !repository) {
    console.error('Error: GITHUB_TOKEN 또는 GITHUB_REPOSITORY 환경변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  // 1. Read configuration file
  let config = {
    keywords: ["나혼자산다 핫템", "편스토랑 레시피", "백종원 레시피", "연예인 패션"],
    sources: { naverBlog: true, naverNews: true, naverCafe: false, naverShopping: true },
    filtering: { minCleanScore: 75, customBlacklist: ["공구", "마켓", "추천인", "최저가링크"], checkAdRegex: true }
  };

  if (fs.existsSync(CONFIG_PATH)) {
    try {
      config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      console.log('설정 파일 로드 완료:', config);
    } catch (e) {
      console.error('설정 파일 파싱 오류, 기본값으로 작동합니다:', e);
    }
  } else {
    console.log('설정 파일이 없어 기본값으로 작동합니다.');
  }

  const { keywords, sources, filtering } = config;
  const blacklist = filtering.customBlacklist || ["공구", "마켓", "추천인", "최저가링크"];
  const minCleanScore = filtering.minCleanScore !== undefined ? filtering.minCleanScore : 75;

  let candidates = [];

  // 2. Query Naver API for each keyword
  for (const keyword of keywords) {
    console.log(`\n키워드 검색 중: "${keyword}"`);
    const encodedKeyword = encodeURIComponent(keyword);

    // Call Blog Search
    if (sources.naverBlog) {
      try {
        const blogUrl = `https://openapi.naver.com/v1/search/blog.json?query=${encodedKeyword}&display=15&sort=sim`;
        const res = await fetch(blogUrl, {
          headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret }
        });
        if (res.ok) {
          const data = await res.json();
          const items = data.items || [];
          console.log(`- 네이버 블로그: ${items.length}개 수집`);
          
          for (const item of items) {
            const { score, reasons } = calculateCleanScore(item, blacklist, filtering.checkAdRegex);
            if (score >= minCleanScore) {
              candidates.push({
                keyword,
                type: '네이버 블로그',
                title: cleanHtml(item.title),
                description: cleanHtml(item.description),
                link: item.link,
                bloggername: item.bloggername,
                score,
                reasons
              });
            }
          }
        } else {
          console.error(`- 네이버 블로그 검색 API 호출 실패: ${res.status}`);
        }
      } catch (e) {
        console.error('- 네이버 블로그 크롤링 중 오류:', e);
      }
    }

    // Call News Search
    if (sources.naverNews) {
      try {
        const newsUrl = `https://openapi.naver.com/v1/search/news.json?query=${encodedKeyword}&display=15&sort=sim`;
        const res = await fetch(newsUrl, {
          headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret }
        });
        if (res.ok) {
          const data = await res.json();
          const items = data.items || [];
          console.log(`- 네이버 뉴스: ${items.length}개 수집`);

          for (const item of items) {
            const { score, reasons } = calculateCleanScore(item, blacklist, filtering.checkAdRegex);
            if (score >= minCleanScore) {
              candidates.push({
                keyword,
                type: '네이버 뉴스',
                title: cleanHtml(item.title),
                description: cleanHtml(item.description),
                link: item.link,
                bloggername: '뉴스 기자',
                score,
                reasons
              });
            }
          }
        } else {
          console.error(`- 네이버 뉴스 검색 API 호출 실패: ${res.status}`);
        }
      } catch (e) {
        console.error('- 네이버 뉴스 크롤링 중 오류:', e);
      }
    }
  }

  // 3. Sort candidates by score and pick top 5
  candidates.sort((a, b) => b.score - a.score);
  const topTrends = candidates.slice(0, 5);
  console.log(`\n최종 필터링 통과 목록 (${topTrends.length}개 선정):`);

  // 4. Fetch existing open issues in GitHub to avoid duplicates
  let existingIssueTitles = new Set();
  try {
    const issuesUrl = `https://api.github.com/repos/${repository}/issues?labels=trend-candidate&state=all&per_page=100`;
    const res = await fetch(issuesUrl, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TCCG-Trend-Crawler-Agent'
      }
    });
    if (res.ok) {
      const data = await res.json();
      data.forEach(issue => {
        existingIssueTitles.add(issue.title.trim());
      });
      console.log(`기존 트렌드 이슈 불러오기 성공: ${existingIssueTitles.size}개 확인`);
    } else {
      console.error(`기존 이슈 조회 실패: ${res.status}`);
    }
  } catch (e) {
    console.error('기존 이슈 목록 가져오기 중 오류:', e);
  }

  // 5. Open GitHub Issues for new trends
  for (const trend of topTrends) {
    const issueTitle = `[트렌드] ${trend.keyword}: ${trend.title}`;
    
    if (existingIssueTitles.has(issueTitle)) {
      console.log(`이미 등록된 트렌드입니다 (중복 패스): "${issueTitle}"`);
      continue;
    }

    console.log(`새로운 트렌드 이슈 등록 중: "${issueTitle}"`);

    const issueBody = `### 📌 탐지된 트렌드 핫템 소스
- **수집 채널**: \`${trend.type}\`
- **트렌드 키워드**: \`${trend.keyword}\`
- **수집처/작성자**: \`${trend.bloggername}\`
- **원본 연결 링크**: [네이버 상세 본문 링크](${trend.link})
- **클린 필터링 스코어**: \`${trend.score}점 / 100점\`

### 📝 원본 정보 및 원고 소스 텍스트
<!-- TREND_SOURCE_START -->
${trend.description}
<!-- TREND_SOURCE_END -->

---
*집/회사 컴퓨터에서 **[BlogGen 대시보드 ➔ 트렌드 피드]** 탭을 활성화하면 이 소스 텍스트를 원클릭으로 가공하여 고품질 스텔스 원고로 리라이팅할 수 있습니다.*`;

    try {
      const createIssueUrl = `https://api.github.com/repos/${repository}/issues`;
      const res = await fetch(createIssueUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'TCCG-Trend-Crawler-Agent'
        },
        body: JSON.stringify({
          title: issueTitle,
          body: issueBody,
          labels: ['trend-candidate']
        })
      });

      if (res.ok) {
        console.log(`- 이슈 등록 완료: "${issueTitle}"`);
      } else {
        const errText = await res.text();
        console.error(`- 이슈 등록 실패 (${res.status}):`, errText);
      }
    } catch (e) {
      console.error('- GitHub 이슈 생성 API 호출 오류:', e);
    }
  }

  console.log('\nTCCG Trend Crawler 작업 완료.');
}

run();
