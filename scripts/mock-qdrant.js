const http = require('http');

/**
 * Mock Qdrant server for Phase 1 testing
 * Simulates Qdrant health endpoint
 */
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      version: { version: "1.9.0" },
      result: true
    }));
  } else if (req.url === '/collections') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      result: {
        collections: []
      }
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(6333, () => {
  console.log('Mock Qdrant server running on port 6333');
  console.log('Health endpoint: http://localhost:6333/health');
});