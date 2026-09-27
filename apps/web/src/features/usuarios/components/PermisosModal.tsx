'use client';

import { useEffect, useState } from 'react';
import { Modal, Select, Button, Badge } from '@/components/ui';
import { showToast } from '@/lib/toast';
import {
  getUsuarioPermisos,
  setUsuarioPermisos,
  UsuarioLista,
} from '../api/usuariosApi';
import {
  PermisoModulo,
  NivelPermiso,
} from '@goldcontinent/shared/constants/enums';
import {
  permisosEfectivos,
  overridesDiferentes,
  tieneOverrides,
  MapaPermisos,
  OverridesPermisos,
} from '@goldcontinent/shared/auth';

const MODULO_LABELS: Record<PermisoModulo, string> = {
  dashboard: 'Dashboard',
  productos: 'Productos',
  importacion: 'Importación',
  consulta_precios: 'Consulta de precios',
  cotizaciones: 'Cotizaciones',
  recomendaciones: 'Recomendaciones',
  pdf: 'PDF',
  usuarios: 'Usuarios',
  cobranza: 'Cobranza',
  ventas: 'Ventas',
  reportes: 'Reportes',
  configuracion: 'Configuración',
};

const NIVEL_OPTIONS = [
  { label: 'Sin acceso', value: NivelPermiso.sin_acceso },
  { label: 'Lectura', value: NivelPermiso.lectura },
  { label: 'Edición', value: NivelPermiso.edicion },
];

const MODULOS = Object.values(PermisoModulo);

interface PermisosModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  usuario: UsuarioLista | null;
}

export function PermisosModal({ open, onClose, onSuccess, usuario }: PermisosModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [overrides, setOverrides] = useState<OverridesPermisos>({});
  const [efectivos, setEfectivos] = useState<MapaPermisos | null>(null);

  useEffect(() => {
    if (!open || !usuario) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const stored = await getUsuarioPermisos(usuario.id_usuario);
        if (cancelled) return;
        setOverrides(stored);
        setEfectivos(permisosEfectivos(usuario.rol, stored));
      } catch (error) {
        if (!cancelled) {
          showToast.error(
            error instanceof Error ? error.message : 'No se pudieron cargar los permisos',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, usuario]);

  if (!usuario) return null;

  const personalizado = tieneOverrides(overrides);

  const onChangeNivel = (modulo: PermisoModulo, nivel: NivelPermiso) => {
    setEfectivos((prev) => (prev ? { ...prev, [modulo]: nivel } : prev));
  };

  const useRoleDefaults = () => {
    setEfectivos(permisosEfectivos(usuario.rol, null));
    setOverrides({});
  };

  const onSave = async () => {
    if (!efectivos) return;
    try {
      setSaving(true);
      const aGuardar = overridesDiferentes(usuario.rol, efectivos);
      await setUsuarioPermisos(usuario.id_usuario, aGuardar);
      setOverrides(aGuardar);
      showToast.success('Permisos actualizados correctamente');
      onSuccess?.();
      onClose();
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'No se pudieron guardar los permisos');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Permisos — ${usuario.nombre}`}
      headerExtra={
        personalizado ? (
          <Badge variant="warning" size="sm">
            Personalizado
          </Badge>
        ) : (
          <Badge variant="secondary" size="sm">
            Por rol
          </Badge>
        )
      }
      maxWidth="lg"
    >
      {loading || !efectivos ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 animate-pulse bg-gray-100 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-brand-subtitle">
              Rol actual: <strong className="capitalize">{usuario.rol}</strong>. Los cambios
              personalizados sobrescriben los permisos por rol.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={useRoleDefaults}>
              Usar permisos del rol
            </Button>
          </div>

          <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100">
            {MODULOS.map((modulo) => (
              <div
                key={modulo}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 hover:bg-brand-soft/50"
              >
                <span className="text-sm font-medium text-gray-800">
                  {MODULO_LABELS[modulo]}
                </span>
                <Select
                  variant="modal"
                  sizeVariant="sm"
                  className="w-full sm:w-40"
                  options={NIVEL_OPTIONS}
                  value={efectivos[modulo]}
                  onChange={(e) => onChangeNivel(modulo, e.target.value as NivelPermiso)}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-2 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" variant="primary" loading={saving} onClick={onSave}>
              Guardar permisos
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
