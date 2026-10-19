'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, Package, FileText, Wallet, Loader2, ExternalLink } from 'lucide-react';
import { notificacionesApi, NotificacionItem, TipoNotificacion } from '@/features/notificaciones/api/notificaciones.api';
import { showToast } from '@/lib/toast';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';
import { formatCode, formatText } from '@/lib/formatters';

interface NotificacionesDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type TabType = 'todas' | 'inventario' | 'cotizaciones' | 'cobranzas';

/** Tabs visibles: solo los que tienen tipos activos presentes en la lista. */
const TAB_DEFS: Array<{ id: TabType; label: string; tipos: TipoNotificacion[] }> = [
  { id: 'todas', label: 'Todas', tipos: ['STOCK_BAJO', 'COTIZACION_VENCIDA', 'COBRANZA_PENDIENTE'] },
  { id: 'inventario', label: 'Inventario', tipos: ['STOCK_BAJO'] },
  { id: 'cotizaciones', label: 'Cotizaciones', tipos: ['COTIZACION_VENCIDA'] },
  { id: 'cobranzas', label: 'Cobranzas', tipos: ['COBRANZA_PENDIENTE'] },
];

/** Destino de navegación por tipo de notificación. */
function destinoDe(item: NotificacionItem): string {
  switch (item.tipo) {
    case 'STOCK_BAJO':
      return item.data.codigo 
        ? `/inventario?search=${item.data.codigo}`
        : '/inventario';
    case 'COTIZACION_VENCIDA':
      return item.data.id_cotizacion
        ? `/cotizaciones/detalle/${item.data.id_cotizacion}`
        : '/cotizaciones';
    case 'COBRANZA_PENDIENTE':
      return item.data.id_cotizacion
        ? `/cobranza/${item.data.id_cotizacion}`
        : '/cobranza';
  }
}

function getRelativeTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMins < 1) return 'ahora';
  if (diffMins < 60) return `hace ${diffMins}m`;
  if (diffHrs < 24) return `hace ${diffHrs}h`;
  if (diffDays === 1) return 'ayer';
  return `hace ${diffDays}d`;
}

export function NotificacionesDrawer({ open, onClose, onSuccess }: NotificacionesDrawerProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('todas');
  const [notifications, setNotifications] = useState<NotificacionItem[]>([]);
  const [loading, setLoading] = useState(open);
  const [prevOpen, setPrevOpen] = useState(open);

  if (prevOpen !== open) {
    setPrevOpen(open);
    setLoading(open);
  }

  const fetchNotifications = useCallback(() => {
    return notificacionesApi.obtener().then((res) => res.data || []);
  }, []);

  const onNotificationsLoaded = useCallback((mapped: NotificacionItem[]) => {
    setNotifications(mapped);
    setLoading(false);
  }, []);

  const onNotificationsError = useCallback((error: unknown) => {
    console.error('Error fetching notifications:', error);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      fetchNotifications().then(onNotificationsLoaded, onNotificationsError);
    }
  }, [open, fetchNotifications, onNotificationsLoaded, onNotificationsError]);

  // Escape cierra el panel y el scroll del body queda bloqueado mientras está abierto
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    lockBodyScroll();
    window.addEventListener('keydown', onKeyDown);
    return () => {
      unlockBodyScroll();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  const handleCardClick = async (item: NotificacionItem) => {
    // Marca como vista (queda en historial, no se elimina) según el tipo.
    try {
      if (!item.leida && item.tipo === 'STOCK_BAJO' && item.data.id_alerta != null) {
        await notificacionesApi.reconocerAlertaStock(item.data.id_alerta);
      } else if (!item.leida && item.data.id_cotizacion != null &&
                 (item.tipo === 'COTIZACION_VENCIDA' || item.tipo === 'COBRANZA_PENDIENTE')) {
        await notificacionesApi.marcarLeida(item.tipo, item.data.id_cotizacion);
      }
      if (onSuccess) onSuccess();
      setLoading(true);
      fetchNotifications().then(onNotificationsLoaded, onNotificationsError);
    } catch {
      showToast.error('Error al marcar como leída');
    }

    router.push(destinoDe(item));
    onClose();
  };

  const handleMarcarTodos = async () => {
    try {
      setLoading(true);
      await notificacionesApi.marcarTodasComoLeidas();
      if (onSuccess) onSuccess();
      await fetchNotifications().then(onNotificationsLoaded, onNotificationsError);
      showToast.success('Todas marcadas como leídas');
    } catch {
      showToast.error('Error al marcar todas como leídas');
      setLoading(false);
    }
  };

  const filtered = notifications.filter(n => {
    const def = TAB_DEFS.find(t => t.id === activeTab);
    if (!def) return true;
    return def.tipos.includes(n.tipo);
  });

  // Solo muestra tabs cuyo tipo tiene al menos una notificación (además de "Todas").
  const tabsVisibles = TAB_DEFS.filter(tab =>
    tab.id === 'todas' || notifications.some(n => tab.tipos.includes(n.tipo))
  );

  const renderIcon = (tipo: TipoNotificacion) => {
    switch (tipo) {
      case 'STOCK_BAJO': return <Package className="w-4 h-4" />;
      case 'COTIZACION_VENCIDA': return <FileText className="w-4 h-4" />;
      case 'COBRANZA_PENDIENTE': return <Wallet className="w-4 h-4" />;
    }
  };

  const renderDetalle = (item: NotificacionItem): string => {
    if (item.tipo === 'STOCK_BAJO') {
      return `${formatCode(item.data.codigo || '')} · ${item.data.stock_actual} u. (mín. ${item.data.stock_minimo}) · ${formatText(item.data.almacen || '')}`;
    }
    const fecha = item.data.fecha_vencimiento
      ? new Date(item.data.fecha_vencimiento).toLocaleDateString()
      : '—';
    return `${formatCode(item.data.numero || '')} · ${formatText(item.data.cliente || '')} · vence ${fecha}`;
  };

  return (
    <div className={`fixed inset-0 z-[70] transition-opacity duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none invisible'}`}>
      <div className="absolute inset-0 bg-transparent" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Notificaciones"
        className={`absolute right-4 sm:right-8 top-16 w-[90vw] sm:w-[400px] max-h-[calc(100dvh-5rem)] bg-white shadow-2xl rounded-2xl border border-zinc-100 transition-[transform,opacity] duration-200 flex flex-col ${open ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95 origin-top-right'}`}
      >
        {/* Header compacto */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-zinc-900">Notificaciones</h2>
            {notifications.some(n => !n.leida) && (
              <button
                onClick={handleMarcarTodos}
                className="text-xs font-medium text-accent-ink hover:text-accent-ink/80 transition-colors"
              >
                Marcar todas leídas
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar notificaciones"
            className="p-1.5 -m-1.5 min-h-9 min-w-9 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs compactos */}
        <div className="px-3 py-2 border-b border-zinc-100 flex items-center gap-1 overflow-x-auto scrollbar-hide shrink-0">
          {tabsVisibles.map((tab) => {
            const count = tab.id === 'todas'
              ? notifications.filter(n => !n.leida).length
              : notifications.filter(n => tab.tipos.includes(n.tipo) && !n.leida).length;
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={active}
                className={`min-h-8 px-2.5 inline-flex items-center gap-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                  active ? 'text-accent-ink bg-accent-soft' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] leading-none ${
                    active ? 'bg-accent-primary text-on-accent' : 'bg-zinc-100 text-zinc-600'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Lista compacta */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-50 bg-white rounded-b-2xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 text-zinc-500">
              <Loader2 className="w-5 h-5 animate-spin mb-2" />
              <span className="text-xs">Cargando...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-zinc-500">
              <span className="text-xs">No hay notificaciones</span>
            </div>
          ) : (
            filtered.map((item) => {
              const isUnread = !item.leida;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleCardClick(item)}
                  className={`w-full text-left flex items-start gap-2.5 px-4 py-2.5 transition-[background-color] duration-150 group active:scale-[0.96] ${
                    isUnread ? 'bg-accent-soft/30 hover:bg-accent-soft/60' : 'hover:bg-zinc-50'
                  }`}
                >
                  <span className={`mt-0.5 shrink-0 ${isUnread ? 'text-accent-primary' : 'text-zinc-400'}`}>
                    {renderIcon(item.tipo)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-semibold truncate ${isUnread ? 'text-zinc-900' : 'text-zinc-600'}`}>
                        {item.titulo}
                      </span>
                      <span className="text-[10px] font-medium text-zinc-400 whitespace-nowrap shrink-0">
                        {getRelativeTime(item.createdAt)}
                      </span>
                    </span>
                    <span className="block text-[11px] text-zinc-500 leading-snug truncate">
                      {renderDetalle(item)}
                    </span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-400 shrink-0 mt-0.5" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
