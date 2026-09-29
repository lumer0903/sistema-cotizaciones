import { DynamicModule, Logger, Module } from '@nestjs/common';
import { CotizacionesModule } from '../cotizaciones.module';
import { PdfProcessor } from './pdf.processor';
import { getPdfRole } from './pdf.constants';

/** Entrada de proceso: API HTTP (main.ts) o worker dedicado (pdf-worker.ts). */
export type PdfWorkerEntrada = 'api' | 'worker';

/**
 * Registra condicionalmente el worker BullMQ (PdfProcessor, Chromium) según
 * PDF_ROLE y la entrada del proceso:
 *
 * | PDF_ROLE | entrada api | entrada worker |
 * |----------|-------------|----------------|
 * | both     | activo      | activo         |
 * | producer | inactivo    | inactivo*      |
 * | consumer | inactivo    | activo         |
 *
 * (*) un proceso worker con PDF_ROLE=producer es error de configuración.
 */
@Module({})
export class PdfWorkerModule {
  private static readonly logger = new Logger(PdfWorkerModule.name);

  static forRoot(entrada: PdfWorkerEntrada): DynamicModule {
    const rol = getPdfRole();
    const activo = entrada === 'api' ? rol === 'both' : rol !== 'producer';

    if (entrada === 'worker' && rol === 'producer') {
      PdfWorkerModule.logger.error(
        'PDF_ROLE=producer: este proceso no puede consumir la cola (no procesará PDFs). Usa PDF_ROLE=consumer.',
      );
    } else if (activo) {
      PdfWorkerModule.logger.log(`Worker BullMQ ACTIVO (entrada=${entrada}, PDF_ROLE=${rol})`);
    } else {
      PdfWorkerModule.logger.log(
        `Worker BullMQ en espera de otro proceso (entrada=${entrada}, PDF_ROLE=${rol})`,
      );
    }

    return {
      module: PdfWorkerModule,
      imports: [CotizacionesModule],
      providers: activo ? [PdfProcessor] : [],
    };
  }
}
