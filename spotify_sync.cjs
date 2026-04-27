const fs = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');

const CLIENT_ID = 'df481019eee34087a9e1f1d8a794539d';
const CLIENT_SECRET = '4877f67037ea41fba9d2a7873f51aa07';
const REDIRECT_URI = 'https://example.com/callback';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=user-library-read`;

console.log('1. Click or copy this URL to authorize:');
console.log(authUrl);

rl.question('\n2. Paste the exact URL it redirects you to (the one starting with https://localhost...): ', async (redirectedUrl) => {
  try {
    const codeMatch = redirectedUrl.match(/code=([^&]+)/);
    if (!codeMatch) {
      console.log('No code found in URL. Make sure you copy the entire redirected URL.');
      process.exit(1);
    }
    const code = codeMatch[1];
    
    // Exchange code for token
    console.log('\nAuthenticating with Spotify...');
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI
      })
    });
    
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error('Failed to get token:', tokenData);
      process.exit(1);
    }
    
    const accessToken = tokenData.access_token;
    console.log('Successfully authenticated!');
    
    // Fetch all saved albums
    let albums = [];
    let nextUrl = 'https://api.spotify.com/v1/me/albums?limit=50';
    
    console.log('Fetching saved albums from your library...');
    while (nextUrl) {
      const res = await fetch(nextUrl, {
        headers: { 'Authorization': 'Bearer ' + accessToken }
      });
      const data = await res.json();
      if (data.items) {
        albums = albums.concat(data.items.map(item => item.album));
      }
      nextUrl = data.next;
    }
    
    console.log(`Found ${albums.length} saved albums in your Spotify library.`);
    
    // Sync with existing folders
    const albumsDir = path.join(__dirname, 'src', 'content', 'albums');
    const existingFolders = fs.readdirSync(albumsDir).filter(f => fs.statSync(path.join(albumsDir, f)).isDirectory());
    
    let addedCount = 0;
    
    for (const album of albums) {
      // Create a slug for the folder name
      let slug = album.name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
        
      if (!slug) continue;
      
      if (!existingFolders.includes(slug)) {
        const folderPath = path.join(albumsDir, slug);
        fs.mkdirSync(folderPath, { recursive: true });
        
        // Generate index.md
        const year = album.release_date ? album.release_date.split('-')[0] : '';
        const artists = album.artists.map(a => a.name);
        let artistsYaml = artists.map(a => `  - '${a.replace(/'/g, "''")}'`).join('\n');
        
        const dateStr = new Date().toISOString().split('T')[0];
        
        const mdContent = `---
title: '${album.name.replace(/'/g, "''")}'
description: ''
date: ${dateStr}
year: ${year}
artists:
${artistsYaml}
rating: 80
image: './cover.jpg'
---

Review coming soon.
`;
        fs.writeFileSync(path.join(folderPath, 'index.md'), mdContent);
        
        // Download cover image
        if (album.images && album.images.length > 0) {
          const imageUrl = album.images[0].url;
          const imgPath = path.join(folderPath, 'cover.jpg');
          
          await new Promise((resolve, reject) => {
            https.get(imageUrl, (res) => {
              const fileStream = fs.createWriteStream(imgPath);
              res.pipe(fileStream);
              fileStream.on('finish', () => resolve());
            }).on('error', reject);
          });
        }
        addedCount++;
        console.log(`Added missing album: ${album.name}`);
      }
    }
    
    console.log(`\n=================================================`);
    console.log(`Sync complete! Successfully synced ${addedCount} missing albums directly from Spotify along with their official high-res covers!`);
    console.log(`=================================================`);
    process.exit(0);
    
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
});
