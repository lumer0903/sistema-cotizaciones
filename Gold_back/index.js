const app = require('./src/app');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
    console.log(`API Gold Continent activa en http://${HOST}:${PORT}`);
});

function shutdown(signal) {
    console.log(`\n${signal}: cerrando servidor...`);
    server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = server;
