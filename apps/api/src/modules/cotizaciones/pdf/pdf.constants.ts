export const PDF_QUEUE = 'cotizacion-pdfs';
export const PDF_JOB_NAME = 'generate-pdf';
export const PDF_WAIT_TIMEOUT_MS = 15_000;
export const PDF_POLL_INTERVAL_MS = 300;
export const PDF_BUCKET = 'cotizacion-pdfs';

export function pdfJobId(idCotizacion: number, hash: string): string {
  return `cotizo-pdf:${idCotizacion}:${hash}`;
}

/** Quién ejecuta el worker BullMQ (PdfProcessor + Chromium): 
 *  - `producer`: el proceso API sólo encola (worker en otro proceso).
 *  - `consumer`: proceso dedicado que sólo consume la cola.
 *  - `both` (default): un solo proceso encola y procesa (dev / despliegue pequeño).
 */
export type PdfRole = 'producer' | 'consumer' | 'both';

export function getPdfRole(): PdfRole {
  const bruto = String(process.env.PDF_ROLE ?? 'both').toLowerCase().trim();
  if (bruto === 'producer' || bruto === 'consumer' || bruto === 'both') return bruto;
  console.warn(`[pdf] PDF_ROLE="${process.env.PDF_ROLE}" no es válido (producer|consumer|both); usando "both"`);
  return 'both';
}
