/** Opciones raíz de BullMQ compartidas por el proceso API (app.module) y el
 *  worker dedicado (worker.module): misma conexión Redis, un solo lugar de cambio. */
export function bullRootOptions() {
  return {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },
  };
}
