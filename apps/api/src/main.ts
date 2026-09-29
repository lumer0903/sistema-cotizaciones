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

  app.use(cookieParser());
  app.use(helmet());

  // Límite duro para endpoints de credenciales — antes del limitador global
  app.use(
    '/api/auth',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req, res) =>
        res.status(429).json({ success: false, message: 'Demasiados intentos. Intente más tarde.' }),
    }),
  );

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req, res) =>
        res.status(429).json({ success: false, message: 'Demasiadas solicitudes. Intente más tarde.' }),
    }),
  );
  app.enableCors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  });

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