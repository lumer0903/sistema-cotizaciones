'use client';

import { useEffect, useState } from 'react';
import {
  FileText,
  Loader2
} from 'lucide-react';
import { getCotizacionPdfObjectUrl } from '../api/cotizacionApi';

interface PdfViewerPageProps {
  cotizacionId: string | number;
  filename?: string;
  backHref: string;
}

export function PdfViewerPage({ cotizacionId, filename: _filename, backHref: _backHref }: PdfViewerPageProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cotizacionId == null) return;

    let cancelled = false;
    let url: string | null = null;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        url = await getCotizacionPdfObjectUrl(cotizacionId);
        if (!cancelled) setObjectUrl(url);
        else if (url) URL.revokeObjectURL(url);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'No se pudo cargar el PDF');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      setObjectUrl(null);
    };
  }, [cotizacionId]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] font-['DM_Sans']">
      {/* ÁREA PRINCIPAL DEL VISOR */}
      <div className="flex-1 flex flex-col justify-between gap-4">
        <div className="w-full max-w-5xl mx-auto h-[720px] lg:h-[calc(100vh-140px)] bg-white rounded-xl border border-neutral-200 shadow-md overflow-hidden">
          {loading && (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-neutral-500">
              <Loader2 className="size-10 animate-spin text-amber-500" />
              <p className="text-sm font-semibold">Cargando documento…</p>
            </div>
          )}

          {!loading && error && (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-neutral-500 p-6 text-center">
              <FileText className="size-12 text-neutral-300" />
              <p className="text-sm font-semibold text-neutral-700">{error}</p>
            </div>
          )}

          {!loading && !error && objectUrl && (
            <iframe
              id="pdf-iframe"
              src={`${objectUrl}#toolbar=1&view=FitH`}
              title="Vista del documento PDF"
              className="w-full h-full border-none"
            />
          )}
        </div>
      </div>
    </div>
  );
}
