import { describe, it, expect, vi, afterEach } from 'vitest';
import { InternalServerErrorException } from '@nestjs/common';
import { PdfExportService } from './pdf-export.service';
import { computePdfHash } from './pdf-hash';
import { PDF_WAIT_TIMEOUT_MS, pdfJobId } from './pdf.constants';

type CotState = Record<string, any>;

function makeCot(overrides: CotState = {}): CotState {
  return {
    id_cotizacion: 1,
    numero: 'COT-001',
    estado: 'borrador',
    created_at: new Date('2026-09-26T10:00:00Z'),
    tipo_precio: 'normal',
    fecha_vencimiento: null,
    observaciones: null,
    incluye_carreta: true,
    costo_carreta: 15,
    pdf_key: null,
    pdf_hash: null,
    pdf_generado_en: null,
    cliente: { nombre: 'Ana', ruc_dni: '123', telefono: '999', email: 'a@b.com' },
    detalle: [
      {
        id_producto: 11,
        cantidad: 2,
        precio_unitario: 10,
        color_notas: null,
        producto: { codigo: 'ROS-01', descripcion: 'Rosa roja' },
      },
    ],
    ...overrides,
  };
}

function makeExport(cot: CotState) {
  const state = { cot };
  const cotizacionesService = {
    obtenerPorId: vi.fn(() => Promise.resolve(state.cot)),
  };
  const storage = {
    read: vi.fn(() => Promise.resolve<Buffer | null>(null)),
    save: vi.fn(),
  };
  const queue = {
    add: vi.fn(() => Promise.resolve({})),
    getJob: vi.fn(() => Promise.resolve(null)),
  };
  const service = new PdfExportService(
    queue as any,
    storage as any,
    cotizacionesService as any,
  );
  return { service, queue, storage, cotizacionesService, state };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('PdfExportService.exportar', () => {
  it('sirve el PDF cacheado cuando el hash no cambió (sin encolar)', async () => {
    const cot = makeCot();
    const hash = computePdfHash(cot);
    cot.pdf_key = `cotizaciones/1-${hash}.pdf`;
    cot.pdf_hash = hash;

    const { service, queue, storage } = makeExport(cot);
    storage.read.mockResolvedValue(Buffer.from('%PDF-1.4'));

    const result = await service.exportar(1);

    expect(result).toMatchObject({ type: 'buffer', cached: true });
    expect(queue.add).not.toHaveBeenCalled();
    expect(storage.read).toHaveBeenCalledWith(cot.pdf_key);
  });

  it('si el PDF cacheado no se puede leer, re-encola el trabajo', async () => {
    const cot = makeCot();
    const hash = computePdfHash(cot);
    cot.pdf_key = `cotizaciones/1-${hash}.pdf`;
    cot.pdf_hash = hash;

    const { service, queue, storage, state } = makeExport(cot);
    storage.read.mockResolvedValue(null);
    queue.add.mockImplementation(async () => {
      state.cot = { ...cot, pdf_key: `cotizaciones/1-${hash}.pdf`, pdf_hash: hash };
      return {};
    });
    queue.getJob.mockResolvedValue({ getState: async () => 'completed' } as any);
    storage.read.mockResolvedValueOnce(null).mockResolvedValue(Buffer.from('%PDF-1.4'));

    const result = await service.exportar(1);

    expect(queue.add).toHaveBeenCalledWith(
      'generate-pdf',
      { id_cotizacion: 1 },
      expect.objectContaining({ jobId: pdfJobId(1, hash) }),
    );
    expect(result).toMatchObject({ type: 'buffer', cached: false });
  });

  it('encola y sirve el binario cuando el job termina dentro del timeout', async () => {
    const cot = makeCot();
    const hash = computePdfHash(cot);

    const { service, queue, storage, state } = makeExport(cot);
    queue.add.mockImplementation(async () => {
      state.cot = { ...cot, pdf_key: `cotizaciones/1-${hash}.pdf`, pdf_hash: hash };
      return {};
    });
    queue.getJob.mockResolvedValue({ getState: async () => 'completed' } as any);
    storage.read.mockResolvedValue(Buffer.from('%PDF-1.4'));

    const result = await service.exportar(1);

    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ type: 'buffer', buffer: Buffer.from('%PDF-1.4'), filename: 'COT-001.pdf', cached: false });
  });

  it('responde processing cuando el job no termina en el timeout', async () => {
    vi.useFakeTimers();
    const cot = makeCot();
    const hash = computePdfHash(cot);
    const { service, queue } = makeExport(cot);
    queue.getJob.mockResolvedValue({ getState: async () => 'active' } as any);

    const promise = service.exportar(1);
    await vi.advanceTimersByTimeAsync(PDF_WAIT_TIMEOUT_MS + 1000);
    const result = await promise;

    expect(result).toEqual({ type: 'processing', jobId: pdfJobId(1, hash) });
  });

  it('lanza error cuando el job falla definitivamente', async () => {
    const cot = makeCot();
    const { service, queue } = makeExport(cot);
    queue.getJob.mockResolvedValue({
      getState: async () => 'failed',
      failedReason: 'Chromium explotó',
    } as any);

    await expect(service.exportar(1)).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});

describe('PdfExportService.status', () => {
  it('reporta listo si el hash almacenado coincide', async () => {
    const cot = makeCot();
    const hash = computePdfHash(cot);
    cot.pdf_key = `cotizaciones/1-${hash}.pdf`;
    cot.pdf_hash = hash;
    cot.pdf_generado_en = new Date();

    const { service } = makeExport(cot);
    await expect(service.status(1)).resolves.toEqual({
      estado: 'listo',
      pdf_generado_en: cot.pdf_generado_en,
    });
  });

  it('reporta generando si hay un job activo para el hash actual', async () => {
    const cot = makeCot();
    const { service, queue } = makeExport(cot);
    queue.getJob.mockResolvedValue({ id: pdfJobId(1, computePdfHash(cot)), getState: async () => 'active' } as any);

    await expect(service.status(1)).resolves.toMatchObject({ estado: 'generando' });
  });

  it('reporta pendiente si no hay PDF ni job', async () => {
    const { service } = makeExport(makeCot());
    await expect(service.status(1)).resolves.toEqual({ estado: 'pendiente' });
  });
});
