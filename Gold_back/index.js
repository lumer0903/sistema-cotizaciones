const app = require('./src/app');

const PORT = Number(process.env.PORT) || 3001;
const server = app.listen(PORT, () => {
    console.log(`API Gold Continent activa en http://localhost:${PORT}`);
});

function shutdown(signal) {
    console.log(`\n${signal}: cerrando servidor...`);
    server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = server;
