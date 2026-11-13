'use client';
import { priceLabels, priceEventLabels } from '../priceLabels';
import { useCallback, useState } from 'react';
import { Modal, Input, Button, Pagination, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { getHistorialPrecios } from '../api/precioApi';
import { usePriceRequest } from '../usePriceRequest';

function formatDateLima(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).replace(',', '').replace('a. m.', 'a. m.').replace('p. m.', 'p. m.');
}

function formatSoles(value: number): string {
  return 'S/ ' + value.toFixed(2);
}

export function HistorialPrecioModal({
  open,
  onClose,
  productoId,
  codigoProducto,
}: { open: boolean; onClose: () => void; productoId: string; codigoProducto: string }) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(24);
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [retry, setRetry] = useState(0);

  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (inicio) params.set('fecha_inicio', inicio);
  if (fin) params.set('fecha_fin', fin);
  const query = params.toString();

  const load = useCallback(
    (signal: AbortSignal) => getHistorialPrecios(productoId, query, signal),
    [productoId, query],
  );
  const state = usePriceRequest(open ? productoId + '/' + query + '/' + retry : null, load);
  const data = state.data;

  return (
    <Modal open={open} onClose={onClose} title={'Historial: ' + codigoProducto} maxWidth="xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <Input label="DESDE (LIMA)" type="date" value={inicio} onChange={e => { setInicio(e.target.value); setPage(1); }} />
        <Input label="HASTA (LIMA)" type="date" value={fin} onChange={e => { setFin(e.target.value); setPage(1); }} />
      </div>
      {state.loading ? (
        <p role="status">Cargando historial…</p>
      ) : state.error ? (
        <div role="alert">
          {state.error}
          <Button onClick={() => setRetry(v => v + 1)}>Reintentar</Button>
        </div>
      ) : !data?.data.length ? (
        <p>No hay cambios registrados en este rango.</p>
      ) : (
        <>
          <Table
            scrollLabel="Historial de precios"
            footer={
              <Pagination
                loading={state.loading}
                currentPage={page}
                totalPages={Math.max(1, Math.ceil((data?.total ?? 0) / limit))}
                totalItems={data?.total ?? 0}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={v => { setLimit(v); setPage(1); }}
                itemLabel="cambios"
              />
            }
          >
            <TableHeader>
              <TableRow>
                {['TIPO DE PRECIO', 'FECHA Y HORA', 'USUARIO / MOTIVO', 'COSTO UNITARIO', 'ANTERIOR', 'NUEVO'].map(x => (
                  <TableHead key={x}>{x}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    {priceLabels[item.campoModificado] ?? item.campoModificado}
                    <div className="text-xs text-muted-foreground">
                      {priceEventLabels[item.evento] ?? item.evento}
                    </div>
                  </TableCell>
                  <TableCell>{formatDateLima(item.fechaCambio)}</TableCell>
                  <TableCell>
                    <div>{item.usuario}</div>
                    <div className="text-xs text-muted-foreground">{item.motivoLimpio || item.motivo}</div>
                  </TableCell>
                  <TableCell>
                    {item.costoUnitario !== null ? formatSoles(item.costoUnitario) : '—'}
                  </TableCell>
                  <TableCell>{formatSoles(item.valorAnterior)}</TableCell>
                  <TableCell>{formatSoles(item.valorNuevo)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </Modal>
  );
}