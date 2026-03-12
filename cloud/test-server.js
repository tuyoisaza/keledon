const http = require('http');

console.log('[TEST] Simple HTTP server starting...');

const server = http.createServer((req, res) => {
  console.log('[TEST] Received request:', req.url);
  
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('KELEDON Test Server');
  }
});

server.listen(3000, '0.0.0.0', () => {
  console.log('[TEST] Server listening on port 3000');
});
