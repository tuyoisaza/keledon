module.exports = [
    {
        name: 'cloud',
        cwd: './cloud',
        command: 'npm run start:dev',
        waitFor: { url: 'http://localhost:3001' }
    },
    {
        name: 'landing',
        cwd: './landing',
        command: 'npm run dev',
        waitFor: { url: 'http://localhost:5173' }
    }
];
