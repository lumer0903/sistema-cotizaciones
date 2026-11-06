/** Opciones raíz de BullMQ compartidas por el proceso API (app.module) y el
 *  worker dedicado (worker.module): misma conexión Redis, un solo lugar de cambio. */
export function bullRootOptions() {
  const connection: {
    host: string;
    port: number;
    password?: string;
    tls?: Record<string, never>;
  } = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  };

  if (process.env.REDIS_PASSWORD) {
    connection.password = process.env.REDIS_PASSWORD;
  }
  if (process.env.REDIS_TLS === 'true') {
    connection.tls = {};
  }

  return { connection };
}
