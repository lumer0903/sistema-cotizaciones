import 'dotenv/config';
import { app } from './app';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API Gold Continent running on http://localhost:${PORT}`);
});

function shutdown(signal: string) {
  console.log(`\n${signal}: shutting down server...`);
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forced shutdown');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));