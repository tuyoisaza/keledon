#!/usr/bin/env node

/**
 * Simple test to verify server is reachable
 */

const http = require('http');

function testServerReachability() {
  console.log('🌐 Testing server reachability...');
  
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3002', (res) => {
      console.log(`✅ Server responded with status: ${res.statusCode}`);
      resolve(true);
    });
    
    req.on('error', (error) => {
      console.log(`❌ Server unreachable: ${error.message}`);
      resolve(false);
    });
    
    req.setTimeout(3000, () => {
      console.log('❌ Server request timeout');
      req.destroy();
      resolve(false);
    });
  });
}

testServerReachability().then(reachable => {
  if (reachable) {
    console.log('✅ Server is reachable for testing');
    process.exit(0);
  } else {
    console.log('❌ Server is not reachable');
    process.exit(1);
  }
});