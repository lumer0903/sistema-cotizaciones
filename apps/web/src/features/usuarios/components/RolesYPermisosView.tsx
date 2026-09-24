'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Shield, Users, Lock } from 'lucide-react';
import { showToast } from '@/lib/toast';
import {
  GRUPOS_MODULOS,
  GRUPO_LABELS,
  PermisoModulo,
  NivelPermiso,
  esMatrizBloqueada,
} from '@goldcontinent/shared/auth';
import {
  getRoles,
  createRol,
  getRolPermisos,
  setRolPermisos,
  RolLista,
} from '../api/rolesApi';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

const NIVELES: { value: NivelPermiso; label: string }[] = [
  { value: 'sin_acceso', label: 'Sin Acceso' },
  { value: 'lectura', label: 'Solo Lectura' },
  { value: 'edicion', label: 'Edición' },
];

const MODULO_LABELS: Record<PermisoModulo, string> = {
  dashboard: 'Dashboard',
  productos: 'Productos',
  importacion: 'Importación',
  consulta_precios: 'Consulta de Precios',
  cotizaciones: 'Cotizaciones',
  recomendaciones: 'Recomendaciones',
  pdf: 'Generación PDF',
  usuarios: 'Usuarios',
  cobranza: 'Cobranza',
  ventas: 'Ventas',
  reportes: 'Reportes',
  configuracion: 'Configuración',
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

interface NuevoRolModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (rol: RolLista) => void;
}

function NuevoRolModal({ open, onClose, onCreated }: NuevoRolModalProps) {
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [codigoTocado, setCodigoTocado] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setNombre('');
      setCodigo('');
      setCodigoTocado(false);
    }
  }, [open]);

  const codigoFinal = codigoTocado ? codigo : slugify(nombre);

  const submit = async () => {
    const nombreLimpio = nombre.trim();
    const codigoLimpio = codigoFinal.trim();
    if (nombreLimpio.length < 2) {
      showToast.error('El nombre debe tener al menos 2 caracteres');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(codigoLimpio) || codigoLimpio.length < 2) {
      showToast.error('Código inválido (minúsculas, números y guion bajo)');
      return;
    }
    try {
      setLoading(true);
      const rol = await createRol({ nombre: nombreLimpio, codigo: codigoLimpio });
      showToast.success('Rol creado correctamente');
      onCreated(rol);
      onClose();
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'No se pudo crear el rol');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Agregar Rol" maxWidth="sm">
      <div className="space-y-4">
        <Input
          label="Nombre del rol"
          variant="modal"
          placeholder="Ej. Supervisor de Ventas"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <Input
          label="Código"
          variant="modal"
          placeholder="supervisor_ventas"
          value={codigoFinal}
          onChange={(e) => {
            setCodigoTocado(true);
            setCodigo(e.target.value);
          }}
        />
        <p className="text-xs text-gray-500 -mt-2">
          Se usa en JWT y permisos. Minúsculas, números y guion bajo.
        </p>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" loading={loading} onClick={submit}>
            Crear Rol
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function RolesYPermisosView() {
  const [roles, setRoles] = useState<RolLista[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [permisos, setPermisos] = useState<Partial<Record<PermisoModulo, NivelPermiso>>>({});
  const [grupo, setGrupo] = useState<'administrativo' | 'operativo'>('administrativo');
  const [saving, setSaving] = useState(false);
  const [loadingPermisos, setLoadingPermisos] = useState(false);
  const [nuevoOpen, setNuevoOpen] = useState(false);

  const selected = useMemo(
    () => roles.find((r) => r.id_rol === selectedId) ?? null,
    [roles, selectedId],
  );
  const bloqueado = selected ? esMatrizBloqueada(selected.codigo) : false;
  const modulos = GRUPOS_MODULOS[grupo];

  const fetchRoles = useCallback(async (preferId?: number) => {
    try {
      setLoading(true);
      const data = await getRoles();
      setRoles(data);
      setSelectedId((prev) => {
        const target = preferId ?? prev;
        if (target && data.some((r) => r.id_rol === target)) return target;
        return data[0]?.id_rol ?? null;
      });
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'No se pudieron cargar los roles');
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingPermisos(true);
        const data = await getRolPermisos(selectedId);
        if (!cancelled) setPermisos(data);
      } catch (error) {
        if (!cancelled) {
          setPermisos({});
          showToast.error(
            error instanceof Error ? error.message : 'No se pudieron cargar los permisos',
          );
        }
      } finally {
        if (!cancelled) setLoadingPermisos(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const setNivel = (modulo: PermisoModulo, nivel: NivelPermiso) => {
    if (bloqueado) return;
    setPermisos((prev) => ({ ...prev, [modulo]: nivel }));
  };

  const guardar = async () => {
    if (!selected || bloqueado) return;
    const completo: Partial<Record<PermisoModulo, NivelPermiso>> = { ...permisos };
    for (const m of Object.values(PermisoModulo)) {
      if (!completo[m]) completo[m] = 'sin_acceso';
    }
    try {
      setSaving(true);
      await setRolPermisos(selected.id_rol, completo);
      showToast.success('Permisos guardados correctamente');
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'No se pudieron guardar los permisos');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <aside className="lg:col-span-4 xl:col-span-3">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">Roles</h2>
              <p className="text-xs text-gray-500">{roles.length} definidos</p>
            </div>
            <Button type="button" variant="primary" size="sm" onClick={() => setNuevoOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Agregar Rol
            </Button>
          </div>
          <ul className="max-h-[480px] overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="p-4">
                  <div className="h-5 bg-gray-100 rounded animate-pulse" />
                </li>
              ))
            ) : roles.length === 0 ? (
              <li className="p-6 text-center text-sm text-gray-500">No hay roles</li>
            ) : (
              roles.map((rol) => {
                const active = rol.id_rol === selectedId;
                return (
                  <li key={rol.id_rol}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(rol.id_rol)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                        active
                          ? 'bg-brand-soft border-l-4 border-brand-primary'
                          : 'border-l-4 border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <span
                        className={`mt-0.5 p-1.5 rounded-lg ${
                          active ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <Shield className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 truncate">{rol.nombre}</span>
                          {rol.es_sistema && (
                            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                              Sistema
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <Users className="h-3 w-3" />
                          {rol.total_usuarios ?? 0} usuarios
                          <span className="text-gray-300">·</span>
                          <code className="text-[11px]">{rol.codigo}</code>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </aside>

      <section className="lg:col-span-8 xl:col-span-9">
        <div className="bg-white rounded-2xl border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                Matriz de permisos
                {selected && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="text-brand-primary">{selected.nombre}</span>
                  </>
                )}
                {bloqueado && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                    <Lock className="h-3 w-3" />
                    Bloqueado
                  </span>
                )}
              </h2>
              <p className="text-sm text-gray-500">
                {bloqueado
                  ? 'El rol Administrador mantiene Edición en todos los módulos por seguridad.'
                  : 'Selecciona el nivel de acceso por módulo.'}
              </p>
            </div>
            {!bloqueado && (
              <Button type="button" variant="primary" loading={saving} onClick={guardar} disabled={!selected || loadingPermisos}>
                Guardar Cambios
              </Button>
            )}
          </div>

          <div className="border-b border-gray-200">
            <nav className="flex -mb-px" aria-label="Grupos de módulos">
              {(Object.keys(GRUPOS_MODULOS) as Array<keyof typeof GRUPOS_MODULOS>).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrupo(g)}
                  className={`px-6 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                    grupo === g
                      ? 'border-[#F8B602] text-brand-primary font-bold'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium'
                  }`}
                >
                  {GRUPO_LABELS[g]}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4">
            {!selected || loadingPermisos ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {modulos.map((modulo) => {
                  const nivelActual = permisos[modulo] ?? 'sin_acceso';
                  return (
                    <div
                      key={modulo}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3"
                    >
                      <div className="sm:w-56 font-medium text-sm text-gray-800">
                        {MODULO_LABELS[modulo]}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {NIVELES.map((nivel) => {
                          const checked = nivelActual === nivel.value;
                          const disabled = bloqueado;
                          return (
                            <label
                              key={nivel.value}
                              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                                checked
                                  ? 'border-brand-primary bg-brand-primary text-white shadow-sm'
                                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                              } ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={checked}
                                disabled={disabled}
                                onChange={() => setNivel(modulo, nivel.value)}
                              />
                              <span
                                className={`h-3.5 w-3.5 rounded border flex items-center justify-center ${
                                  checked
                                    ? 'bg-white border-white'
                                    : 'bg-white border-gray-300'
                                }`}
                              >
                                {checked && (
                                  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 fill-brand-primary">
                                    <path d="M10 3L4.5 8.5 2 6" stroke="currentColor" strokeWidth="2" fill="none" />
                                  </svg>
                                )}
                              </span>
                              {nivel.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <NuevoRolModal
        open={nuevoOpen}
        onClose={() => setNuevoOpen(false)}
        onCreated={(rol) => {
          void fetchRoles(rol.id_rol);
        }}
      />
    </div>
  );
}
