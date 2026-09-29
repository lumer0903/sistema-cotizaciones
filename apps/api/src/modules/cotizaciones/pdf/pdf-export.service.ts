import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue, Job } from 'bullmq';
import { CotizacionesService } from '../cotizaciones.service';
import { PdfStorageService } from './pdf-storage.service';
import {
  MSJ_SIN_REDIS,
  PDF_JOB_NAME,
  PDF_POLL_INTERVAL_MS,
  PDF_QUEUE,
  PDF_REDIS_TIMEOUT_MS,
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

    // Fail-fast: con Redis caído, queue.add() nunca resuelve y la petición se
    // cuelga (spinner infinito en el FE). Verificamos la cola con tope de 3s.
    await this.assertColaLista();

    await this.conTope(
      this.pdfQueue.add(
        PDF_JOB_NAME,
        { id_cotizacion: id },
        {
          jobId,
          attempts: 2,
          backoff: { type: 'exponential', delay: 3000 },
        },
      ),
    );

    const deadline = Date.now() + PDF_WAIT_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const job = await this.getJobSeguro(jobId);
      if (!job) break; // job eliminado/olvidado (o Redis no responde): pendiente
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

    await this.assertColaLista();

    const job = await this.conTope(this.pdfQueue.getJob(pdfJobId(id, hash)));
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

  /**
   * Fail-fast de Redis: espera `waitUntilReady()` con tope de PDF_REDIS_TIMEOUT_MS.
   * Sin Redis, BullMQ reintenta la conexión para siempre y add()/getJob() se
   * cuelgan — aquí se responde 503 con un mensaje accionable en su lugar.
   */
  private async assertColaLista(): Promise<void> {
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.pdfQueue.waitUntilReady(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('redis-timeout')), PDF_REDIS_TIMEOUT_MS);
        }),
      ]);
    } catch {
      throw new ServiceUnavailableException(MSJ_SIN_REDIS);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /** Cualquier operación de cola (add/getJob) con tope de PDF_REDIS_TIMEOUT_MS.
   *  Nota: waitUntilReady() puede resolver si la cola ya estuvo lista antes de la
   *  caída, por lo que add()/getJob() también necesitan su propio tope — si no,
   *  quedan en la offline queue de ioredis y la petición se cuelga igual. */
  private async conTope<T>(operacion: Promise<T>): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        operacion,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new ServiceUnavailableException(MSJ_SIN_REDIS)), PDF_REDIS_TIMEOUT_MS);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /** getJob con tope: si Redis no responde en PDF_REDIS_TIMEOUT_MS, tratamos el
   *  job como inexistente (la respuesta sale "processing" en vez de colgar). */
  private async getJobSeguro(jobId: string): Promise<Job | null> {
    let timer: NodeJS.Timeout | undefined;
    try {
      const job = await Promise.race([
        this.pdfQueue.getJob(jobId),
        new Promise<null>((resolve) => {
          timer = setTimeout(() => resolve(null), PDF_REDIS_TIMEOUT_MS);
        }),
      ]);
      return job ?? null;
    } catch {
      return null;
    } finally {
      if (timer) clearTimeout(timer);
    }
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
