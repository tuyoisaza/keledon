require('dotenv').config({ path: '.env.cloud.local' });
const { spawn } = require('child_process');

const server = spawn('npx', ['ts-node', 'src/main.ts'], {
  env: { ...process.env, PORT: '3001' },
  stdio: 'inherit',
  shell: true
});

server.on('close', (code) => {
  process.exit(code);
});
