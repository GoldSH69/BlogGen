/**
 * GitHub REST API Sync Service for AffiliWrite AI
 */

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Get GitHub Sync Configuration from LocalStorage
 */
export function getGithubConfig() {
  return {
    username: localStorage.getItem('affiliwrite_gh_username') || '',
    repo: localStorage.getItem('affiliwrite_gh_repo') || '',
    pat: localStorage.getItem('affiliwrite_gh_pat') || '',
    path: localStorage.getItem('affiliwrite_gh_path') || 'history.json',
  };
}

/**
 * Save GitHub Sync Configuration to LocalStorage
 */
export function saveGithubConfig({ username, repo, pat, path }) {
  localStorage.setItem('affiliwrite_gh_username', username.trim());
  localStorage.setItem('affiliwrite_gh_repo', repo.trim());
  localStorage.setItem('affiliwrite_gh_pat', pat.trim());
  localStorage.setItem('affiliwrite_gh_path', (path || 'history.json').trim());
}

/**
 * Clear GitHub Sync Configuration
 */
export function clearGithubConfig() {
  localStorage.removeItem('affiliwrite_gh_username');
  localStorage.removeItem('affiliwrite_gh_repo');
  localStorage.removeItem('affiliwrite_gh_pat');
  localStorage.removeItem('affiliwrite_gh_path');
}

/**
 * Helper to encode unicode string to base64 safely (handles Korean and emojis)
 */
function utf8_to_b64(str) {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
}

/**
 * Helper to decode base64 to unicode string safely (handles Korean and emojis)
 */
function b64_to_utf8(str) {
  return decodeURIComponent(
    atob(str)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
}

/**
 * Fetch history array from user's GitHub repository
 */
export async function fetchHistoryFromGithub() {
  const { username, repo, pat, path } = getGithubConfig();
  if (!username || !repo || !pat) {
    return null; // GitHub sync is not fully configured
  }

  const url = `${GITHUB_API_BASE}/repos/${username}/${repo}/contents/${path}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (response.status === 404) {
      return []; // File doesn't exist yet, return empty list
    }

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || 'GitHub 데이터를 가져오는데 실패했습니다.');
    }

    const fileData = await response.json();
    // GitHub returns content with newlines sometimes, strip them
    const base64Content = fileData.content.replace(/\s/g, '');
    const decodedText = b64_to_utf8(base64Content);
    
    return JSON.parse(decodedText);
  } catch (error) {
    console.error('GitHub Fetch Error:', error);
    throw error;
  }
}

/**
 * Save/Commit history array back to the user's GitHub repository
 * @param {Array} historyArray - The full history list to write
 */
export async function saveHistoryToGithub(historyArray) {
  const { username, repo, pat, path } = getGithubConfig();
  if (!username || !repo || !pat) {
    return false; // Skip saving to GitHub if not configured
  }

  const url = `${GITHUB_API_BASE}/repos/${username}/${repo}/contents/${path}`;
  const jsonString = JSON.stringify(historyArray, null, 2);
  const base64Content = utf8_to_b64(jsonString);

  try {
    // 1. Get the current file SHA (if it exists) to perform an update
    let sha = '';
    const getResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (getResponse.ok) {
      const currentFileData = await getResponse.json();
      sha = currentFileData.sha;
    }

    // 2. Perform PUT request to create or update the JSON file
    const putBody = {
      message: 'sync: update AffiliWrite history',
      content: base64Content
    };
    if (sha) {
      putBody.sha = sha;
    }

    const putResponse = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(putBody)
    });

    if (!putResponse.ok) {
      const errData = await putResponse.json();
      throw new Error(errData.message || 'GitHub에 데이터를 기록하는데 실패했습니다.');
    }

    return true;
  } catch (error) {
    console.error('GitHub Write Error:', error);
    throw error;
  }
}

/**
 * Save trend configuration to the GitHub repository
 * @param {Object} configObj - The full config object to write
 */
export async function saveTrendConfigToGithub(configObj) {
  const { username, repo, pat } = getGithubConfig();
  if (!username || !repo || !pat) {
    throw new Error('GitHub 연동 정보가 설정되어 있지 않습니다. API 설정에서 깃허브 계정을 등록해주세요.');
  }

  const path = 'trend-rules.json';
  const url = `${GITHUB_API_BASE}/repos/${username}/${repo}/contents/${path}`;
  const jsonString = JSON.stringify(configObj, null, 2);
  const base64Content = utf8_to_b64(jsonString);

  try {
    let sha = '';
    const getResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (getResponse.ok) {
      const currentFileData = await getResponse.json();
      sha = currentFileData.sha;
    }

    const putBody = {
      message: 'config: update TCCG trend configuration',
      content: base64Content
    };
    if (sha) {
      putBody.sha = sha;
    }

    const putResponse = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(putBody)
    });

    if (!putResponse.ok) {
      const errData = await putResponse.json();
      throw new Error(errData.message || 'GitHub에 트렌드 설정을 저장하는데 실패했습니다.');
    }

    return true;
  } catch (error) {
    console.error('GitHub Trend Config Write Error:', error);
    throw error;
  }
}

/**
 * Fetch trend configuration from GitHub repository
 */
export async function fetchTrendConfigFromGithub() {
  const { username, repo, pat } = getGithubConfig();
  if (!username || !repo || !pat) {
    return null;
  }

  const path = 'trend-rules.json';
  const url = `${GITHUB_API_BASE}/repos/${username}/${repo}/contents/${path}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || 'GitHub 트렌드 설정을 가져오는데 실패했습니다.');
    }

    const fileData = await response.json();
    const base64Content = fileData.content.replace(/\s/g, '');
    const decodedText = b64_to_utf8(base64Content);
    return JSON.parse(decodedText);
  } catch (error) {
    console.error('GitHub Trend Config Fetch Error:', error);
    return null;
  }
}

/**
 * Fetch open trend issues from the GitHub repository
 */
export async function fetchTrendIssuesFromGithub() {
  const { username, repo, pat } = getGithubConfig();
  if (!username || !repo || !pat) {
    return [];
  }

  const url = `${GITHUB_API_BASE}/repos/${username}/${repo}/issues?labels=trend-candidate&state=open&per_page=50`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || '트렌드 이슈 목록을 가져오는데 실패했습니다.');
    }

    return await response.json();
  } catch (error) {
    console.error('GitHub Fetch Issues Error:', error);
    throw error;
  }
}

/**
 * Trigger TCCG Trend Crawler GitHub Actions Workflow
 */
export async function triggerTrendCrawlerWorkflow() {
  const { username, repo, pat } = getGithubConfig();
  if (!username || !repo || !pat) {
    throw new Error('GitHub 연동 정보가 설정되어 있지 않습니다. API 설정에서 깃허브 계정을 등록해주세요.');
  }

  const url = `${GITHUB_API_BASE}/repos/${username}/${repo}/actions/workflows/trend-crawler.yml/dispatches`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ref: 'main' })
    });

    if (!response.ok) {
      // 422 Unprocessable Entity happens if workflow file is not found or not active
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || '크롤러 서버 기동에 실패했습니다. API 설정의 토큰 권한(workflow 필수) 또는 파일명을 확인해주세요.');
    }

    return true;
  } catch (error) {
    console.error('GitHub Trigger Workflow Error:', error);
    throw error;
  }
}

