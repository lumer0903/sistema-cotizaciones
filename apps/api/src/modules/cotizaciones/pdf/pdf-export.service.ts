import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { CotizacionesService } from '../cotizaciones.service';
import { PdfStorageService } from './pdf-storage.service';
import {
  PDF_JOB_NAME,
  PDF_POLL_INTERVAL_MS,
  PDF_QUEUE,
  PDF_WAIT_TIMEOUT_MS,
  pdfJobId,
} from './pdf.constants';
import { computePdfHash } from './pdf-hash';

export type PdfExportResult =
  | { type: 'buffer'; buffer: Buffer; filename: string; cached: boolean }
  | { type: 'processing'; jobId: string };

export type PdfStatusResult = {
  estado: 'listo' | 'generando' | 'pendiente';
  jobId?: string;
  pdf_generado_en?: Date | null;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class PdfExportService {
  private readonly logger = new Logger(PdfExportService.name);

  constructor(
    @InjectQueue(PDF_QUEUE) private readonly pdfQueue: Queue,
    private readonly storage: PdfStorageService,
    private readonly cotizacionesService: CotizacionesService,
  ) {}

  /**
   * Flujo híbrido:
   * - hash sin cambios + PDF almacenado → binario cacheado (200).
   * - si no → encola 'generate-pdf' y espera hasta PDF_WAIT_TIMEOUT_MS.
   * - timeout → { type: 'processing' } para responder 202 + polling.
   */
  async exportar(id: number): Promise<PdfExportResult> {
    const cot = await this.cotizacionesService.obtenerPorId(id);
    const hash = computePdfHash(cot);
    const jobId = pdfJobId(id, hash);

    if (cot.pdf_key && cot.pdf_hash === hash) {
      const buffer = await this.storage.read(cot.pdf_key);
      if (buffer) return { type: 'buffer', buffer, filename: filenameFor(cot), cached: true };
      this.logger.warn(`PDF cacheado no legible (${cot.pdf_key}); se regenera`);
    }

    await this.pdfQueue.add(
      PDF_JOB_NAME,
      { id_cotizacion: id },
      {
        jobId,
        attempts: 2,
        backoff: { type: 'exponential', delay: 3000 },
      },
    );

    const deadline = Date.now() + PDF_WAIT_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const job = await this.pdfQueue.getJob(jobId);
      if (!job) break; // job eliminado/olvidado: tratamos como pendiente
      const state = await job.getState();

      if (state === 'completed') {
        const almacenado = await this.leerDesdeAlmacen(id, hash);
        if (almacenado) {
          return { type: 'buffer', buffer: almacenado, filename: filenameFor(cot), cached: false };
        }
        break;
      }
      if (state === 'failed') {
        this.logger.error(`Job ${jobId} falló: ${job.failedReason || 'sin detalle'}`);
        throw new InternalServerErrorException(
          'No se pudo generar el PDF de la cotización. Intente nuevamente.',
        );
      }
      await sleep(PDF_POLL_INTERVAL_MS);
    }

    return { type: 'processing', jobId };
  }

  async status(id: number): Promise<PdfStatusResult> {
    const cot = await this.cotizacionesService.obtenerPorId(id);
    const hash = computePdfHash(cot);

    if (cot.pdf_key && cot.pdf_hash === hash) {
      return { estado: 'listo', pdf_generado_en: cot.pdf_generado_en };
    }

    const job = await this.pdfQueue.getJob(pdfJobId(id, hash));
    if (job) {
      const state = await job.getState();
      if (state !== 'completed' && state !== 'failed') {
        return { estado: 'generando', jobId: job.id };
      }
      if (state === 'failed') {
        return { estado: 'pendiente', jobId: job.id };
      }
      const almacenado = await this.leerDesdeAlmacen(id, hash);
      if (almacenado) return { estado: 'listo', pdf_generado_en: cot.pdf_generado_en };
    }
    return { estado: 'pendiente' };
  }

  private async leerDesdeAlmacen(id: number, hashActual: string): Promise<Buffer | null> {
    const cot = await this.cotizacionesService.obtenerPorId(id);
    if (!cot.pdf_key || cot.pdf_hash !== hashActual) return null;
    return this.storage.read(cot.pdf_key);
  }
}

function filenameFor(cot: { numero?: string | null; id_cotizacion: number }): string {
  const base = String(cot.numero || `COT-${cot.id_cotizacion}`).replace(/[^A-Za-z0-9-_]+/g, '_');
  return `${base}.pdf`;
}
