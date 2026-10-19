// El borrado físico de precios/historial ya no forma parte del flujo de seed.
console.error('Use pnpm --filter @goldcontinent/database db:seed. El seed conserva el historial y registra actor.');
process.exitCode=1;
