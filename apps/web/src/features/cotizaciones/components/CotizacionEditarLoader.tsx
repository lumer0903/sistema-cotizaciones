'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { Loader2, ArrowLeft, TriangleAlert } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui';
import { useCrearCotizacionStore } from '@/features/cotizaciones/store/useCrearCotizacionStore';
import {
  getCotizacionDetalle,
  CotizacionDetalle,
} from '@/features/cotizaciones/api/cotizacionApi';
import { ProductoCarrito } from '@/features/cotizaciones/types/cotizacion';
import { CotizacionFormulario } from '@/features/cotizaciones/components/CotizacionFormulario';

function inferirTipoDoc(doc: string): 'DNI' | 'CE' | 'RUC' {
  const d = (doc || '').trim();
  if (/^\d{8}$/.test(d)) return 'DNI';
  if (/^\d{11}$/.test(d)) return 'RUC';
  return 'CE';
}

function hidratarDesdeServidor(cot: CotizacionDetalle, id: number) {
  const obs = String(cot.observaciones || '');
  const m = /Vencimiento:\s*([^|]+?)\s*\|\s*Pago:\s*(.+)$/.exec(obs);
  const fechaVencimiento = m && m[1].trim() !== '-' ? m[1].trim() : '';
  const tipoPago = m && m[2].trim() !== '-' ? m[2].trim() : '';

  const items: ProductoCarrito[] = (cot.detalle || []).map((l, idx) => {
    const precio = Number(l.precio_unitario ?? 0);
    const cantidad = Number(l.cantidad ?? 0);
    return {
      id: `cart-servidor-${l.id_detalle ?? idx}`,
      id_producto: Number(l.id_producto ?? l.producto?.id_producto ?? 0) || undefined,
      codigo: String(l.producto?.codigo ?? ''),
      descripcion: String(l.producto?.descripcion ?? ''),
      precioUnitario: precio,
      cantidad,
      total: Number(l.subtotal ?? precio * cantidad),
      tipo_venta: String(l.tipo_venta || 'MAYOR'),
      observacion: l.color_notas ?? undefined,
      es_sugerido_ia: Boolean(l.es_sugerido_ia),
      stock: Number(l.producto?.stock ?? 0),
    };
  });

  const cli = cot.cliente || {};
  const idCliente = Number(cot.id_cliente ?? cli.id_cliente ?? 0) || null;
  const tipoPrecio =
    String(cot.tipo_precio || '').toLowerCase() === 'tienda' ? 'TIENDA' : 'DISTRIBUIDOR';

  const store = useCrearCotizacionStore.getState();
  store.reset();
  store.setEditandoId(id);
  store.hydrateFromCrear({
    numeroCotizacion: String(cot.numero ?? ''),
    cliente: {
      id_cliente: idCliente,
      nombre: String(cli.nombre ?? ''),
      telefono: String(cli.telefono ?? '').replace(/\D/g, '').slice(0, 9),
      email: String(cli.email ?? ''),
      tipoDocumento: inferirTipoDoc(String(cli.ruc_dni ?? '')),
      ruc_dni: String(cli.ruc_dni ?? ''),
      clienteEditado: false,
    },
    fechaVencimiento,
    tipoPago,
    tipoPrecioCliente: tipoPrecio,
    items,
    incluyeCarreta: Boolean(cot.incluye_carreta),
  });
  store.setCotizacionGuardada(id, String(cot.numero ?? ''));
}

type EstadoCarga = 'cargando' | 'listo' | 'error' | 'no-borrador';

export function CotizacionEditarLoader() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname() || '';
  const base = pathname.startsWith('/vendedor') ? '/vendedor/cotizaciones' : '/admin/cotizaciones';
  const id = Number(params.id);
  const [estado, setEstado] = useState<EstadoCarga>('cargando');
  const idInvalido = !Number.isFinite(id) || id <= 0;
  const [prevIdInvalido, setPrevIdInvalido] = useState<boolean | null>(null);

  if (prevIdInvalido !== idInvalido) {
    setPrevIdInvalido(idInvalido);
    if (idInvalido) setEstado('error');
  }

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) return;
    let cancelado = false;
    (async () => {
      try {
        const cot = await getCotizacionDetalle(id);
        if (cancelado) return;
        if (String(cot.estado ?? '').toLowerCase() !== 'borrador') {
          setEstado('no-borrador');
          return;
        }
        hidratarDesdeServidor(cot, id);
        setEstado('listo');
      } catch (e) {
        console.error('[editar] No se pudo cargar la cotización:', e);
        if (!cancelado) setEstado('error');
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [id]);

  useEffect(() => {
    if (estado === 'error') showToast.error('No se pudo cargar la cotización');
  }, [estado]);

  if (estado === 'cargando') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-zinc-500">
        <Loader2 className="size-6 animate-spin text-brand-primary" />
        <span className="text-xs font-medium">Cargando cotización…</span>
      </div>
    );
  }

  if (estado === 'listo') {
    return <CotizacionFormulario modo="editar" />;
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <TriangleAlert className="size-8 text-brand-primary" />
      <p className="text-sm font-bold text-zinc-700">
        {estado === 'no-borrador'
          ? 'Solo se pueden editar cotizaciones en estado BORRADOR.'
          : 'No se pudo cargar la cotización solicitada.'}
      </p>
      <Button variant="secondary" onClick={() => router.replace(base)}>
        <ArrowLeft className="size-4" />
        Volver al listado
      </Button>
    </div>
  );
}
