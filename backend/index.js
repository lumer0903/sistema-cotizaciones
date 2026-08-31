const app = require('./src/app');

const PORT = 3001;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`API Gold Continent activa en http://localhost:${PORT}`);
});

function shutdown(signal) {
    console.log(`\n${signal}: cerrando servidor...`);
    server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = server;
