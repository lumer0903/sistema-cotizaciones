'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import { showToast } from '@/lib/toast';
import { Select, Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Input, Badge, FilterCard, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { UserPlus, Settings, ShieldCheck, Search } from 'lucide-react';
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
        <FilterCard>
          <div className="flex flex-col md:flex-row items-stretch md:items-end gap-x-6 gap-y-4 w-full">
            <div className="flex-[2] min-w-[220px]">
              <Input
                type="text"
                label="Buscar"
                icon={<Search className="w-4 h-4" />}
                placeholder="Nombre o correo"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex-1 min-w-[180px]">
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
            <div className="w-full md:w-auto">
              <Button
                type="button"
                variant="primary"
                onClick={() => setUsuarioModalOpen({ isEditing: false })}
                className="w-full md:w-auto"
              >
                <UserPlus className="w-4 h-4" />
                Nuevo Usuario
              </Button>
            </div>
          </div>
        </FilterCard>
      )}

      <TabsList aria-label="Secciones de usuarios" className="w-fit max-w-full overflow-x-auto">
        {TABS.map(tab => <TabsTrigger key={tab.id} value={tab.id}><tab.icon className="h-4 w-4" />{tab.label}</TabsTrigger>)}
      </TabsList>

      <TabsContent value="usuarios">
        {/* Único contenedor visual: el Table aporta borde, redondeo y scroll.
           wrapperClassName reemplaza el rounded-xl/border-zinc-100 por defecto. */}
        <Table
          className="text-sm"
          wrapperClassName="rounded-2xl border-zinc-200/80 shadow-sm"
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
                  <div className="py-10 text-center text-zinc-500">
                    No se encontraron usuarios
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              usuariosFiltrados.map((u) => (
                <TableRow key={u.id_usuario}>
                  <TableCell className="font-medium text-zinc-900">{u.nombre}</TableCell>
                  <TableCell className="text-zinc-500">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="neutral" size="estado">{u.rol}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.activo ? 'aprobado' : 'rechazado'} size="estado">
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setUsuarioModalOpen({ usuario: u, isEditing: true })}
                      title="Editar usuario"
                      aria-label={`Editar usuario ${u.nombre}`}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
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
        usuario={usuarioModalOpen?.usuario ?? null}
      />
    </Tabs>
  );
}
