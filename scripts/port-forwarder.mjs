import http from 'node:http';

const TARGET_PORT = 8787;
const PORTS_TO_LISTEN = [3000, 5173];

function createProxyServer(listenPort) {
  const server = http.createServer((clientReq, clientRes) => {
    const options = {
      hostname: '127.0.0.1',
      port: TARGET_PORT,
      path: clientReq.url,
      method: clientReq.method,
      headers: {
        ...clientReq.headers,
        host: `127.0.0.1:${TARGET_PORT}`,
      },
    };

    const proxyReq = http.request(options, (targetRes) => {
      clientRes.writeHead(targetRes.statusCode || 200, targetRes.headers);
      targetRes.pipe(clientRes, { end: true });
    });

    proxyReq.on('error', (err) => {
      clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
      clientRes.end(`Gateway error connecting to worker on port ${TARGET_PORT}: ${err.message}`);
    });

    clientReq.pipe(proxyReq, { end: true });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Gateway] Port ${listenPort} already in use, skipping...`);
    } else {
      console.error(`[Gateway] Error on port ${listenPort}:`, err);
    }
  });

  server.listen(listenPort, '0.0.0.0', () => {
    console.log(`[Gateway] Port ${listenPort} -> http://127.0.0.1:${TARGET_PORT} ready`);
  });

  return server;
}

// Start listeners on both ports
for (const port of PORTS_TO_LISTEN) {
  createProxyServer(port);
}

// Keep the event loop alive permanently
setInterval(() => {}, 60000);
