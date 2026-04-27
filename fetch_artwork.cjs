const fs = require('fs');
const path = require('path');
const https = require('https');

const CLIENT_ID = 'df481019eee34087a9e1f1d8a794539d';
const CLIENT_SECRET = '4877f67037ea41fba9d2a7873f51aa07';

async function fetchImage(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchImage(res.headers.location, dest).then(resolve).catch(reject);
      }
      const fileStream = fs.createWriteStream(dest);
      res.pipe(fileStream);
      fileStream.on('finish', () => resolve());
    }).on('error', reject);
  });
}

async function run() {
  console.log('Getting Spotify Access Token...');
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' })
  });
  const tokenData = await tokenRes.json();
  const spotifyToken = tokenData.access_token;
  
  console.log('\n--- FETCHING ALBUM COVERS ---');
  const albumsDir = path.join(__dirname, 'src', 'content', 'albums');
  const albums = fs.readdirSync(albumsDir).filter(f => fs.statSync(path.join(albumsDir, f)).isDirectory());
  
  for (const folder of albums) {
    const mdPath = path.join(albumsDir, folder, 'index.md');
    if (!fs.existsSync(mdPath)) continue;
    
    const content = fs.readFileSync(mdPath, 'utf8');
    if (content.includes('date: 2026-04-26') && !content.includes('added by spotify sync')) {
      const titleMatch = content.match(/title:\s*['"](.*?)['"]/);
      const artistMatch = content.match(/artists:\n\s+-\s*['"](.*?)['"]/);
      
      if (titleMatch && artistMatch) {
        const title = titleMatch[1];
        const artist = artistMatch[1];
        
        const query = encodeURIComponent(`album:${title} artist:${artist}`);
        const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=album&limit=1`, {
          headers: { 'Authorization': 'Bearer ' + spotifyToken }
        });
        const searchData = await searchRes.json();
        
        if (searchData.albums && searchData.albums.items.length > 0) {
          const imgUrl = searchData.albums.items[0].images[0].url;
          await fetchImage(imgUrl, path.join(albumsDir, folder, 'cover.jpg'));
          console.log(`[Spotify] Downloaded high-res cover for: ${title}`);
        }
      }
    }
  }

  console.log('\n--- FETCHING MOVIE POSTERS ---');
  const moviesDir = path.join(__dirname, 'src', 'content', 'movies');
  const movies = fs.readdirSync(moviesDir).filter(f => fs.statSync(path.join(moviesDir, f)).isDirectory());
  
  for (const folder of movies) {
    // some are named index.md but we replaced them with [foldername].md
    const mdPath1 = path.join(moviesDir, folder, `${folder}.md`);
    const mdPath2 = path.join(moviesDir, folder, 'index.md');
    const mdPath = fs.existsSync(mdPath1) ? mdPath1 : (fs.existsSync(mdPath2) ? mdPath2 : null);
    
    if (!mdPath) continue;
    
    const content = fs.readFileSync(mdPath, 'utf8');
    if (content.includes('date: 2026-04-25') || content.includes('date: 2026-04-26')) {
      const titleMatch = content.match(/title:\s*['"](.*?)['"]/);
      if (titleMatch) {
        const title = titleMatch[1];
        const query = encodeURIComponent(title);
        // Using Apple iTunes Search API which is free and has high quality movie posters
        const searchRes = await fetch(`https://itunes.apple.com/search?term=${query}&entity=movie&limit=1`);
        const searchData = await searchRes.json();
        
        if (searchData.results && searchData.results.length > 0) {
          // Request 1000x1000 instead of default 100x100 thumbnail
          const imgUrl = searchData.results[0].artworkUrl100.replace('100x100bb', '1000x1000bb');
          await fetchImage(imgUrl, path.join(moviesDir, folder, 'poster.jpg'));
          console.log(`[iTunes] Downloaded high-res poster for: ${title}`);
        }
      }
    }
  }
  
  console.log('\nAll missing artwork has been completely fetched and updated!');
}

run();
