import { createServer } from 'vite';

const server = await createServer({
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});

await server.listen();
server.printUrls();

// Keep event loop alive indefinitely
setInterval(() => {}, 1000 * 60 * 60);
