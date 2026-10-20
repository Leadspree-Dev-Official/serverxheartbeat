import http from 'node:http';

const PROXY_PORT = 5173;
const TARGET_PORT = 3000;

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
    // If port 3000 isn't answering, try port 8787
    const fallbackOptions = {
      hostname: '127.0.0.1',
      port: 8787,
      path: clientReq.url,
      method: clientReq.method,
      headers: {
        ...clientReq.headers,
        host: '127.0.0.1:8787',
      },
    };

    const fallbackReq = http.request(fallbackOptions, (fbRes) => {
      clientRes.writeHead(fbRes.statusCode || 200, fbRes.headers);
      fbRes.pipe(clientRes, { end: true });
    });

    fallbackReq.on('error', (fbErr) => {
      clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
      clientRes.end(`Gateway error: ${err.message} / ${fbErr.message}`);
    });

    clientReq.pipe(fallbackReq, { end: true });
  });

  clientReq.pipe(proxyReq, { end: true });
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`[Forwarder] Port ${PROXY_PORT} -> ${TARGET_PORT} / 8787 listening`);
});
