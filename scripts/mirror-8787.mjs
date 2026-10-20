import http from 'node:http';

const server = http.createServer((req, res) => {
  const proxy = http.request({
    hostname: '127.0.0.1',
    port: 3000,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: '127.0.0.1:3000' }
  }, (pRes) => {
    res.writeHead(pRes.statusCode || 200, pRes.headers);
    pRes.pipe(res, { end: true });
  });
  proxy.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Gateway mirroring to port 3000...');
  });
  req.pipe(proxy, { end: true });
});

server.listen(8787, '0.0.0.0', () => {
  console.log('[Mirror] Port 8787 -> Port 3000 active');
});
