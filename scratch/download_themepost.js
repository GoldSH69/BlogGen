const fs = require('fs');
const path = require('path');

async function downloadHTML() {
  const url = 'https://section.blog.naver.com/ThemePost.naver?directoryNo=33';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    const text = await res.text();
    fs.writeFileSync(path.join(__dirname, 'themepost_html.html'), text, 'utf8');
    console.log('Successfully saved to themepost_html.html');
  } catch (e) {
    console.error('Error:', e);
  }
}

downloadHTML();
