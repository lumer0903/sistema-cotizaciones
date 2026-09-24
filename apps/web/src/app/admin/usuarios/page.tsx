'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, MoreHorizontal, Pencil, Power, PowerOff, Users, ShieldCheck } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { useAuth } from '@/lib/authProvider';
import {
  getUsuarios,
  setUsuarioActivo,
  UsuarioLista,
} from '@/features/usuarios/api/usuariosApi';
import { getRoles, RolLista } from '@/features/usuarios/api/rolesApi';
import { UsuarioModal, RolesYPermisosView } from '@/features/usuarios/components';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FilterCard } from '@/components/ui/FilterCard';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import type { BadgeVariant } from '@/components/ui/Badge';

const ROLE_BADGE: Record<string, BadgeVariant> = {
  admin: 'brand',
  gerente: 'secondary',
  vendedor: 'success',
};


type TabId = 'usuarios' | 'roles';

export default function UsuariosPage() {
  const { usuario: me } = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>('usuarios');
  const [roles, setRoles] = useState<RolLista[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioLista[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(8);

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioLista | null>(null);
  const [statusTarget, setStatusTarget] = useState<UsuarioLista | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const roleLabel = useCallback(
    (codigo: string) => roles.find((r) => r.codigo === codigo)?.nombre ?? codigo,
    [roles],
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getUsuarios({
        page: currentPage,
        limit,
        search: search.trim() || undefined,
      });
      setUsuarios(res.data ?? []);
      setTotalItems(res.total ?? 0);
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'No se pudieron cargar los usuarios',
      );
      setUsuarios([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, search]);

  useEffect(() => {
    getRoles()
      .then(setRoles)
      .catch(() => setRoles([]));
  }, []);

  useEffect(() => {
    if (activeTab !== 'usuarios') return;
    fetchData();
  }, [activeTab, fetchData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, limit]);

  const totalPages = Math.ceil(totalItems / limit) || 1;

  const openCreate = () => {
    setEditingUser(null);
    setUserModalOpen(true);
  };

  const openEdit = (user: UsuarioLista) => {
    setEditingUser(user);
    setUserModalOpen(true);
  };

  const openStatusConfirm = (user: UsuarioLista) => {
    if (me?.id_usuario === user.id_usuario && user.activo) {
      showToast.warning('No puedes desactivar tu propia cuenta');
      return;
    }
    setStatusTarget(user);
  };

  const confirmStatus = async () => {
    if (!statusTarget) return;
    try {
      setStatusLoading(true);
      const nextActivo = !statusTarget.activo;
      const updated = await setUsuarioActivo(statusTarget.id_usuario, nextActivo);
      if (updated) {
        setUsuarios((prev) =>
          prev.map((u) => (u.id_usuario === updated.id_usuario ? { ...u, ...updated } : u)),
        );
        showToast.success(
          updated.activo ? 'Usuario activado correctamente' : 'Usuario desactivado correctamente',
        );
      }
      setStatusTarget(null);
      void fetchData();
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'No se pudo actualizar el estado',
      );
    } finally {
      setStatusLoading(false);
    }
  };



  const tabs: { id: TabId; label: string; icon: typeof Users }[] = [
    { id: 'usuarios', label: 'Usuarios', icon: Users },
    { id: 'roles', label: 'Roles y Permisos', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-stone-50 max-w-7xl mx-auto px-2 sm:px-3 lg:px-4 py-3 font-['DM_Sans']">
      {activeTab === 'usuarios' && (
        <FilterCard className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-start gap-4">
            <div className="w-full sm:w-96 flex-1">
              <Input
                label="BUSCAR"
                type="text"
                icon={<Search className="w-4 h-4" />}
                placeholder="Buscar por nombre o correo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <Button type="button" variant="primary" onClick={openCreate} className="mb-1">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Usuario
              </Button>
            </div>
          </div>
        </FilterCard>
      )}

      <div className="border-b border-gray-200 mb-4">
        <nav className="flex -mb-px" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id
                ? 'border-[#F8B602] text-brand-primary font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium'
                }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'usuarios' ? (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={4}>
                          <div className="h-6 animate-pulse bg-gray-100 rounded" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : usuarios.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <div className="py-10 text-center text-gray-500">
                          No se encontraron usuarios
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    usuarios.map((user) => {
                      const isSelf = me?.id_usuario === user.id_usuario;
                      const statusDisabled = isSelf && user.activo;
                      return (
                        <TableRow key={user.id_usuario}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar src={user.avatar_url} nombre={user.nombre} size="md" />
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate">{user.nombre}</p>
                                <p className="text-sm text-gray-500 truncate">{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={ROLE_BADGE[user.rol] ?? 'neutral'} size="sm">
                              {roleLabel(user.rol)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.activo ? 'success' : 'danger'} size="sm">
                              {user.activo ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openEdit(user)}
                                title="Editar usuario"
                                aria-label="Editar usuario"
                                className="p-2 text-gray-500 hover:text-brand-primary hover:bg-brand-soft rounded-lg transition-colors"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                disabled={statusDisabled}
                                onClick={() => openStatusConfirm(user)}
                                title={
                                  statusDisabled
                                    ? 'No puedes desactivar tu propia cuenta'
                                    : user.activo
                                      ? 'Desactivar usuario'
                                      : 'Activar usuario'
                                }
                                aria-label={user.activo ? 'Desactivar usuario' : 'Activar usuario'}
                                className={`p-2 rounded-lg transition-colors ${statusDisabled
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : user.activo
                                    ? 'text-danger hover:bg-estado-rechazado-soft'
                                    : 'text-estado-aprobado-text hover:bg-estado-aprobado-soft'
                                  }`}
                              >
                                {user.activo ? (
                                  <PowerOff className="h-4 w-4" />
                                ) : (
                                  <Power className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              limit={limit}
              onPageChange={setCurrentPage}
              onLimitChange={setLimit}
              loading={loading}
              itemLabel="usuarios"
            />
          </div>
        </div>
      ) : (
        <div className="pt-4">
          <RolesYPermisosView />
        </div>
      )}



      <UsuarioModal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        onSuccess={() => void fetchData()}
        usuario={editingUser}
      />

      <ConfirmModal
        open={Boolean(statusTarget)}
        onClose={() => {
          if (!statusLoading) setStatusTarget(null);
        }}
        onConfirm={confirmStatus}
        loading={statusLoading}
        title={statusTarget?.activo ? 'Desactivar usuario' : 'Activar usuario'}
        confirmLabel={statusTarget?.activo ? 'Desactivar' : 'Activar'}
        message={
          !statusTarget
            ? ''
            : statusTarget.activo
              ? `¿Desactivar a "${statusTarget.nombre}"? No podrá iniciar sesión hasta que se reactive.`
              : `¿Activar a "${statusTarget.nombre}"? Podrá volver a iniciar sesión.`
        }
      />
    </div>
  );
}
