'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import { showToast } from '@/lib/toast';
import { Select, Button, IconButton, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Input, Badge, FilterCard, FilterGrid, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { Plus, Pencil, Settings, ShieldCheck, Search, X } from 'lucide-react';
import { RolesYPermisosView } from '@/features/usuarios/components/RolesYPermisosView';
import { UsuarioModal } from '@/features/usuarios/components/UsuarioModal';
import type { UsuarioLista } from '@/features/usuarios/api/usuariosApi';

type TabId = 'usuarios' | 'roles';

const TABS: { id: TabId; label: string; icon: typeof ShieldCheck }[] = [
  { id: 'usuarios', label: 'Usuarios', icon: ShieldCheck },
  { id: 'roles', label: 'Roles y Permisos', icon: Settings },
];

export function UsuariosView() {
  const [activeTab, setActiveTab] = useState<TabId>('usuarios');
  const [usuarios, setUsuarios] = useState<UsuarioLista[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolFilter, setRolFilter] = useState<'TODOS' | 'admin' | 'gerente' | 'vendedor'>('TODOS');
  const [search, setSearch] = useState('');
  const [usuarioModalOpen, setUsuarioModalOpen] = useState<{ usuario?: UsuarioLista; isEditing: boolean } | null>(null);

  const tieneFiltrosActivos = Boolean(search || rolFilter !== 'TODOS');

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const res = await apiClient('/usuarios');
        setUsuarios(res.data || []);
      } catch (e) {
        console.error('Error cargando usuarios:', e);
        showToast.error('No se pudieron cargar los usuarios');
      } finally {
        setLoading(false);
      }
    };
    void fetchUsuarios();
  }, []);

  const usuariosFiltrados = usuarios.filter((u) => {
    if (rolFilter !== 'TODOS' && u.rol !== rolFilter) return false;
    if (search && !u.nombre.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16" role="status" aria-live="polite">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary" />
        <span className="sr-only">Cargando usuarios…</span>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={value => setActiveTab(value as TabId)} className="space-y-4">
      {/* Filtros + acción principal (sólo pestaña Usuarios) */}
      {activeTab === 'usuarios' && (
        <FilterCard className="w-full">
          <FilterGrid>
            <div className="flex-[2] min-w-[220px]">
              <Input
                type="text"
                label="Buscar"
                icon={<Search className="w-4 h-4" />}
                placeholder="Buscar por nombre o correo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <Select
                label="Rol"
                value={rolFilter}
                onChange={(e) => setRolFilter(e.target.value as 'TODOS' | 'admin' | 'gerente' | 'vendedor')}
                options={[
                  { label: 'Todos', value: 'TODOS' },
                  { label: 'Administrador', value: 'admin' },
                  { label: 'Gerente', value: 'gerente' },
                  { label: 'Vendedor', value: 'vendedor' },
                ]}
                className="w-full"
              />
            </div>
            {/* Acción alineada a la derecha, a la altura de los campos (h-9) */}
            <div className="shrink-0 flex items-end">
              <Button
                type="button"
                variant="primary"
                onClick={() => setUsuarioModalOpen({ isEditing: false })}
                className="h-9 gap-1.5 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Usuario</span>
              </Button>
            </div>
          </FilterGrid>
      
      {/* FILTROS ACTIVOS */}
      {tieneFiltrosActivos && (
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border-default mt-3">
          {search && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-selection text-brand-subtitle text-xs font-medium rounded-full border border-accent-primary/40 shadow-sm">
              <span className="font-bold">Búsqueda:</span>
              {search.substring(0, 15)}{search.length > 15 ? '...' : ''}
              <button
                onClick={() => setSearch('')}
                className="hover:bg-accent-primary/20 rounded-full p-0.5 transition-colors"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {rolFilter !== 'TODOS' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-selection text-brand-subtitle text-xs font-medium rounded-full border border-accent-primary/40 shadow-sm">
              <span className="font-bold">Rol:</span>
              {rolFilter}
              <button
                onClick={() => setRolFilter('TODOS')}
                className="hover:bg-accent-primary/20 rounded-full p-0.5 transition-colors"
                aria-label="Remover rol"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
      
      </FilterCard>
      )}

      <TabsList aria-label="Secciones de usuarios" className="w-full max-w-full overflow-x-auto">
        {TABS.map(tab => <TabsTrigger key={tab.id} value={tab.id}><tab.icon className="h-4 w-4" />{tab.label}</TabsTrigger>)}
      </TabsList>

      <TabsContent value="usuarios">
        {/* Único contenedor visual: el Table aporta borde, redondeo y scroll.
           wrapperClassName reemplaza el rounded-xl/border-border-default por defecto. */}
        <Table
          className="text-sm"

          scrollLabel="Usuarios"
        >
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuariosFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="py-10 text-center text-brand-options">
                    No se encontraron usuarios
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              usuariosFiltrados.map((u) => (
                <TableRow key={u.id_usuario}>
                  <TableCell className="font-medium text-brand-subtitle">{u.nombre}</TableCell>
                  <TableCell className="text-brand-options">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="neutral" size="estado">{u.rol}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.activo ? 'aprobado' : 'rechazado'} size="estado">
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <IconButton
                      icon={Pencil}
                      label={`Editar usuario ${u.nombre}`}
                      onClick={() => setUsuarioModalOpen({ usuario: u, isEditing: true })}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TabsContent>
      <TabsContent value="roles"><RolesYPermisosView /></TabsContent>

      {/* Modal de creación/edición de usuario (rol y contraseña persisten vía PATCH /usuarios/:id) */}
      <UsuarioModal
        open={!!usuarioModalOpen}
        onClose={() => setUsuarioModalOpen(null)}
        onSuccess={() => { void apiClient('/usuarios').then(res => setUsuarios(res.data || [])).catch(() => showToast.error('No se pudo actualizar el listado')); }}
        usuario={usuarioModalOpen?.usuario ?? null}
      />
    </Tabs>
  );
}
