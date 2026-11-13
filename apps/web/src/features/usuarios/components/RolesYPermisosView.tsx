'use client';
import { Checkbox } from '@/components/ui/Checkbox';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Shield, Users, Lock } from 'lucide-react';
import { showToast } from '@/lib/toast';
import {
  GRUPOS_MODULOS,
  GRUPO_LABELS,
  MODULO_LABELS,
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

  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setNombre('');
      setCodigo('');
      setCodigoTocado(false);
    }
  }

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
          placeholder="Ej. Supervisor de Ventas"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <Input
          label="Código"
          placeholder="supervisor_ventas"
          value={codigoFinal}
          onChange={(e) => {
            setCodigoTocado(true);
            setCodigo(e.target.value);
          }}
        />
        <p className="text-xs text-brand-options -mt-2">
          Se usa en JWT y permisos. Minúsculas, números y guion bajo.
        </p>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-2 border-t border-border-default">
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
    const run = async () => {
      await fetchRoles();
    };
    void run();
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

  /** Completa el mapa con 'sin_acceso' en los módulos sin nivel asignado,
   *  para que el PUT sustituya la fila completa en la base de datos. */
  const completar = useCallback(
    (mapa: Partial<Record<PermisoModulo, NivelPermiso>>) => {
      const completo: Partial<Record<PermisoModulo, NivelPermiso>> = { ...mapa };
      for (const m of Object.values(PermisoModulo)) {
        if (!completo[m]) completo[m] = 'sin_acceso';
      }
      return completo;
    },
    [],
  );

  /** Escribe el mapa de permisos del rol en el backend (PUT /roles/:id/permisos). */
  const persistir = useCallback(
    async (rolId: number, mapa: Partial<Record<PermisoModulo, NivelPermiso>>) => {
      await setRolPermisos(rolId, completar(mapa));
    },
    [completar],
  );

  // Auto-guardado: al alterar cualquier checkbox se agenda un PUT (debounce).
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendienteRef = useRef<{ rolId: number; mapa: Partial<Record<PermisoModulo, NivelPermiso>> } | null>(null);

  const cancelarTimer = useCallback(() => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }
  }, []);

  /** Vuelca inmediatamente cualquier guardado pendiente (p.ej. al cambiar de rol
   *  o al pulsar "Guardar Cambios") para no perder lo editado. */
  const flushPendiente = useCallback(() => {
    const pendiente = pendienteRef.current;
    cancelarTimer();
    if (!pendiente) return;
    pendienteRef.current = null;
    persistir(pendiente.rolId, pendiente.mapa)
      .then(() => showToast.success('Permisos guardados'))
      .catch((error) => {
        showToast.error(
          error instanceof Error ? error.message : 'No se pudieron guardar los permisos',
        );
      });
  }, [persistir, cancelarTimer]);

  useEffect(() => flushPendiente, [flushPendiente]);

  const setNivel = (modulo: PermisoModulo, nivel: NivelPermiso) => {
    if (bloqueado || !selected) return;
    const siguiente: Partial<Record<PermisoModulo, NivelPermiso>> = { ...permisos, [modulo]: nivel };
    const rolId = selected.id_rol;
    setPermisos(siguiente);

    if (pendienteRef.current && pendienteRef.current.rolId !== rolId) {
      flushPendiente(); // hay cambios sin guardar de OTRO rol → volcarlos ya
    } else {
      cancelarTimer(); // mismo rol: el mapa pendiente se reemplaza por el nuevo
    }
    pendienteRef.current = { rolId, mapa: siguiente };

    // Debounce: agrupa los clics rápidos en una sola petición
    autoSaveTimer.current = setTimeout(() => {
      autoSaveTimer.current = null;
      flushPendiente();
    }, 900);
  };

  const guardar = async () => {
    if (!selected || bloqueado) return;
    if (pendienteRef.current && pendienteRef.current.rolId !== selected.id_rol) {
      flushPendiente();
    } else {
      cancelarTimer();
      pendienteRef.current = null;
    }
    try {
      setSaving(true);
      await persistir(selected.id_rol, permisos);
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
        <div className="bg-surface rounded-2xl border border-border-default overflow-hidden">
          <div className="p-4 border-b border-border-default flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-brand-subtitle">Roles</h2>
              <p className="text-xs text-brand-options">{roles.length} definidos</p>
            </div>
            <Button type="button" variant="primary" size="sm" onClick={() => setNuevoOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Agregar Rol
            </Button>
          </div>
          <ul className="max-h-[480px] overflow-y-auto divide-y divide-zinc-100">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="p-4">
                  <div className="h-5 bg-zinc-100 rounded animate-pulse" />
                </li>
              ))
            ) : roles.length === 0 ? (
              <li className="p-6 text-center text-sm text-brand-options">No hay roles</li>
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
                          ? 'bg-accent-soft border-l-4 border-accent-primary'
                          : 'border-l-4 border-transparent hover:bg-zinc-50'
                      }`}
                    >
                      <span
                        className={`mt-0.5 p-1.5 rounded-lg ${
                          active ? 'bg-accent-primary text-on-accent' : 'bg-zinc-100 text-brand-options'
                        }`}
                      >
                        <Shield className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="font-medium text-brand-subtitle truncate">{rol.nombre}</span>
                          {rol.es_sistema && (
                            <span className="text-xs font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                              Sistema
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-2 text-xs text-brand-options mt-0.5">
                          <Users className="h-3 w-3" />
                          {rol.total_usuarios ?? 0} usuarios
                          <span className="text-zinc-300">·</span>
                          <code className="text-xs">{rol.codigo}</code>
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
        <div className="bg-surface rounded-2xl border border-border-default">
          {/* CABECERA ÚNICA: título + selector de grupo + guardar
              (antes eran dos barras con border-b apiladas) */}
          <div className="p-4 border-b border-border-default flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h2 className="font-semibold text-brand-subtitle flex items-center gap-2 flex-wrap">
                Matriz de permisos
                {selected && (
                  <>
                    <span className="text-zinc-300">·</span>
                    <span className="text-accent-ink">{selected.nombre}</span>
                  </>
                )}
                {bloqueado && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold uppercase px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">
                    <Lock className="h-3 w-3" />
                    Bloqueado
                  </span>
                )}
              </h2>
              {bloqueado && (
                <p className="text-sm text-brand-options mt-1">
                  El rol Administrador mantiene Edición en todos los módulos por seguridad.
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Selector de grupo segmentado */}
              <div
                className="inline-flex rounded-lg border border-border-default bg-zinc-50 p-0.5"
                role="group"
                aria-label="Grupos de módulos"
              >
                {(Object.keys(GRUPOS_MODULOS) as Array<keyof typeof GRUPOS_MODULOS>).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGrupo(g)}
                    aria-pressed={grupo === g}
                    className={`px-3.5 py-1.5 text-xs rounded-md transition-colors whitespace-nowrap ${
                      grupo === g
                        ? 'bg-surface text-accent-ink font-semibold shadow-sm'
                        : 'text-brand-options font-medium hover:text-zinc-700'
                    }`}
                  >
                    {GRUPO_LABELS[g]}
                  </button>
                ))}
              </div>
              {!bloqueado && (
                <Button type="button" variant="primary" loading={saving} onClick={guardar} disabled={!selected || loadingPermisos}>
                  Guardar Cambios
                </Button>
              )}
            </div>
          </div>

          <div className="p-4">
            {!selected || loadingPermisos ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-12 bg-zinc-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              /* Matriz como tabla: una sola cabecera con los niveles
                 (antes cada fila repetía las 3 etiquetas como píldoras) */
              <Table scrollLabel="Matriz de permisos">
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col" className="text-left">
                        Módulo
                      </TableHead>
                      {NIVELES.map((nivel) => (
                        <TableHead key={nivel.value} scope="col" className="text-center">
                          {nivel.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modulos.map((modulo) => {
                      const nivelActual = permisos[modulo] ?? 'sin_acceso';
                      return (
                        <TableRow key={modulo}>
                          <TableCell scope="row" className="font-normal text-[#414141] whitespace-nowrap">
                            {MODULO_LABELS[modulo]}
                          </TableCell>
                          {NIVELES.map((nivel) => {
                            const checked = nivelActual === nivel.value;
                            return (
                              <TableCell key={nivel.value} className="px-4 py-1 text-center">
                                {/* Celda completa como área de clic (hit area ≥ 44px) */}
                                <label className="inline-flex min-h-11 min-w-11 items-center justify-center cursor-pointer align-middle">
                                  <Checkbox
                                    
                                    checked={checked}
                                    disabled={bloqueado}
                                    onChange={() => setNivel(modulo, nivel.value)}
                                    aria-label={`${nivel.label} — ${MODULO_LABELS[modulo]}`}
                                    
                                  />
                                </label>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
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
