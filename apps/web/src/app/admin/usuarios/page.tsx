'use client';

import { Users, Plus, Search, MoreVertical } from 'lucide-react';
import { useAuth } from '@/lib/authProvider';
import { apiClient } from '@/lib/apiClient';
import { useEffect, useState } from 'react';
import { Rol } from '@goldcontinent/shared/auth';

interface Usuario {
  id_usuario: number;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
}

const ROLE_LABELS: Record<Rol, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
};

const ROLE_COLORS: Record<Rol, string> = {
  admin: 'bg-purple-100 text-purple-700',
  gerente: 'bg-blue-100 text-blue-700',
  vendedor: 'bg-green-100 text-green-700',
};

export default function UsuariosPage() {
  const { usuario } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const data = await apiClient('/usuarios');
        if (data.success) {
          setUsuarios(data.data);
        }
      } catch (error) {
        console.error('Error fetching usuarios:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsuarios();
  }, []);

  const toggleActivo = async (user: Usuario) => {
    try {
      await apiClient(`/usuarios/${user.id_usuario}`, {
        method: 'PATCH',
        body: JSON.stringify({ activo: !user.activo }),
      });
      setUsuarios(usuarios.map(u => u.id_usuario === user.id_usuario ? { ...u, activo: !u.activo } : u));
    } catch (error) {
      console.error('Error updating user:', error);
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
        <button className="px-4 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors flex items-center gap-2">
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
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
                    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
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
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
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