'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, Package, FileText, CreditCard, CalendarClock, Loader2 } from 'lucide-react';
import { inventarioApi, AlertaStockResponse } from '@/features/inventario/api/inventario.api';
import { showToast } from '@/lib/toast';
import { formatCode, formatText } from '@/lib/formatters';

interface NotificacionesDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type TabType = 'todas' | 'inventario' | 'cobranzas';
type NotificationType = 'STOCK_BAJO' | 'COTIZACION_PENDIENTE' | 'COBRANZA_PENDIENTE' | 'PROXIMO_PAGO_PARCIAL';

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  isRead: boolean;
  createdAt: string;
  data: any;
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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(open);
  const [prevOpen, setPrevOpen] = useState(open);

  if (prevOpen !== open) {
    setPrevOpen(open);
    setLoading(open);
  }

  const fetchNotifications = useCallback(() => {
    return inventarioApi.obtenerAlertasStock().then((res) => {
      const alertas = res.data || [];

      const mapped: NotificationItem[] = alertas.map(a => ({
        id: `stock_${a.id_alerta}`,
        type: 'STOCK_BAJO',
        title: 'Stock crítico',
        isRead: a.estado === 'resuelta',
        createdAt: a.created_at,
        data: a,
      }));

      // Aquí se sumarían alertas de cotizaciones y cobranzas cuando existan en la API

      return mapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });
  }, []);

  const onNotificationsLoaded = useCallback((mapped: NotificationItem[]) => {
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

  const handleCardClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      if (item.type === 'STOCK_BAJO') {
        try {
          await inventarioApi.reconocerAlerta((item.data as AlertaStockResponse).id_alerta);
          if (onSuccess) onSuccess();
          setLoading(true);
          fetchNotifications().then(onNotificationsLoaded, onNotificationsError);
        } catch {
          showToast.error('Error al marcar como leída');
        }
      }
    }
    
    // Navegación
    if (item.type === 'STOCK_BAJO') {
      router.push('/admin/inventario');
      onClose();
    }
    // Añadir navegación para otras categorías
  };

  const filtered = notifications.filter(n => {
    if (activeTab === 'inventario') return n.type === 'STOCK_BAJO';
    if (activeTab === 'cobranzas') return n.type === 'COBRANZA_PENDIENTE' || n.type === 'PROXIMO_PAGO_PARCIAL';
    return true;
  });

  const renderIcon = (type: NotificationType) => {
    switch(type) {
      case 'STOCK_BAJO': return <Package className="w-5 h-5" />;
      case 'COTIZACION_PENDIENTE': return <FileText className="w-5 h-5" />;
      case 'COBRANZA_PENDIENTE': return <CreditCard className="w-5 h-5" />;
      case 'PROXIMO_PAGO_PARCIAL': return <CalendarClock className="w-5 h-5" />;
    }
  };

  const renderBody = (item: NotificationItem) => {
    if (item.type === 'STOCK_BAJO') {
      const data = item.data as AlertaStockResponse;
      return (
        <p className="text-sm">
          El producto <strong>{formatCode(data.producto?.codigo || '')} - {formatText(data.producto?.descripcion || '')}</strong> en 
          el almacén <strong>{formatText(data.almacen?.nombre || '')}</strong> ha caído a 
          <strong> {data.stock_actual} u.</strong> (Mínimo: {data.stock_minimo} u.)
        </p>
      );
    }
    return <p className="text-sm">Notificación de sistema.</p>;
  };

  return (
    <div className={`fixed inset-0 z-[70] transition-opacity duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-transparent" onClick={onClose} />
      
      <div 
        className={`absolute right-4 sm:right-8 top-16 w-[90vw] sm:w-[420px] max-h-[calc(100vh-5rem)] bg-white shadow-2xl rounded-2xl border border-gray-100 transition-all duration-200 flex flex-col ${open ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95 origin-top-right'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-2">
          <h2 className="text-xl font-bold text-gray-900">Notificaciones</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-brand-primary hover:bg-brand-soft transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-4 overflow-x-auto scrollbar-hide">
          {(['todas', 'inventario', 'cobranzas'] as TabType[]).map((tab) => {
            const count = tab === 'todas' 
              ? notifications.length 
              : notifications.filter(n => tab === 'inventario' ? n.type === 'STOCK_BAJO' : ['COBRANZA_PENDIENTE', 'PROXIMO_PAGO_PARCIAL'].includes(n.type)).length;
              
            const label = tab.charAt(0).toUpperCase() + tab.slice(1);
            const active = activeTab === tab;
            
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  active ? 'text-brand-primary' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  active ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white rounded-b-2xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <span className="text-sm">Cargando...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <span className="text-sm">No hay notificaciones</span>
            </div>
          ) : (
            filtered.map((item) => {
              const isUnread = !item.isRead;
              return (
                <div
                  key={item.id}
                  onClick={() => handleCardClick(item)}
                  className={`relative p-4 rounded-xl cursor-pointer transition-all border ${
                    isUnread
                      ? 'bg-[#FFFDF9] border-brand-primary/30 shadow-sm hover:bg-brand-soft'
                      : 'bg-white border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-gray-50 text-gray-500 border border-gray-100 shrink-0">
                      {renderIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className={`text-sm font-semibold truncate ${isUnread ? 'text-gray-900' : 'text-gray-600'}`}>
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                          <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap">
                            {getRelativeTime(item.createdAt)}
                          </span>
                          {isUnread && (
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                          )}
                        </div>
                      </div>
                      <div className={`text-xs text-gray-500 leading-snug ${isUnread ? '' : 'opacity-80'}`}>
                        {renderBody(item)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
