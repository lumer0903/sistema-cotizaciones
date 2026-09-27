export const PDF_QUEUE = 'cotizacion-pdfs';
export const PDF_JOB_NAME = 'generate-pdf';
export const PDF_WAIT_TIMEOUT_MS = 15_000;
export const PDF_POLL_INTERVAL_MS = 300;
export const PDF_BUCKET = 'cotizacion-pdfs';

export function pdfJobId(idCotizacion: number, hash: string): string {
  return `cotizo-pdf:${idCotizacion}:${hash}`;
}
