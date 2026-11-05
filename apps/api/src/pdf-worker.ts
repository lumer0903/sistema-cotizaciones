import './load-env'; // debe ir primero: carga .env de la raíz
import { NestFactory } from '@nestjs/core';
import type { Request, Response, NextFunction } from 'express';
import { WorkerModule } from './worker.module';
import { getPdfRole } from './modules/cotizaciones/pdf/pdf.constants';

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('Unhandled Rejection at:', new Date().toISOString(), 'Promise:', promise, 'Reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception at:', new Date().toISOString(), error);
  process.exit(1);
});

async function bootstrap() {
  const rol = getPdfRole();
  if (rol === 'producer') {
    console.error(
      '[pdf-worker] PDF_ROLE=producer: este proceso no consume la cola. Usa PDF_ROLE=consumer (o both).',
    );
    process.exit(1);
  }

  const app = await NestFactory.create(WorkerModule, {
    logger: ['log', 'error', 'warn'],
  });

  // Este proceso NO es una API: el grafo interno trae controllers de negocio
  // (el render PDF depende de CotizacionesService), pero sólo /health es
  // alcanzable por HTTP. El middleware se registra antes del router de Nest.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/health') return next();
    res.status(404).json({ statusCode: 404, message: 'pdf-worker: sólo /health está expuesto' });
  });

  // Puerto propio (default 3002): el API usa 3001 y ambos pueden correr en la misma host
  const port = process.env.PDF_WORKER_PORT || 3002;
  await app.listen(port);
  console.log(`[pdf-worker] Worker BullMQ escuchando (salud en :${port}/health, PDF_ROLE=${rol})`);
}
bootstrap();
