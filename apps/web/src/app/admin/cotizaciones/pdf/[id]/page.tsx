'use client';

import { useParams } from 'next/navigation';
import { PdfViewerPage } from '@/features/cotizaciones/components/PdfViewerPage';

export default function AdminCotizacionPdfPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  return (
    <PdfViewerPage
      cotizacionId={id}
      filename={`COT-${id}`}
      backHref="/admin/cotizaciones"
    />
  );
}
