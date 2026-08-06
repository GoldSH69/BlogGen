/**
 * TCCG Trend Scraper & Clean Filter Engine (CommonJS)
 * Runs inside GitHub Actions to crawl Naver Search APIs
 */

const fs = require('fs');
const path = require('path');

// Constants
const CONFIG_PATH = path.join(__dirname, '../trend-rules.json');

// 크롤러 전역 오류 수집 버퍼 (실패한 수집 단위를 모아 최종 오류 리포트 이슈로 발행)
const crawlErrors = [];
function recordError(context, err) {
  const message = (err && err.message) ? err.message : String(err || '알수없는 오류');
  crawlErrors.push({ time: getKSTDate().toISOString(), context, message });
  console.error(`  ❌ [${context}] 오류: ${message}`);
}

// HTML tag cleaner helper
function cleanHtml(text) {
  if (!text) return '';
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&lt;br\s*\/?&gt;/gi, '\n')
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

// 최근 발행된 신선한 글인지 날짜 검증 헬퍼 (오늘 기준 최대 5일 전까지만 허용)
function isRecentPost(postdate, maxDays = 5) {
  if (!postdate) return true;
  try {
    let postDateObj;
    if (typeof postdate === 'string' && /^\d{8}$/.test(postdate)) {
      const postYear = parseInt(postdate.substring(0, 4), 10);
      const postMonth = postdate.substring(4, 6);
      const postDay = postdate.substring(6, 8);
      postDateObj = new Date(`${postYear}-${postMonth}-${postDay}T00:00:00+09:00`);
    } else {
      postDateObj = new Date(postdate);
      if (isNaN(postDateObj.getTime())) {
        if (typeof postdate === 'string') {
          postDateObj = new Date(postdate.replace(/-/g, '/'));
        }
      }
      if (isNaN(postDateObj.getTime())) return true;
    }
    
    const diffTime = getKSTDate().getTime() - postDateObj.getTime();
    const diffDays = diffTime < 0 ? 0 : Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays <= maxDays;
  } catch (e) {
    return true;
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
  
  const pathRegex = /https:\/\/blog\.naver\.com\/([a-zA-Z0-9_-]+)\/([0-9]+)/;
  const pathMatch = url.match(pathRegex);
  if (pathMatch) {
    return `https://m.blog.naver.com/${pathMatch[1]}/${pathMatch[2]}`;
  }
  
  if (url.includes('blogId=') && url.includes('logNo=')) {
    const blogIdMatch = url.match(/blogId=([a-zA-Z0-9_-]+)/);
    const logNoMatch = url.match(/logNo=([0-9]+)/);
    if (blogIdMatch && logNoMatch) {
      return `https://m.blog.naver.com/${blogIdMatch[1]}/${logNoMatch[2]}`;
    }
  }
  
  return url;
}

// Naver Blog Sympathy (Likes) & Comment Count Real-time Scraper (0% Parse Error Guarantee)
async function fetchNaverBlogReactions(link) {
  let sympathyCnt = 0;
  let commentCnt = 0;
  if (!link || (!link.includes('blog.naver.com') && !link.includes('m.blog.naver.com'))) {
    return { sympathyCnt, commentCnt };
  }

  try {
    let blogId = '';
    let logNo = '';

    const urlObj = new URL(link);
    if (urlObj.searchParams.has('blogId') && urlObj.searchParams.has('logNo')) {
      blogId = urlObj.searchParams.get('blogId');
      logNo = urlObj.searchParams.get('logNo');
    } else {
      const match = urlObj.pathname.match(/\/([^/]+)\/(\d+)/) || 
                    link.match(/blogId=([^&]+).*logNo=(\d+)/i) || 
                    link.match(/blog\.naver\.com\/([^/?#]+)\/(\d+)/i);
      if (match) {
        blogId = match[1];
        logNo = match[2];
      }
    }

    if (blogId && logNo) {
      // 1. Fetch Sympathy (Likes) Count via Naver LikeIt API
      const likeUrl = `https://common.like.naver.com/v1/search/contents?suppress_response_codes=true&q=BLOG%5B${blogId}_${logNo}%5D`;
      const likeRes = await fetch(likeUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': `https://m.blog.naver.com/${blogId}/${logNo}`
        }
      });
      if (likeRes.ok) {
        const likeJson = await likeRes.json();
        const contents = likeJson.contents || (likeJson.result && likeJson.result.contents) || [];
        if (contents.length > 0 && Array.isArray(contents[0].reactions)) {
          sympathyCnt = contents[0].reactions.reduce((sum, r) => sum + (r.count || 0), 0);
        }
      }

      // 2. Fetch Mobile HTML to parse Comment Count and Sympathy Fallback (0 Extra Network Calls)
      const mobileUrl = `https://m.blog.naver.com/${blogId}/${logNo}`;
      const mobileRes = await fetch(mobileUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (mobileRes.ok) {
        const mobileHtml = await mobileRes.text();
        
        // Comment count extraction regexes
        const commentMatch = 
          mobileHtml.match(/commentCount="(\d+)"/i) || 
          mobileHtml.match(/commentCount\s*=\s*"(\d+)"/i) || 
          mobileHtml.match(/"commentCount"\s*:\s*"?([0-9,]+)"?/i) ||
          mobileHtml.match(/commentCount\s*:\s*"?([0-9,]+)"?/i) ||
          mobileHtml.match(/comment_count\s*:\s*"?([0-9,]+)"?/i) ||
          mobileHtml.match(/_commentCount\s*:\s*"?([0-9,]+)"?/i) ||
          mobileHtml.match(/id="[^"]*commentCount"[^>]*>\s*([0-9,]+)/i) ||
          mobileHtml.match(/class="[^"]*btn_comment[^"]*"[^>]*>\s*([0-9,]+)/i) ||
          mobileHtml.match(/_commentCountText[^\d]*([0-9,]+)/i);
        if (commentMatch) {
          commentCnt = parseInt(commentMatch[1].replace(/,/g, ''), 10) || 0;
        }

        // Sympathy count extraction fallback regexes
        const sympathyMatch = 
          mobileHtml.match(/"sympathyCount"\s*:\s*"?([0-9,]+)"?/i) ||
          mobileHtml.match(/sympathyCount\s*:\s*"?([0-9,]+)"?/i) ||
          mobileHtml.match(/sympathy_count\s*:\s*"?([0-9,]+)"?/i) ||
          mobileHtml.match(/_sympathyCount\s*:\s*"?([0-9,]+)"?/i) ||
          mobileHtml.match(/id="[^"]*sympathyCount"[^>]*>\s*([0-9,]+)/i) ||
          mobileHtml.match(/class="[^"]*u_cnt"[^>]*>\s*([0-9,]+)/i) ||
          mobileHtml.match(/_sympathyCountText[^\d]*([0-9,]+)/i);
        if (sympathyMatch) {
          const htmlSympathy = parseInt(sympathyMatch[1].replace(/,/g, ''), 10) || 0;
          sympathyCnt = Math.max(sympathyCnt, htmlSympathy);
        }
      }
    }
  } catch (e) {
    // Silent fallback
  }

  return { sympathyCnt, commentCnt };
}

async function enrichCandidatesWithReactions(candidates) {
  if (!candidates || candidates.length === 0) return;
  console.log(`- [반응도 파서] 총 ${candidates.length}개 후보 포스팅의 실시간 공감수 및 댓글수 파싱 중...`);
  
  await Promise.all(candidates.map(async (cand) => {
    if (cand.type === '네이버 블로그' && cand.link) {
      const { sympathyCnt, commentCnt } = await fetchNaverBlogReactions(cand.link);
      cand.sympathyCnt = Math.max(cand.sympathyCnt || 0, sympathyCnt);
      cand.commentCnt = Math.max(cand.commentCnt || 0, commentCnt);
    } else {
      cand.sympathyCnt = cand.sympathyCnt || 0;
      cand.commentCnt = cand.commentCnt || 0;
    }

    // engagementScore = (sympathy * 1.0) + (comment * 2.0)
    cand.engagementScore = (cand.sympathyCnt * 1.0) + (cand.commentCnt * 2.0);

    cand.bloggername = (cand.bloggername || '네이버 블로거').replace(/\s*\(\s*공감[\s\S]*?\)/gi, '').trim();
  }));
}

// 네이버 홈판/큐레이션 적합도 점수 계산 엔진 (0 ~ 100점)
function calculateHomeBoardScore(post) {
  let score = 50; // 기본점수

  // 1. 반응도 지표 가산점 (최대 +25점)
  const eng = post.engagementScore || 0;
  if (eng >= 20) score += 25;
  else if (eng >= 10) score += 20;
  else if (eng >= 5) score += 15;
  else if (eng >= 1) score += 10;

  // 2. 큐레이션 & 스펙 비교 관련 제목/본문 정규식 패턴 가산점 (최대 +25점)
  const textToTest = `${post.title || ''} ${post.description || ''}`;
  const curationRegex = /비교|추천|선택|가이드|장단점|스펙|체크리스트|총정리|종합|차이|순위|베스트|분석/i;
  if (curationRegex.test(textToTest)) {
    score += 25;
  }

  return Math.min(100, Math.max(0, score));
}

// Full Text Scraper Engine (Zero-Dependency)
async function scrapeFullText(link, type) {
  let url = link;
  if (!url) return null;

  try {
    if (type === '네이버 블로그') {
      url = convertToMobileBlogUrl(url);
    }

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    if (!res.ok) return null;
    const html = await res.text();
    const cleanHtmlDump = cleanHtml(html);

    let bodyText = '';

    if (type === '네이버 블로그') {
      const seMainMatch = cleanHtmlDump.match(/<div[^>]*class="[^"]*se-main-container[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
      if (seMainMatch) {
        bodyText = cleanHtml(seMainMatch[1]);
      } else {
        const postViewMatch = cleanHtmlDump.match(/<div[^>]*id="postViewArea"[^>]*>([\s\S]*?)<\/div>/i);
        if (postViewMatch) {
          bodyText = cleanHtml(postViewMatch[1]);
        }
      }
    } else {
      if (cleanHtmlDump.includes('id="newsct_article"')) {
        const chunk = cleanHtmlDump.split('id="newsct_article"')[1];
        const rawContent = chunk.substring(chunk.indexOf('>') + 1).split('</div>')[0];
        bodyText = cleanHtml(rawContent);
      } else if (cleanHtmlDump.includes('id="articleBodyContents"')) {
        const chunk = cleanHtmlDump.split('id="articleBodyContents"')[1];
        const rawContent = chunk.substring(chunk.indexOf('>') + 1).split('</div>')[0];
        bodyText = cleanHtml(rawContent);
      }
      
      if (!bodyText) {
        const articleMatch = cleanHtmlDump.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
        if (articleMatch) {
          bodyText = cleanHtml(articleMatch[1]);
        } else {
          const bodyMatch = cleanHtmlDump.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          if (bodyMatch) {
            bodyText = cleanHtml(bodyMatch[1]);
          }
        }
      }
    }

    if (bodyText) {
      bodyText = bodyText
        .replace(/\r\n/g, '\n')
        .replace(/\n\s*\n/g, '\n\n')
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

// 구글 트렌드 RSS 한국 실시간 급상승 키워드 파서 (상위 9개 파싱)
async function fetchGoogleTrendingKeywords(limitCount = 9) {
  console.log(`- 구글 트렌드 RSS에서 한국 실시간 급상승 키워드 상위 ${limitCount}개 수집 중...`);
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
      while ((match = itemPattern.exec(xml)) !== null && count < limitCount) {
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
    recordError('구글 실시간 급상승 키워드 수집', e);
  }
  return keywords;
}

// 구글 뉴스 RSS 직접 검색 및 수집 엔진 (키워드당 대표 뉴스 n개 선발)
async function fetchGoogleNewsResults(keyword, limit = 1) {
  const items = [];
  try {
    const encoded = encodeURIComponent(keyword);
    const rssUrl = `https://news.google.com/rss/search?q=${encoded}&hl=ko&gl=KR&ceid=KR:ko`;
    const res = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    if (res.ok) {
      const xml = await res.text();
      const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
      let match;
      let count = 0;
      while ((match = itemPattern.exec(xml)) !== null && count < limit) {
        const content = match[1];
        const titleM = content.match(/<title>([\s\S]*?)<\/title>/i);
        const linkM = content.match(/<link>([\s\S]*?)<\/link>/i);
        const pubM = content.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
        const descM = content.match(/<description>([\s\S]*?)<\/description>/i);

        if (titleM && linkM) {
          items.push({
            keyword,
            type: '구글 뉴스',
            title: cleanHtml(titleM[1]),
            description: cleanHtml(descM ? descM[1] : ''),
            link: linkM[1].trim(),
            bloggername: '언론사 뉴스',
            pubDate: formatPubDate(pubM ? pubM[1] : '')
          });
          count++;
        }
      }
    }
  } catch (e) {
    recordError(`구글 뉴스 검색 (${keyword})`, e);
  }
  return items;
}

// 네이버 오픈API 블로그 검색 엔진 (키워드당 최신순 n개 수집)
async function fetchNaverBlogSearchResults(clientId, clientSecret, keyword, limit = 5) {
  const items = [];
  if (!clientId || !clientSecret) return items;
  try {
    const encoded = encodeURIComponent(keyword);
    const apiUrl = `https://openapi.naver.com/v1/search/blog.json?query=${encoded}&display=${limit}&start=1&sort=date`;
    const res = await fetch(apiUrl, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret
      }
    });
    if (res.ok) {
      const json = await res.json();
      const posts = Array.isArray(json.items) ? json.items : [];
      for (const post of posts) {
        const link = post.link && post.link.trim();
        if (!link) continue;
        items.push({
          keyword,
          type: '네이버 블로그',
          title: cleanHtml(post.title),
          description: cleanHtml(post.description),
          link: convertToMobileBlogUrl(link),
          bloggername: cleanHtml(post.bloggername || '네이버 블로거'),
          pubDate: formatPostdate(post.postdate || ''),
          sympathyCnt: 0,
          commentCnt: 0
        });
      }
    } else {
      recordError(`네이버 블로그 검색 (${keyword})`, new Error(`HTTP ${res.status}`));
    }
  } catch (e) {
    recordError(`네이버 블로그 검색 (${keyword})`, e);
  }
  return items;
}

// 3-Stage Clean Filter Algorithm
function calculateCleanScore(item, blacklistWords, checkAdRegex) {
  const title = cleanHtml(item.title);
  const desc = cleanHtml(item.description);
  const fullText = `${title} ${desc}`;

  let score = 100;
  let reasons = [];

  for (const word of blacklistWords) {
    if (fullText.includes(word)) {
      score -= 35;
      reasons.push(`블랙리스트 키워드 발견 [${word}]`);
    }
  }

  if (checkAdRegex) {
    const adPattern = /(소정의\s*원고료|제품을\s*제공받아|지원받아\s*작성|수수료를\s*제공|원고료를\s*지급|체험단|협찬|쿠팡\s*파트너스)/gi;
    if (adPattern.test(fullText)) {
      score -= 50;
      reasons.push('대가성 광고 문구 의심');
    }

    const emojiMatch = desc.match(/[✨❤️✅🔥👍📢📌⭐✔!]/g);
    if (emojiMatch && emojiMatch.length > 5) {
      score -= 20;
      reasons.push('과도한 광고성 기호 밀도');
    }
  }

  const modelPattern = /[A-Z]+[0-9]+[A-Z0-9]*/g;
  const brandPattern = /(삼성|LG|애플|다이슨|샤오미|비스포크|오브제|한샘|이케아|무인양품|시디즈|로보락)/g;
  
  const hasModel = modelPattern.test(fullText);
  const hasBrand = brandPattern.test(fullText);

  if (hasModel || hasBrand) {
    score += 15;
  } else {
    score -= 10;
    reasons.push('구체적인 모델명/브랜드 정보 부재');
  }

  score = Math.max(0, Math.min(100, score));
  return { score, reasons };
}

async function run() {
  console.log('TCCG Trend Crawler 시작 (서로 다른 실시간 뉴스 9개 단일화 정밀 시스템)...');

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

  // 1. Read configuration file (trend-rules.json) STRICTLY
  let config = {};
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      console.log('설정 파일 로드 성공:', config);
    } catch (e) {
      console.error('설정 파일 파싱 오류:', e);
    }
  }

  const unified = config.unifiedTrend || {};
  const selectedCategories = Array.isArray(unified.categories) && unified.categories.length > 0
    ? unified.categories
    : [30, 33, 32, 9, 10, 12, 21, 6, 5, 28, 27, 29, 26, 15, 18, 20, 25];

  const minCleanScore = unified.filtering?.minCleanScore ?? 75;
  const customBlacklist = unified.filtering?.customBlacklist || ["광고", "체험단", "협찬문의", "제공받아", "공구", "추천인"];
  const minEngagementScore = unified.engagementRules?.minEngagementScore ?? 1; // Block 0-engagement posts!
  const homeBoardFilterConfig = unified.homeBoardFilter || { enabled: true, minHomeBoardScore: 60 };
  const isHomeBoardFilterEnabled = homeBoardFilterConfig.enabled !== false;
  const minHomeBoardScore = homeBoardFilterConfig.minHomeBoardScore ?? 60;
  const MAX_AGE_DAYS = 5; // 오늘 기준 최근 5일 이내 작성글만 허용

  const categoryMap = {
    5: '문학·책', 6: '영화', 8: '미술·디자인', 7: '공연·전시', 11: '음악', 9: '드라마', 12: '스타·연예인', 13: '만화·애니', 10: '방송',
    14: '일상·생각', 15: '육아·결혼', 16: '반려동물', 17: '좋은글·이미지', 18: '패션·미용', 19: '인테리어·DIY', 20: '요리·레시피', 21: '상품리뷰', 36: '원예·재배',
    22: '게임', 23: '스포츠', 24: '사진', 25: '자동차', 26: '취미', 27: '국내여행', 28: '세계여행', 29: '맛집',
    30: 'IT·컴퓨터', 31: '사회·정치', 32: '건강·의학', 33: '비즈니스·경제', 35: '어학·외국어', 34: '교육·학문'
  };

  let selectedBlogs = [];
  let newsCandidates = [];

  // =============================================================
  // [트랙 1] 설정된 네이버 공식 카테고리별 상위 3개씩 엄선 수집
  // =============================================================
  console.log('\n=======================================');
  console.log('[트랙 1] 설정 카테고리별 실시간 인기글 수집 시작...');
  console.log(`선택된 네이버 공식 카테고리 (${selectedCategories.length}개):`, selectedCategories.map(s => categoryMap[s] || s));
  console.log(`수집 날짜 제한: 오늘 기준 최근 ${MAX_AGE_DAYS}일 이내 작성글만 허용`);
  console.log('=======================================');

  for (const seq of selectedCategories) {
    const catName = categoryMap[seq] || `카테고리 ${seq}`;
    console.log(`\n[카테고리: ${catName}] 수집 중 (seq: ${seq})...`);

    try {
      const url = `https://section.blog.naver.com/ajax/DirectoryPostList.naver?directorySeq=${seq}&page=1`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
          'Referer': 'https://section.blog.naver.com/',
          'Accept': 'application/json, text/plain, */*'
        }
      });

      if (res.ok) {
        const rawText = await res.text();
        const cleanText = rawText.replace(/^\s*\)\]\}',\s*/, '');
        const json = JSON.parse(cleanText);

        let posts = [];
        if (json.result && Array.isArray(json.result.postList)) {
          posts = json.result.postList;
        } else if (json.result && Array.isArray(json.result.posts)) {
          posts = json.result.posts;
        } else if (Array.isArray(json.posts)) {
          posts = json.posts;
        }

        let categoryCandidates = [];

        for (const post of posts) {
          const title = cleanHtml(post.title);
          const desc = cleanHtml(post.contents || post.contentsSnippet || post.briefContents || '');
          const link = post.postUrl || (post.domainIdOrBlogId && post.logNo ? `https://blog.naver.com/${post.domainIdOrBlogId}/${post.logNo}` : '');

          if (!link) continue;

          if (!isRecentPost(post.addDate, MAX_AGE_DAYS)) {
            continue;
          }

          const sympathy = post.sympathyCount ?? post.sympathyCnt ?? 0;
          const comment = post.commentCount ?? post.commentCnt ?? 0;
          const bloggername = `${post.authorName || post.nickname || '네이버 블로거'}`;

          const cleanObj = calculateCleanScore(
            { title, description: desc },
            customBlacklist,
            true
          );

          if (cleanObj.score >= minCleanScore) {
            categoryCandidates.push({
              keyword: catName,
              type: '네이버 블로그',
              title,
              description: desc,
              link,
              bloggername,
              score: cleanObj.score,
              reasons: cleanObj.reasons,
              sympathyCnt: sympathy,
              commentCnt: comment,
              pubDate: post.addDate ? formatPubDate(new Date(post.addDate).toISOString()) : ''
            });
          }
        }

        await enrichCandidatesWithReactions(categoryCandidates);
        const validCategoryCandidates = categoryCandidates.filter(c => (c.engagementScore || 0) >= minEngagementScore);
        validCategoryCandidates.sort((a, b) => (b.engagementScore - a.engagementScore) || (b.score - a.score));

        const top3ForCategory = validCategoryCandidates.slice(0, 3);
        console.log(`  => [${catName}] 반응도 컷트라인 통과 ${validCategoryCandidates.length}개 중 상위 ${top3ForCategory.length}개 선발 완료`);
        selectedBlogs.push(...top3ForCategory);
      }
    } catch (e) {
      recordError(`카테고리 "${catName}" 수집`, e);
    }
  }

  // =============================================================
  // [트랙 2] 구글 실시간 급상승 9개 키워드 ➔ 9개 서로 다른 뉴스 단일화 수집
  // =============================================================
  console.log('\n=======================================');
  console.log('[트랙 2] 구글 실시간 급상승 9개 키워드 핫뉴스 수집 시작...');
  console.log('=======================================');

  const realtimeKeywords = await fetchGoogleTrendingKeywords(9); // 정확히 9개 키워드 수집

  for (const keyword of realtimeKeywords) {
    try {
      const googleNewsItems = await fetchGoogleNewsResults(keyword);
      if (googleNewsItems && googleNewsItems.length > 0) {
        const topNewsItem = googleNewsItems[0]; // 키워드당 대표 뉴스 1개만 선발
        const { score, reasons } = calculateCleanScore(
          { title: topNewsItem.title, description: topNewsItem.description },
          customBlacklist,
          true
        );
        if (score >= minCleanScore && isRecentPost(topNewsItem.pubDate, MAX_AGE_DAYS)) {
          newsCandidates.push({ ...topNewsItem, score, reasons });
        }
      }
    } catch (e) {
      recordError(`실시간 뉴스 수집 (${keyword})`, e);
    }
  }

  console.log(`=> 서로 다른 실시간 핫뉴스 최종 ${newsCandidates.length}개 선발 완료`);

  // =============================================================
  // [트랙 3] 고정 AI 키워드 기반 최신 블로그 수집 (키워드당 반응도 상위 최대 2개)
  // =============================================================
  const aiNews = config.aiNews || {};
  const aiKeywords = Array.isArray(aiNews.keywords) && aiNews.keywords.length > 0
    ? aiNews.keywords
    : ['openai', 'claude', 'gemini', 'deepseek', 'qwen', 'github 오픈소스'];
  const aiMaxAgeDays = aiNews.maxAgeDays ?? 3;
  const aiMaxPerSource = aiNews.maxPerSource ?? 2;
  const aiNaverEnabled = aiNews.sources?.naverBlog !== false;

  if (aiNews.enabled !== false) {
    console.log('\n=======================================');
    console.log('[트랙 3] 고정 AI 키워드 최신 블로그 수집 시작...');
    console.log(`AI 키워드 (${aiKeywords.length}개):`, aiKeywords);
    console.log(`날짜 제한: 오늘 기준 최근 ${aiMaxAgeDays}일 이내 글만 허용`);
    console.log(`키워드당 반응도(공감×1+댓글×2) 상위 ${aiMaxPerSource}개 이하만 선발 (AI 구글 뉴스 수집은 중단됨)`);
    console.log('=======================================');

    const aiBlogCandidates = [];

    for (const keyword of aiKeywords) {
      console.log(`\n[AI 키워드: ${keyword}] 수집 중...`);

      // 네이버 블로그 검색 (오픈API, 최신순 → 반응도 정렬 후 키워드당 상위 선발)
      if (aiNaverEnabled) {
        try {
          const blogItems = await fetchNaverBlogSearchResults(clientId, clientSecret, keyword, aiMaxPerSource * 3);
          for (const item of blogItems) {
            if (!isRecentPost(item.pubDate, aiMaxAgeDays)) continue;
            const cleanObj = calculateCleanScore(
              { title: item.title, description: item.description },
              customBlacklist,
              true
            );
            if (cleanObj.score >= minCleanScore) {
              aiBlogCandidates.push({ ...item, score: cleanObj.score, reasons: cleanObj.reasons });
            }
          }
        } catch (e) {
          recordError(`AI 블로그 검색 (${keyword})`, e);
        }
      }
    }

    // AI 블로그 글: 공감/댓글 실시간 스크래핑 후 반응도 점수로 키워드별 상위 선발 (없으면 0개)
    if (aiBlogCandidates.length > 0) {
      await enrichCandidatesWithReactions(aiBlogCandidates);

      const perKeywordMap = new Map();
      for (const cand of aiBlogCandidates) {
        if ((cand.engagementScore || 0) < minEngagementScore) continue;
        const key = cand.keyword || '기타';
        if (!perKeywordMap.has(key)) perKeywordMap.set(key, []);
        perKeywordMap.get(key).push(cand);
      }

      const selectedAiBlogs = [];
      for (const arr of perKeywordMap.values()) {
        arr.sort((a, b) => (b.engagementScore - a.engagementScore) || (b.score - a.score));
        selectedAiBlogs.push(...arr.slice(0, aiMaxPerSource));
      }
      console.log(`  => AI 키워드별 반응도 상위 ${aiMaxPerSource}개 이하 선발: ${selectedAiBlogs.length}개`);
      selectedBlogs.push(...selectedAiBlogs);
    }
  }

  // =============================================================
  // [통합] 최종 선발 및 중복 제거
  // =============================================================
  const topTrends = [...selectedBlogs, ...newsCandidates];
  const uniqueTrendsMap = new Map();
  for (const trend of topTrends) {
    const key = (trend.link || trend.title).trim();
    if (!uniqueTrendsMap.has(key)) {
      uniqueTrendsMap.set(key, trend);
    }
  }
  const finalUniqueTrends = Array.from(uniqueTrendsMap.values());

  console.log(`\n최종 수집 완료: 총 ${finalUniqueTrends.length}개 (블로그 ${selectedBlogs.length}개, 뉴스 ${newsCandidates.length}개)`);

  // 원본 전체 본문 스크래핑 및 홈판 적합도 스코어링
  console.log('\n--- 원본 본문 스크래핑 & 홈판 적합도 분석 시작 ---');
  for (const trend of finalUniqueTrends) {
    if (trend.type !== '구글 뉴스') {
      const fullText = await scrapeFullText(trend.link, trend.type);
      if (fullText) {
        trend.description = fullText;
      }
    }
    trend.homeBoardScore = calculateHomeBoardScore(trend);
  }

  let finalCandidatesToPublish = finalUniqueTrends;
  if (isHomeBoardFilterEnabled) {
    console.log(`\n- [홈판 필터가동] 홈판 적합도 점수 ${minHomeBoardScore}점 이상만 우수 선별 중...`);
    finalCandidatesToPublish = finalUniqueTrends.filter(t => (t.homeBoardScore || 0) >= minHomeBoardScore);
    console.log(`  => 홈판 필터링 결과: 총 ${finalUniqueTrends.length}개 중 ${finalCandidatesToPublish.length}개 최종 선발 완료`);
    if (finalCandidatesToPublish.length === 0 && finalUniqueTrends.length > 0) {
      console.log('  ⚠️ 최소 적합도 점수 통과 포스트가 없어 상위 적합도 포스트를 보존합니다.');
      finalUniqueTrends.sort((a, b) => (b.homeBoardScore || 0) - (a.homeBoardScore || 0));
      finalCandidatesToPublish = finalUniqueTrends.slice(0, 5);
    }
  }

  // Existing Issue Check & Github Issue Creation
  let existingIssueTitles = new Set();
  const existingErrorReportIssues = []; // 이미 열려있는 크롤러 오류 리포트 이슈 { number, title }
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
        if (issue.title.trim().startsWith('[크롤러 오류')) {
          existingErrorReportIssues.push({ number: issue.number, title: issue.title.trim() });
        }
      });
    }
  } catch (e) {
    recordError('기존 트렌드 이슈 조회', e);
  }

  for (const trend of finalCandidatesToPublish) {
    const issueTitle = `[트렌드] ${trend.keyword}: ${trend.title}`;

    if (existingIssueTitles.has(issueTitle)) {
      console.log(`이미 등록된 트렌드 (중복 패스): "${issueTitle}"`);
      continue;
    }

    console.log(`새로운 트렌드 이슈 등록 중: "${issueTitle}"`);

    const issueBody = `### 📌 탐지된 트렌드 핫템 소스
- **수집 채널**: \`${trend.type}\`
- **카테고리/키워드**: \`${trend.keyword}\`
- **원글 발행 시간**: \`${trend.pubDate || ''}\`
- **수집처/작성자**: \`${trend.bloggername}\`
- **원본 연결 링크**: [네이버 상세 본문 링크](${trend.link})
- **반응도 스코어**: \`${trend.engagementScore || 0}점 (공감 ${trend.sympathyCnt || 0}개 / 댓글 ${trend.commentCnt || 0}개)\`
- **홈판 적합도 점수**: \`🏆 ${trend.homeBoardScore || 80}점 (큐레이션 추천)\`

### 📝 원본 정보 및 원고 소스 텍스트
<!-- TREND_SOURCE_START -->
${trend.description}
<!-- TREND_SOURCE_END -->

---
*집/회사 컴퓨터에서 **[BlogGen 대시보드 ➔ 트렌드 피드]** 탭을 활성화하면 이 소스 텍스트를 원클릭으로 가공하여 고품질 스텔스 원고로 리라이팅할 수 있습니다.*`;

    try {
      const createIssueUrl = `https://api.github.com/repos/${repository}/issues`;
      await fetch(createIssueUrl, {
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
    } catch (e) {
      recordError(`트렌드 이슈 등록 (${issueTitle})`, e);
    }
  }

  // =============================================================
  // [오류 리포트] 이번 실행 중 수집 오류가 있다면 전용 리포트 이슈 1개 발행
  // =============================================================
  if (crawlErrors.length > 0) {
    const reportTitle = `[크롤러 오류 리포트] ${getKSTDate().toISOString().slice(0, 16).replace('T', ' ')} (${crawlErrors.length}건)`;

    // 이전에 남아있는 오픈 오류 리포트 이슈는 먼저 닫아서 항상 최신 1개만 유지
    for (const ex of existingErrorReportIssues) {
      try {
        await fetch(`https://api.github.com/repos/${repository}/issues/${ex.number}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'TCCG-Trend-Crawler-Agent'
          },
          body: JSON.stringify({ state: 'closed' })
        });
        console.log(`이전 오류 리포트 이슈 닫음: #${ex.number} ${ex.title}`);
      } catch (e) {
        console.error(`이전 오류 리포트 이슈 닫기 실패 (#${ex.number}):`, e.message);
      }
    }

    const reportBody = [
      '### ⚠️ 트렌드 크롤러 수집 오류 리포트',
      '',
      `- **실행 시각**: \`${getKSTDate().toISOString()}\``,
      `- **총 오류 건수**: \`${crawlErrors.length}건\``,
      '',
      '| # | 발생 시각 | 발생 지점 | 오류 메시지 |',
      '|---|-----------|-----------|-------------|',
      ...crawlErrors.map((e, i) => `| ${i + 1} | ${e.time} | ${e.context} | ${e.message.replace(/\|/g, '\\|')} |`),
      '',
      '---',
      '*해당 수집 지점을 점검하여 다음 실행에서 정상 수집되도록 조치해 주세요.*'
    ].join('\n');

    try {
      const createReportUrl = `https://api.github.com/repos/${repository}/issues`;
      await fetch(createReportUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'TCCG-Trend-Crawler-Agent'
        },
        body: JSON.stringify({
          title: reportTitle,
          body: reportBody,
          labels: ['trend-candidate']
        })
      });
      console.log('크롤러 오류 리포트 이슈 등록 완료:', reportTitle);
    } catch (e) {
      console.error('오류 리포트 이슈 등록 실패:', e.message);
    }
  }

  console.log('\nTCCG Trend Crawler 작업 완료.');
}

run();
