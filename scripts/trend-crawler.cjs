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

// 현재의 한국 시간(KST, UTC+9) Date 객체를 반환하는 헬퍼 함수
function getKSTDate() {
  const curr = new Date();
  const utc = curr.getTime() + (curr.getTimezoneOffset() * 60 * 1000);
  const KR_TIME_DIFF = 9 * 60 * 60 * 1000;
  return new Date(utc + KR_TIME_DIFF);
}

// 최근 발행된 신선한 글인지 날짜 검증 헬퍼 (기본: 최근 60일 이내)
function isRecentPost(postdate, maxDays = 60) {
  if (!postdate || postdate.length !== 8) return true; // 날짜 포맷 결함 시 안전을 위해 우선 허용
  try {
    const postYear = parseInt(postdate.substring(0, 4), 10);
    const postMonth = parseInt(postdate.substring(4, 6), 10) - 1;
    const postDay = parseInt(postdate.substring(6, 8), 10);
    
    const postDateObj = new Date(postYear, postMonth, postDay);
    const currentDateObj = getKSTDate();
    
    // 시분초 영향을 배제하기 위해 두 Date 객체의 순수 날짜 타임스탬프 차이 계산
    const diffTime = Math.abs(currentDateObj.getTime() - postDateObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays <= maxDays;
  } catch (e) {
    return true; // 예외 발생 시 안전을 위해 허용
  }
}

// 블로그 postdate (YYYYMMDD) 포맷팅 함수
function formatPostdate(postdate) {
  if (!postdate || postdate.length !== 8) return postdate || '';
  return `${postdate.substring(0, 4)}-${postdate.substring(4, 6)}-${postdate.substring(6, 8)}`;
}

// RFC 822 pubDate 포맷팅 함수
function formatPubDate(pubDateStr) {
  if (!pubDateStr) return '';
  try {
    const d = new Date(pubDateStr);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const h = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${day} ${h}:${min}`;
    }
  } catch (e) {}
  return pubDateStr;
}

// Mobile Naver Blog URL Converter
function convertToMobileBlogUrl(url) {
  if (!url) return '';
  
  if (url.includes('m.blog.naver.com')) return url;
  
  // 1) https://blog.naver.com/userid/logno 포맷
  const pathRegex = /https:\/\/blog\.naver\.com\/([a-zA-Z0-9_-]+)\/([0-9]+)/;
  const pathMatch = url.match(pathRegex);
  if (pathMatch) {
    return `https://m.blog.naver.com/${pathMatch[1]}/${pathMatch[2]}`;
  }
  
  // 2) https://blog.naver.com/Redirect.nhn?blogId=userid&logNo=logno 포맷
  if (url.includes('blogId=') && url.includes('logNo=')) {
    const blogIdMatch = url.match(/blogId=([a-zA-Z0-9_-]+)/);
    const logNoMatch = url.match(/logNo=([0-9]+)/);
    if (blogIdMatch && logNoMatch) {
      return `https://m.blog.naver.com/${blogIdMatch[1]}/${logNoMatch[2]}`;
    }
  }
  
  return url;
}

// Full Text Scraper Engine (Zero-Dependency)
async function scrapeFullText(link, type) {
  let url = link;
  if (type === '네이버 블로그') {
    url = convertToMobileBlogUrl(link);
  }
  
  console.log(`- 원본 본문 스크래핑 시도 (${type}): ${url}`);
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    
    if (!res.ok) {
      console.log(`  본문 스크래핑 실패 (HTTP ${res.status}) - 사용자 가이드에 따라 가볍게 폴백 처리`);
      return null;
    }
    
    const html = await res.text();
    let bodyText = '';
    
    if (type === '네이버 블로그' || url.includes('blog.naver.com')) {
      if (html.includes('se-main-container')) {
        const parts = html.split('se-main-container');
        if (parts.length > 1) {
          let contentArea = parts[1];
          // 푸터 및 댓글 등 불필요한 하단 영역 절단
          const footerSigs = ['class="naver-footer"', 'class="aside"', 'class="post_btn"', 'class="post-btn"', 'class="reply"', 'class="comment"', 'class="post_comment"', 'id="post-btn-area"'];
          for (const sig of footerSigs) {
            if (contentArea.includes(sig)) {
              contentArea = contentArea.split(sig)[0];
            }
          }
          bodyText = cleanHtml(contentArea);
        }
      }
    } else {
      // 일반 기사/뉴스 선행 청정화 필터 (스크립트, 스타일, 헤더, 푸터, 아이프레임 등을 청소해 토큰 소모 최소화)
      const cleanHtmlDump = html
        .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
        .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
        .replace(/<header[^>]*>([\s\S]*?)<\/header>/gi, '')
        .replace(/<footer[^>]*>([\s\S]*?)<\/footer>/gi, '')
        .replace(/<nav[^>]*>([\s\S]*?)<\/nav>/gi, '')
        .replace(/<aside[^>]*>([\s\S]*?)<\/aside>/gi)
        .replace(/<iframe[^>]*>([\s\S]*?)<\/iframe>/gi, '');

      // 네이버 뉴스 또는 기타 기사
      if (cleanHtmlDump.includes('id="dic_area"')) {
        const chunk = cleanHtmlDump.split('id="dic_area"')[1];
        const rawContent = chunk.substring(chunk.indexOf('>') + 1).split('</article>')[0];
        bodyText = cleanHtml(rawContent);
      } else if (cleanHtmlDump.includes('id="newsct_article"')) {
        const chunk = cleanHtmlDump.split('id="newsct_article"')[1];
        const rawContent = chunk.substring(chunk.indexOf('>') + 1).split('</div>')[0];
        bodyText = cleanHtml(rawContent);
      } else if (cleanHtmlDump.includes('id="articleBodyContents"')) {
        const chunk = cleanHtmlDump.split('id="articleBodyContents"')[1];
        const rawContent = chunk.substring(chunk.indexOf('>') + 1).split('</div>')[0];
        bodyText = cleanHtml(rawContent);
      }
      
      if (!bodyText) {
        // 일반 뉴스 사이트 또는 fallback 기사 파싱
        const articleMatch = cleanHtmlDump.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
        if (articleMatch) {
          bodyText = cleanHtml(articleMatch[1]);
        } else {
          // 기사 본문으로 추정되는 긴 영역을 splitter로 시도
          const bodyMatch = cleanHtmlDump.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          if (bodyMatch) {
            bodyText = cleanHtml(bodyMatch[1]);
          }
        }
      }
    }
    
    if (bodyText) {
      // 가공 및 정제
      bodyText = bodyText
        .replace(/\r\n/g, '\n')
        .replace(/\n\s*\n/g, '\n\n') // 연속 줄바꿈 방지
        .trim();
      
      const limit = 2500;
      if (bodyText.length > limit) {
        bodyText = bodyText.substring(0, limit) + '\n\n... (이하 본문 생략 / 원고 재작성 비용 및 AI 토큰 절감을 위해 2500자 크기로 부분 절단하였습니다) ...';
      }
      return bodyText;
    }
    
    return null;
  } catch (e) {
    console.error(`  본문 스크래핑 예외 발생: ${e.message}`);
    return null;
  }
}

// [NEW] 구글 트렌드 RSS 한국 실시간 급상승 키워드 파서
async function fetchGoogleTrendingKeywords() {
  console.log('- 구글 트렌드 RSS에서 한국 실시간 급상승 키워드 수집 중...');
  const keywords = [];
  try {
    const res = await fetch('https://trends.google.com/trending/rss?geo=KR', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (res.ok) {
      const xml = await res.text();
      const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
      let match;
      let count = 0;
      while ((match = itemPattern.exec(xml)) !== null && count < 8) {
        const itemContent = match[1];
        const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          const keyword = cleanHtml(titleMatch[1]).trim();
          if (keyword && !keywords.includes(keyword)) {
            keywords.push(keyword);
            count++;
          }
        }
      }
    }
    console.log(`  => 구글 실시간 급상승 키워드 ${keywords.length}개 추출 완료:`, keywords);
  } catch (e) {
    console.error('  구글 트렌드 키워드 수집 실패:', e.message);
  }
  return keywords;
}

// [NEW] 구글 뉴스 RSS 직접 검색 및 수집 엔진
async function fetchGoogleNewsResults(keyword) {
  console.log(`- 구글 뉴스 RSS에서 키워드 "${keyword}" 검색 중...`);
  const newsList = [];
  try {
    const encodedKeyword = encodeURIComponent(keyword);
    const url = `https://news.google.com/rss/search?q=${encodedKeyword}&hl=ko&gl=KR&ceid=KR:ko`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    if (res.ok) {
      const xml = await res.text();
      const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
      let match;
      let count = 0;
      while ((match = itemPattern.exec(xml)) !== null && count < 5) {
        const itemContent = match[1];
        const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/i);
        const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/i);
        const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
        const sourceMatch = itemContent.match(/<source[^>]*>([\s\S]*?)<\/source>/i);

        if (titleMatch && titleMatch[1] && linkMatch && linkMatch[1]) {
          const rawTitle = cleanHtml(titleMatch[1]);
          const rawLink = cleanHtml(linkMatch[1]);
          const rawPubDate = pubDateMatch ? cleanHtml(pubDateMatch[1]) : '';
          const sourceName = sourceMatch ? cleanHtml(sourceMatch[1]) : '구글 뉴스';

          newsList.push({
            keyword,
            type: '구글 뉴스',
            title: rawTitle,
            description: `[구글 뉴스 실시간 기사] ${rawTitle}\n출처: ${sourceName}\n이 뉴스는 구글 트렌드 급상승 핫이슈로 탐지된 최신 기사입니다. 원고 작성 기능을 통해 이 상세 기사 내용을 바탕으로 마케팅 블로그 포스팅용 스텔스 원고를 빠르게 생성할 수 있습니다.`,
            link: rawLink,
            bloggername: sourceName,
            score: 95, 
            reasons: ['구글 실시간 뉴스 기사 검증 통과'],
            groupName: '실시간 핫이슈',
            pubDate: formatPubDate(rawPubDate)
          });
          count++;
        }
      }
    }
    console.log(`  => 구글 뉴스 RSS 키워드 검색 결과 ${newsList.length}개 추출 완료.`);
  } catch (e) {
    console.error('  구글 뉴스 RSS 검색 실패:', e.message);
  }
  return newsList;
}

// [NEW] 네이버 쇼핑 베스트 100 인기 상품명 파서 (정교한 HTML 클래스 믹스)
async function fetchNaverShoppingBestKeywords() {
  console.log('- 네이버 쇼핑 베스트 인기 상품 키워드 수집 중...');
  const keywords = [];
  try {
    const res = await fetch('https://search.shopping.naver.com/best/category/click?categoryCategoryId=ALL', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (res.ok) {
      const html = await res.text();
      const titlePattern = /class="rankingTitleResponsive_title__[^"]*"[^>]*>([\s\S]*?)<\/strong>/gi;
      let match;
      let count = 0;
      while ((match = titlePattern.exec(html)) !== null && count < 5) {
        const titleText = cleanHtml(match[1]).trim();
        if (titleText && !keywords.includes(titleText)) {
          keywords.push(titleText);
          count++;
        }
      }
      
      if (keywords.length < 3) {
        const productNamePattern = /&quot;chnl_prod_nm&quot;\s*,\s*&quot;value&quot;\s*:\s*&quot;([^&]+)&quot;/gi;
        let pMatch;
        while ((pMatch = productNamePattern.exec(html)) !== null && keywords.length < 5) {
          const prodName = cleanHtml(pMatch[1]).trim();
          if (prodName && !keywords.includes(prodName)) {
            keywords.push(prodName);
          }
        }
      }
    }
    console.log(`  => 네이버 쇼핑 베스트 인기 키워드 ${keywords.length}개 추출 완료:`, keywords);
  } catch (e) {
    console.error('  네이버 쇼핑 베스트 키워드 수집 실패:', e.message);
  }
  return keywords;
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

  // 1. Read configuration file (3-Tier Isolated Scopes)
  let config = {};
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      console.log('설정 파일 로드 완료:', config);
    } catch (e) {
      console.error('설정 파일 파싱 오류, 기본 프리셋으로 작동합니다:', e);
    }
  }

  // 1그룹 "내 관심사" 설정 바인딩 & 폴백 프리셋
  const myInterest = config.myInterest || {
    keywords: ["건강 정보", "경제 재테크", "IT 트렌드"],
    sources: { naverBlog: true, naverNews: true, naverShopping: false },
    filtering: { minCleanScore: 80, customBlacklist: ["공구", "마켓", "추천인", "최저가링크", "파트너스"], checkAdRegex: true }
  };

  // 2그룹 "네이버 핫토픽" 설정 바인딩 & 폴백 프리셋
  const naverHotTopic = config.naverHotTopic || {
    keywords: ["다이소 꿀템", "코스트코 추천템", "가전 전자제품"],
    sources: { naverBlog: true, naverNews: false, naverShopping: false },
    filtering: { minCleanScore: 90, customBlacklist: ["홍보", "체험단", "협찬", "대여제외"], checkAdRegex: true }
  };

  // 3그룹 "실시간 핫이슈" 설정 바인딩 & 폴백 프리셋
  const realtimeHotIssue = config.realtimeHotIssue || {
    keywords: ["AI 인공지능", "신제품 출시"],
    sources: { naverBlog: true, naverNews: true, naverShopping: true },
    filtering: { minCleanScore: 75, customBlacklist: ["광고", "협찬문의", "제공받아"], checkAdRegex: true }
  };


  // -------------------------------------------------------------
  // [NEW] 3-Tier Content Mixing System 파이프라인
  // -------------------------------------------------------------
  let group1Candidates = []; // 1그룹: 내 관심사 (고정 키워드 검색 결과)
  let group2Candidates = []; // 2그룹: 네이버 핫토픽 (인기 블로그 포스팅 링크 다이렉트 긁기)
  let group3Candidates = []; // 3그룹: 실시간 핫이슈 (구글 RSS & 쇼핑 베스트 키워드 검색)
  
  // --- 1그룹 수집: 고정 관심사 검색 ---
  console.log('\n=======================================');
  console.log('[1그룹] 내 관심사 트렌드 수집 시작...');
  console.log('=======================================');
  for (const keyword of myInterest.keywords) {
    console.log(`\n관심 키워드 검색 중: "${keyword}"`);
    const encodedKeyword = encodeURIComponent(keyword);

    if (myInterest.sources.naverBlog) {
      try {
        const blogUrl = `https://openapi.naver.com/v1/search/blog.json?query=${encodedKeyword}&display=10&sort=sim`;
        const res = await fetch(blogUrl, {
          headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret }
        });
        if (res.ok) {
          const data = await res.json();
          const items = data.items || [];
          for (const item of items) {
            const { score, reasons } = calculateCleanScore(item, myInterest.filtering.customBlacklist || [], myInterest.filtering.checkAdRegex);
            const maxAgeDays = myInterest.filtering.maxAgeDays || 60;
            if (score >= myInterest.filtering.minCleanScore && isRecentPost(item.postdate, maxAgeDays)) {
              group1Candidates.push({
                keyword,
                type: '네이버 블로그',
                title: cleanHtml(item.title),
                description: cleanHtml(item.description),
                link: item.link,
                bloggername: item.bloggername,
                score,
                reasons,
                groupName: '내 관심사',
                pubDate: formatPostdate(item.postdate)
              });
            }
          }
        }
      } catch (e) {
        console.error('관심 블로그 수집 실패:', e.message);
      }
    }

    if (myInterest.sources.naverNews) {
      try {
        const newsUrl = `https://openapi.naver.com/v1/search/news.json?query=${encodedKeyword}&display=10&sort=sim`;
        const res = await fetch(newsUrl, {
          headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret }
        });
        if (res.ok) {
          const data = await res.json();
          const items = data.items || [];
          for (const item of items) {
            const { score, reasons } = calculateCleanScore(item, myInterest.filtering.customBlacklist || [], myInterest.filtering.checkAdRegex);
            if (score >= myInterest.filtering.minCleanScore) {
              group1Candidates.push({
                keyword,
                type: '네이버 뉴스',
                title: cleanHtml(item.title),
                description: cleanHtml(item.description),
                link: item.link,
                bloggername: '뉴스 기자',
                score,
                reasons,
                groupName: '내 관심사',
                pubDate: formatPubDate(item.pubDate)
              });
            }
          }
        }
      } catch (e) {
        console.error('관심 뉴스 수집 실패:', e.message);
      }
    }
  }

  // --- 2그룹 수집: 네이버 블로그 실시간 핫토픽 인기글 수집 ---
  console.log('\n=======================================');
  console.log('[2그룹] 네이버 블로그 실시간 핫토픽 인기글 수집 시작...');
  console.log('=======================================');
  // 사용자가 설정한 관심사 키워드들 중, 가장 정확도가 높고 네이버 View 탭 최상위(조회수 다수 노출군)에 자리한 
  // 알짜 파워블로그 글들을 네이버 검색 API(유사도순 sort=sim 정렬)를 기반으로 고밀도 추출합니다.
  for (const keyword of naverHotTopic.keywords) {
    console.log(`핫토픽 검색 중: "${keyword}"`);
    const encodedKeyword = encodeURIComponent(keyword);
    try {
      const blogUrl = `https://openapi.naver.com/v1/search/blog.json?query=${encodedKeyword}&display=8&sort=sim`;
      const res = await fetch(blogUrl, {
        headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret }
      });
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        for (const item of items) {
          // 2그룹 핫토픽은 더욱 엄격한 스팸 배제를 위해 클린지수 90점 이상의 최고 품질 파워 포스팅만 선발!
          const { score, reasons } = calculateCleanScore(item, naverHotTopic.filtering.customBlacklist || [], naverHotTopic.filtering.checkAdRegex);
          const maxAgeDays = naverHotTopic.filtering.maxAgeDays || 30;
          if (score >= naverHotTopic.filtering.minCleanScore && isRecentPost(item.postdate, maxAgeDays)) {
            group2Candidates.push({
              keyword: `${keyword} 핫토픽`,
              type: '네이버 블로그',
              title: cleanHtml(item.title),
              description: cleanHtml(item.description), 
              link: item.link,
              bloggername: item.bloggername || '네이버 파워블로거',
              score,
              reasons: [...reasons, '네이버 통합뷰 1페이지 상위 랭킹(조회수 보장 우수 포스팅)'],
              groupName: '네이버 핫토픽',
              pubDate: formatPostdate(item.postdate)
            });
          }
        }
      }
    } catch (e) {
      console.error('핫토픽 블로그 수집 실패:', e.message);
    }
  }


  // --- 3그룹 수집: 실시간 핫이슈 (구글 RSS + 네이버 쇼핑 베스트) ---
  console.log('\n=======================================');
  console.log('[3그룹] 구글 RSS & 쇼핑베스트 실시간 핫이슈 수집 시작...');
  console.log('=======================================');
  const googleHotKeywords = await fetchGoogleTrendingKeywords();
  const shoppingBestKeywords = await fetchNaverShoppingBestKeywords();
  const realtimeKeywords = [...googleHotKeywords, ...shoppingBestKeywords];
  
  for (const keyword of realtimeKeywords) {
    console.log(`\n실시간 핫 키워드 검색 중: "${keyword}"`);
    
    // [NEW] 구글 실시간 기사 직접 수집 추가
    try {
      const googleNewsItems = await fetchGoogleNewsResults(keyword);
      if (googleNewsItems && googleNewsItems.length > 0) {
        const filteredGoogleNews = googleNewsItems.map(news => {
          const { score, reasons } = calculateCleanScore(
            { title: news.title, description: news.description },
            realtimeHotIssue.filtering.customBlacklist || [],
            realtimeHotIssue.filtering.checkAdRegex
          );
          return {
            ...news,
            score,
            reasons: [...reasons, '구글 실시간 뉴스 기사 검증 통과']
          };
        }).filter(news => news.score >= realtimeHotIssue.filtering.minCleanScore);
        
        group3Candidates.push(...filteredGoogleNews);
      }
    } catch (e) {
      console.error('실시간 구글 뉴스 직접 수집 실패:', e.message);
    }

    const encodedKeyword = encodeURIComponent(keyword);

    if (realtimeHotIssue.sources.naverBlog) {
      try {
        const blogUrl = `https://openapi.naver.com/v1/search/blog.json?query=${encodedKeyword}&display=10&sort=sim`;
        const res = await fetch(blogUrl, {
          headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret }
        });
        if (res.ok) {
          const data = await res.json();
          const items = data.items || [];
          for (const item of items) {
            const { score, reasons } = calculateCleanScore(item, realtimeHotIssue.filtering.customBlacklist || [], realtimeHotIssue.filtering.checkAdRegex);
            const maxAgeDays = realtimeHotIssue.filtering.maxAgeDays || 14;
            if (score >= realtimeHotIssue.filtering.minCleanScore && isRecentPost(item.postdate, maxAgeDays)) {
              group3Candidates.push({
                keyword,
                type: '네이버 블로그',
                title: cleanHtml(item.title),
                description: cleanHtml(item.description),
                link: item.link,
                bloggername: item.bloggername,
                score,
                reasons,
                groupName: '실시간 핫이슈',
                pubDate: formatPostdate(item.postdate)
              });
            }
          }
        }
      } catch (e) {
        console.error('실시간 블로그 검색 실패:', e.message);
      }
    }

    if (realtimeHotIssue.sources.naverNews) {
      try {
        const newsUrl = `https://openapi.naver.com/v1/search/news.json?query=${encodedKeyword}&display=10&sort=sim`;
        const res = await fetch(newsUrl, {
          headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret }
        });
        if (res.ok) {
          const data = await res.json();
          const items = data.items || [];
          for (const item of items) {
            const { score, reasons } = calculateCleanScore(item, realtimeHotIssue.filtering.customBlacklist || [], realtimeHotIssue.filtering.checkAdRegex);
            if (score >= realtimeHotIssue.filtering.minCleanScore) {
              group3Candidates.push({
                keyword,
                type: '네이버 뉴스',
                title: cleanHtml(item.title),
                description: cleanHtml(item.description),
                link: item.link,
                bloggername: '뉴스 기자',
                score,
                reasons,
                groupName: '실시간 핫이슈',
                pubDate: formatPubDate(item.pubDate)
              });
            }
          }
        }
      } catch (e) {
        console.error('실시간 뉴스 검색 실패:', e.message);
      }
    }
  }

  // --- 4. 정렬 및 각 그룹별 상위 5개 선발 (총 15개 카드 구성) ---
  group1Candidates.sort((a, b) => b.score - a.score);
  group2Candidates.sort((a, b) => b.score - a.score);
  group3Candidates.sort((a, b) => b.score - a.score);

  const topG1 = group1Candidates.slice(0, 5);
  const topG2 = group2Candidates.slice(0, 5);
  const topG3 = group3Candidates.slice(0, 5);

  const topTrends = [...topG1, ...topG2, ...topG3];
  
  // ⚡ [중요] 링크(URL) 및 제목 기준 정밀 1차 중복 제거 (방금 수집된 기사 간 겹침 방지)
  const uniqueTrendsMap = new Map();
  for (const trend of topTrends) {
    const key = (trend.link || trend.title).trim();
    if (!uniqueTrendsMap.has(key)) {
      uniqueTrendsMap.set(key, trend);
    }
  }
  const finalUniqueTrends = Array.from(uniqueTrendsMap.values());

  console.log(`\n최종 필터링 통과 목록 (1그룹: ${topG1.length}개, 2그룹: ${topG2.length}개, 3그룹: ${topG3.length}개 선정, 중복제거 후 실등록 대상 ${finalUniqueTrends.length}개)`);

  // --- 5. 선발된 15개 후보군에 대해 전체 본문 스크래핑 시도 ---
  console.log('\n--- 원본 전체 본문 스크래핑 시작 ---');
  for (const trend of finalUniqueTrends) {
    if (trend.isAlreadyScraped || trend.type === '구글 뉴스') {
      console.log(`  => [구글 뉴스 / 수집 생략 대상] 원본 스크래핑 건너뜀 (요약본 유지): "${trend.title}"`);
      continue;
    }
    const fullText = await scrapeFullText(trend.link, trend.type);
    if (fullText) {
      console.log(`  => 본문 수집 성공 (${fullText.length}자): "${trend.title}"`);
      trend.description = fullText;
    } else {
      console.log(`  => 본문 수집 실패 (기존 요약본 유지): "${trend.title}"`);
    }
  }
  console.log('--- 원본 전체 본문 스크래핑 완료 ---\n');


  // 4. Fetch existing open issues in GitHub to avoid duplicates
  let existingIssueTitles = new Set();
  try {
    const issuesUrl = `https://api.github.com/repos/${repository}/issues?labels=trend-candidate&state=open&per_page=100`;
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
  for (const trend of finalUniqueTrends) {
    const issueTitle = `[트렌드] ${trend.keyword}: ${trend.title}`;

    
    if (existingIssueTitles.has(issueTitle)) {
      console.log(`이미 등록된 트렌드입니다 (중복 패스): "${issueTitle}"`);
      continue;
    }

    console.log(`새로운 트렌드 이슈 등록 중: "${issueTitle}"`);

    const issueBody = `### 📌 탐지된 트렌드 핫템 소스
- **수집 채널**: \`${trend.type}\`
- **트렌드 키워드**: \`${trend.keyword}\`
- **수집 그룹**: \`${trend.groupName || '내 관심사'}\`
- **원글 발행 시간**: \`${trend.pubDate || ''}\`
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
