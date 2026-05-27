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
 * Helper to encode unicode string to base64 safely (handles Korean characters)
 */
function utf8_to_b64(str) {
  return window.btoa(unescape(encodeURIComponent(str)));
}

/**
 * Helper to decode base64 to unicode string safely
 */
function b64_to_utf8(str) {
  return decodeURIComponent(escape(window.atob(str)));
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
        'Authorization': `token ${pat}`,
        'Accept': 'application/vnd.github.v3+json',
        'Cache-Control': 'no-cache'
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
        'Authorization': `token ${pat}`,
        'Accept': 'application/vnd.github.v3+json',
        'Cache-Control': 'no-cache'
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
        'Authorization': `token ${pat}`,
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
