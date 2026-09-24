'use client';

import { Plus, Search, MoreVertical } from 'lucide-react';
import { useAuth } from '@/lib/authProvider';
import { useEffect, useState } from 'react';
import { Rol } from '@goldcontinent/shared/auth';
import { getUsuarios, toggleUsuarioActivo, UsuarioLista } from '@/features/usuarios/api/usuariosApi';
import { showToast } from '@/lib/toast';

type Usuario = UsuarioLista;

const ROLE_LABELS: Record<Rol, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
};

const ROLE_COLORS: Record<Rol, string> = {
  admin: 'bg-brand-soft text-brand-subtitle border border-brand-primary/40',
  gerente: 'bg-estado-enviado-soft text-tienda border border-tienda/40',
  vendedor: 'bg-estado-aprobado-soft text-estado-aprobado-text border border-estado-aprobado/40',
};

export default function UsuariosPage() {
  const { usuario } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const data = await getUsuarios();
        setUsuarios(data);
      } catch (error) {
        showToast.error(error instanceof Error ? error.message : 'No se pudieron cargar los usuarios');
      } finally {
        setLoading(false);
      }
    };

    fetchUsuarios();
  }, []);

  const toggleActivo = async (user: Usuario) => {
    try {
      await toggleUsuarioActivo(user.id_usuario, !user.activo);
      setUsuarios(usuarios.map(u => u.id_usuario === user.id_usuario ? { ...u, activo: !u.activo } : u));
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'No se pudo actualizar el usuario');
    }
  };

  const filteredUsuarios = usuarios.filter(u =>
    u.nombre.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-500">Administra los usuarios del sistema</p>
        </div>
        <button className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-hover transition-colors flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Usuario
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar usuarios..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse bg-gray-100 rounded" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredUsuarios.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                No se encontraron usuarios
              </div>
            ) : (
              filteredUsuarios.map((user) => (
                <div key={user.id_usuario} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-brand-soft flex items-center justify-center text-brand-primary font-bold">
                      {user.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.nombre}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[user.rol]}`}>
                      {ROLE_LABELS[user.rol]}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.activo ? 'bg-estado-aprobado-soft text-estado-aprobado-text' : 'bg-estado-rechazado-soft text-estado-rechazado-text'}`}>
                      {user.activo ? 'Activo' : 'Inactivo'}
                    </span>
                    <button
                      onClick={() => toggleActivo(user)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}