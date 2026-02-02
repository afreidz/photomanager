import 'dotenv/config';
// Custom server to serve /photos/* from disk and proxy other requests to Astro
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { spawn } from 'child_process';

const app = express();
const PORT = process.env.PORT || 3000;

// Start Astro preview server in the background
const astroProcess = spawn('npx', ['astro', 'preview', '--port', '4321'], {
  stdio: 'inherit',
  shell: true,
});

astroProcess.on('error', (err) => {
  console.error('Failed to start Astro preview:', err);
  process.exit(1);
});

// Serve static files from the mounted volume (e.g., /app/public/photos)
const photosDir = path.join(process.cwd(), 'public', 'photos');
app.use('/photos', express.static(photosDir));

// Proxy all other requests to the Astro app
app.use(
  '/',
  createProxyMiddleware({
    target: 'http://localhost:4321',
    changeOrigin: true,
    ws: true,
    pathRewrite: {
      '^/photos': '/photos',
    },
  })
);

app.listen(PORT, () => {
  console.log(`Custom server running on port ${PORT}`);
  console.log(`Serving /photos from ${photosDir}`);
});
