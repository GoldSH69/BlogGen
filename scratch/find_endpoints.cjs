const fs = require('fs');
const path = require('path');

async function findEndpoints() {
  const bundles = [
    'https://ssl.pstatic.net/t.static.blog/section/versioning/NgAppBundle1-1786807267_https.js',
    'https://ssl.pstatic.net/t.static.blog/section/versioning/NgAppBundle2-1191914168_https.js'
  ];

  for (const url of bundles) {
    console.log(`Downloading bundle: ${url}...`);
    try {
      const res = await fetch(url);
      const text = await res.text();
      console.log(`Bundle downloaded. Length: ${text.length}. Searching for "/ajax/"...`);
      
      const regex = /\/ajax\/[a-zA-Z0-9_\.]+/g;
      const matches = text.match(regex) || [];
      const uniqueMatches = [...new Set(matches)];
      console.log(`Found ${uniqueMatches.length} unique endpoints in this bundle:`, uniqueMatches);
    } catch (e) {
      console.error('Error downloading bundle:', e.message);
    }
  }
}

findEndpoints();
