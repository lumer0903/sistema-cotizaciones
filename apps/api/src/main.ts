import './load-env'; // debe ir primero: carga .env de la raíz (JWT_SECRET sin fallback)
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module';
import { getPdfRole } from './modules/cotizaciones/pdf/pdf.constants';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as express from 'express';
import * as path from 'path';
import type { Request, Response, NextFunction } from 'express';

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('Unhandled Rejection at:', new Date().toISOString(), 'Promise:', promise, 'Reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception at:', new Date().toISOString(), error);
  process.exit(1);
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Detrás de Fly/NGINX confiar UN solo hop (sin esto todas las IPs comparten el bucket de rate-limit)
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // CORS ANTES de los limiters: si un 429 llega antes que los headers CORS, el
  // navegador lo reporta como error CORS y oculta el 429 real (rompía /auth/me
  // bajo carga y expulsaba la sesión hacia /login).
  app.enableCors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Servir archivos locales estáticos si existen en uploads (fallback de almacenamiento)
  const uploadsPath = process.env.STORAGE_PATH || path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(path.resolve(uploadsPath)));

  app.use(cookieParser());
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // Desactivación de caché HTTP en respuestas de API para desarrollo y navegación en tiempo real
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  // Límite duro SOLO para endpoints de credenciales (login/refresh). Antes cubría
  // todo /api/auth incluido /auth/me: el auth provider lo llama en cada
  // navegación, agotaba 20/15min y la web cerraba la sesión de usuarios reales.
  const credencialesLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS',
    handler: (_req, res) =>
      res.status(429).json({ success: false, message: 'Demasiados intentos. Intente más tarde.' }),
  });
  app.use('/api/auth/login', credencialesLimiter);
  app.use('/api/auth/refresh', credencialesLimiter);

  // Límite global por ventana: configurable vía env (QA/automatización desde una
  // misma IP agotan 300/15min; producción con uso humano holgado en 300)
  const rateLimitMax = Number(process.env.RATE_LIMIT_MAX) || 300;
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req, res) =>
        res.status(429).json({ success: false, message: 'Demasiadas solicitudes. Intente más tarde.' }),
    }),
  );

  app.useGlobalPipes(new ValidationPipe({ 
    transform: true, 
    whitelist: true, 
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
  }));
  app.useGlobalFilters(new AllExceptionsFilter());

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('GoldContinent API')
    .setDescription('Documentación interactiva de la API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  app.use(
    '/reference',
    apiReference({
      spec: {
        content: document,
      },
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  const pdfRole = getPdfRole();
  console.log(`Application is running on port ${port}`);
  console.log(
    `PDF_ROLE=${pdfRole} → worker de PDFs en este proceso: ${pdfRole === 'both' ? 'sí' : 'no (requiere pdf-worker)'}`,
  );
}
bootstrap();
