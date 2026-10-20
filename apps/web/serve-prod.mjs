import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

const server = http.createServer((req, res) => {
  // Proxy /api to Worker API on port 8787
  if (req.url.startsWith('/api')) {
    const proxyReq = http.request(
      `http://127.0.0.1:8787${req.url}`,
      {
        method: req.method,
        headers: {
          ...req.headers,
          host: 'localhost:8787',
        },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );

    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Worker API proxy error', details: err.message }));
    });

    req.pipe(proxyReq);
    return;
  }

  // Serve static assets from dist/
  let safePath = path.normalize(req.url.split('?')[0]);
  let filePath = path.join(distDir, safePath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // SPA fallback to index.html
  const indexPath = path.join(distDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream(indexPath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not Found: Please run `pnpm build` first.');
  }
});

server.listen(3000, '0.0.0.0', () => {
  console.log('UI Dashboard listening on http://localhost:3000');
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
