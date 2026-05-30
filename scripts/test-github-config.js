/**
 * Developer Testing Utility: test-github-config.js
 * Run this script to verify your GitHub PAT and Repository connection:
 * command: node scripts/test-github-config.js <GITHUB_PAT>
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../trend-rules.json');

async function testConnection() {
  const pat = process.argv[2];
  if (!pat) {
    console.error('오류: GitHub PAT(토큰)을 첫 번째 인자로 전달해 주세요.');
    console.log('사용법: node scripts/test-github-config.js ghp_xxxxxxxxxxxxxxxxxxxxxx');
    process.exit(1);
  }

  const owner = 'GoldSH69';
  const repo = 'BlogGen';
  const filePath = 'trend-rules.json';
  
  console.log(`[시작] GitHub API 대소문자 정밀 연결 검사 (${owner}/${repo})`);
  
  // 1. GET Request
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  console.log(`[1단계] GET 요청 송신: ${url}`);
  
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `token ${pat}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TCCG-Test-Agent'
      }
    });

    console.log(`[1단계 결과] HTTP 상태 코드: ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log('- 기존 설정 파일 존재 확인 (SHA):', data.sha);
    } else if (res.status === 404) {
      console.log('- 신규 파일 생성 예정 (기존 파일 없음)');
    } else {
      const errText = await res.text();
      console.error('- 에러 발생:', errText);
    }
  } catch (e) {
    console.error('[1단계 실패] 네트워크 통신 오류:', e);
  }

  // 2. Read local config and try to commit
  console.log('\n[2단계] 로컬 설정 파일 읽기 및 커밋 테스트');
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('오류: 로컬에 trend-rules.json 파일이 존재하지 않습니다.');
    process.exit(1);
  }

  const localConfig = fs.readFileSync(CONFIG_PATH, 'utf8');
  const base64Content = Buffer.from(localConfig).toString('base64');

  try {
    // Fetch SHA again
    let sha = '';
    const getRes = await fetch(url, {
      headers: {
        'Authorization': `token ${pat}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TCCG-Test-Agent'
      }
    });
    if (getRes.ok) {
      const currentFileData = await getRes.json();
      sha = currentFileData.sha;
    }

    const putBody = {
      message: 'test: verify GitHub PAT write permission',
      content: base64Content
    };
    if (sha) {
      putBody.sha = sha;
    }

    console.log('[2단계 실행] PUT 요청 송신...');
    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${pat}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TCCG-Test-Agent'
      },
      body: JSON.stringify(putBody)
    });

    console.log(`[2단계 결과] HTTP 상태 코드: ${putRes.status}`);
    if (putRes.ok) {
      console.log('🎉 성공: GitHub 레포지토리에 트렌드 설정 쓰기 권한 검증 완료!');
    } else {
      const errText = await putRes.text();
      console.error('❌ 실패: 권한 또는 설정 문제 발생:', errText);
    }
  } catch (e) {
    console.error('[2단계 실패] 네트워크 통신 오류:', e);
  }
}

testConnection();
