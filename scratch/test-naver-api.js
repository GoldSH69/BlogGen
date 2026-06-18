async function test() {
  const seq = 30;
  const url = `https://section.blog.naver.com/ajax/DirectoryPostList.naver?directorySeq=${seq}&page=1`;
  try {
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
      if (json.result && Array.isArray(json.result.postList)) {
        const posts = json.result.postList;
        console.log('Post list length:', posts.length);
        if (posts.length > 0) {
          console.log('First post schema:', Object.keys(posts[0]));
          console.log('First post details:', JSON.stringify(posts[0], null, 2));
        }
      }
    }
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
