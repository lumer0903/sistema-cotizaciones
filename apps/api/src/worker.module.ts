import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { HealthController } from './health.controller';
import { bullRootOptions } from './common/bull/bull-root.options';
import { StorageModule } from './common/storage/storage.module';
import { PdfWorkerModule } from './modules/cotizaciones/pdf/pdf-worker.module';

/**
 * Módulo raíz del proceso dedicado de PDFs (pdf-worker.ts): sólo salud + el
 * worker BullMQ. Sin controllers de negocio ni HTTP público más allá de /health.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    StorageModule, // @Global: hay que importarlo una vez (PdfStorageService → StorageService)
    BullModule.forRootAsync({
      useFactory: bullRootOptions,
    }),
    PdfWorkerModule.forRoot('worker'),
  ],
  controllers: [HealthController],
})
export class WorkerModule { }
