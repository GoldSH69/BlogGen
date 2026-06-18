async function test() {
  const url = 'https://section.blog.naver.com/ajax/DirectoryList.naver';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://section.blog.naver.com/',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    
    let text = await res.text();
    text = text.replace(/^\s*\)\]\}',\s*/, ''); // Remove the Naver security header
    const data = JSON.parse(text);
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
