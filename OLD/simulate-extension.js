const io = require('socket.io-client');

const socket = io('http://localhost:3001', {
    transports: ['websocket']
});

socket.on('connect', () => {
    console.log('✅ Connected to Cloud');
    console.log('Registering as extension...');
    socket.emit('register-extension');
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected');
});

socket.on('registered', (data) => {
    console.log('✅ Registered successfully as:', data.type);
});

socket.on('start-recording', (data) => {
    console.log('🎬 Start recording received:', data.sessionId);
});

// Keep alive
setInterval(() => {
    if (socket.connected) console.log('💓 Heartbeat');
}, 5000);
