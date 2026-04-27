const fs = require('fs');
const path = require('path');

const albumsDir = path.join(__dirname, 'src', 'content', 'albums');
const albums = fs.readdirSync(albumsDir).filter(f => fs.statSync(path.join(albumsDir, f)).isDirectory());

const parsedAlbums = [];

for (const folder of albums) {
  const mdPath = path.join(albumsDir, folder, 'index.md');
  if (!fs.existsSync(mdPath)) continue;
  
  const content = fs.readFileSync(mdPath, 'utf8');
  const titleMatch = content.match(/title:\s*['"](.*?)['"]/);
  const artistMatch = content.match(/artists:[\s\S]*?-\s*['"](.*?)['"]/);
  
  if (titleMatch && artistMatch) {
    const title = titleMatch[1];
    const artist = artistMatch[1];
    
    // Aggressive normalization
    let normTitle = title.toLowerCase();
    normTitle = normTitle.replace(/\(.*?remaster.*?\)/g, '');
    normTitle = normTitle.replace(/\(.*?deluxe.*?\)/g, '');
    normTitle = normTitle.replace(/\(.*?\)/g, ''); 
    normTitle = normTitle.replace(/\[.*?\]/g, ''); 
    
    if (normTitle.includes(' - ')) {
      normTitle = normTitle.split(' - ')[0]; // safely split by spaced dash only to catch "- Remastered"
    }
    
    normTitle = normTitle.replace(/[^a-z0-9]/g, ''); 
    
    let normArtist = artist.toLowerCase();
    normArtist = normArtist.replace(/[^a-z0-9]/g, '');
    
    parsedAlbums.push({ folder, title, artist, normTitle, normArtist, path: path.join(albumsDir, folder) });
  }
}

// Group duplicates
const groups = {};
for (const a of parsedAlbums) {
  const key = `${a.normTitle}-${a.normArtist}`;
  if (!groups[key]) groups[key] = [];
  groups[key].push(a);
}

let deletedCount = 0;
for (const key in groups) {
  if (groups[key].length > 1) {
    console.log(`\nDuplicate match found:`);
    groups[key].forEach(dup => console.log(`  - [${dup.folder}] ${dup.title}`));
    
    // Sort so that the folder with the shortest name is kept (usually the cleaner manually-typed one)
    groups[key].sort((a, b) => a.folder.length - b.folder.length);
    
    // Keep the first one, delete the rest
    for (let i = 1; i < groups[key].length; i++) {
      const dup = groups[key][i];
      console.log(`  -> DELETING duplicate folder: ${dup.folder}`);
      fs.rmSync(dup.path, { recursive: true, force: true });
      deletedCount++;
    }
  }
}

console.log(`\nOperation complete. Successfully identified and removed ${deletedCount} duplicate albums.`);
