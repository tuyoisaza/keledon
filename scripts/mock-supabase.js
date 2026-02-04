const http = require('http');

/**
 * Mock Supabase server for Phase 2 testing
 * Simulates Supabase REST API endpoints
 */
const server = http.createServer((req, res) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey'
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  if (req.url === '/rest/v1/' && req.method === 'GET') {
    res.writeHead(406, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: "Not Acceptable - no tables yet (expected)"
    }));
  } else if (req.url === '/rest/v1/sessions' && req.method === 'GET') {
    res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify([])); // Empty sessions table
  } else if (req.url === '/rest/v1/events' && req.method === 'GET') {
    res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify([])); // Empty events table
  } else if (req.url === '/rest/v1/agents' && req.method === 'GET') {
    res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify([])); // Empty agents table
  } else {
    res.writeHead(404, corsHeaders);
    res.end();
  }
});

server.listen(3000, () => {
  console.log('Mock Supabase server running on port 3000');
  console.log('REST API: http://localhost:3000/rest/v1/');
  console.log('Use this for Phase 2 testing:');
  console.log('  export SUPABASE_URL=http://localhost:3000');
  console.log('  export SUPABASE_ANON_KEY=mock-key');
});