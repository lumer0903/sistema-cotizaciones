import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CotizacionesPdfService } from './cotizaciones-pdf.service';
import { PdfStorageService } from './pdf-storage.service';
import { PDF_QUEUE } from './pdf.constants';

export interface PdfJobData {
  id_cotizacion: number;
}

export interface PdfJobResult {
  key: string;
  url: string | null;
  filename: string;
  hash: string;
}

@Injectable()
@Processor(PDF_QUEUE, { concurrency: 2 })
export class PdfProcessor extends WorkerHost {
  private readonly logger = new Logger(PdfProcessor.name);

  constructor(
    private readonly pdfService: CotizacionesPdfService,
    private readonly storage: PdfStorageService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<PdfJobData, PdfJobResult, string>): Promise<PdfJobResult> {
    const { id_cotizacion } = job.data;
    this.logger.log(`Generando PDF de cotización ${id_cotizacion} (job ${job.id})`);

    const { buffer, filename, hash } = await this.pdfService.generarPdfBuffer(id_cotizacion);
    const { key, url } = await this.storage.save(id_cotizacion, hash, buffer);

    await this.prisma.cotizacion.update({
      where: { id_cotizacion },
      data: { pdf_key: key, pdf_hash: hash, pdf_generado_en: new Date() },
    });

    this.logger.log(`PDF de cotización ${id_cotizacion} almacenado en ${key}`);
    return { key, url, filename, hash };
  }
}
