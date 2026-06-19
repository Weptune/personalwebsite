import http from 'http';
import readline from 'readline';

const PORT = 3000;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function run() {
  console.log('=== Spotify Refresh Token Generator ===');
  console.log('1. Go to https://developer.spotify.com/dashboard');
  console.log('2. Create an app (name it anything).');
  console.log(`3. In App Settings, set the Redirect URI to exactly: ${REDIRECT_URI}`);
  console.log('4. Get your Client ID and Client Secret.\n');

  const clientId = await question('Enter your Spotify Client ID: ');
  const clientSecret = await question('Enter your Spotify Client Secret: ');

  if (!clientId || !clientSecret) {
    console.error('Error: Both Client ID and Client Secret are required!');
    rl.close();
    return;
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      
      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Authorization failed: No code returned.');
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Success!</h1><p>You can close this tab and check your terminal.</p>');

      // Exchange code for tokens
      try {
        const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI,
          }),
        });

        const tokens = await tokenRes.json();

        if (tokens.error) {
          console.error('\nError exchanging code for tokens:', tokens.error_description || tokens.error);
        } else {
          console.log('\n=========================================');
          console.log('SUCCESS! Add these to your Vercel Environment Variables:');
          console.log(`SPOTIFY_CLIENT_ID=${clientId}`);
          console.log(`SPOTIFY_CLIENT_SECRET=${clientSecret}`);
          console.log(`SPOTIFY_REFRESH_TOKEN=${tokens.refresh_token}`);
          console.log('=========================================');
          console.log('\nAlso add them to your local .env file to test locally!');
        }
      } catch (err) {
        console.error('Error fetching tokens:', err);
      } finally {
        rl.close();
        server.close();
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  server.listen(PORT, () => {
    const scopes = encodeURIComponent('user-read-currently-playing user-read-recently-played');
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scopes}`;
    
    console.log('\nOpen this link in your browser to authorize your app:');
    console.log('\x1b[36m%s\x1b[0m', authUrl);
    console.log('\nWaiting for authorization redirect...');
  });
}

run().catch(console.error);
