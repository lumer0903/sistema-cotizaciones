import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { MinioModule } from '../../common/storage/minio.module';
import { CotizacionesController } from './cotizaciones.controller';
import { CotizacionesService } from './cotizaciones.service';
import { CotizacionesPdfService } from './pdf/cotizaciones-pdf.service';
import { PdfStorageService } from './pdf/pdf-storage.service';
import { PdfExportService } from './pdf/pdf-export.service';
import { PDF_QUEUE } from './pdf/pdf.constants';
import { RecomendacionesModule } from './recomendaciones/recomendaciones.module';

@Module({
    imports: [
        PrismaModule,
        RecomendacionesModule,
        MinioModule,
        BullModule.registerQueue({
            name: PDF_QUEUE,
            defaultJobOptions: {
                attempts: 2,
                backoff: { type: 'exponential', delay: 3000 },
                removeOnComplete: { count: 200 },
                removeOnFail: { count: 200 },
            },
        }),
    ],
    controllers: [CotizacionesController],
    providers: [
        CotizacionesService,
        CotizacionesPdfService,
        PdfStorageService,
        PdfExportService,
    ],
    // PdfProcessor (worker BullMQ) vive en PdfWorkerModule (registro condicional por PDF_ROLE)
    exports: [CotizacionesService, CotizacionesPdfService, PdfExportService, PdfStorageService],
})
export class CotizacionesModule { }
