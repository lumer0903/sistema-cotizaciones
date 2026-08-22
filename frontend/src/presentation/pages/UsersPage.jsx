import { useCallback, useEffect, useState } from 'react';
import { Ban, CheckCircle, Edit3, Plus, Search, ShieldCheck, UserCheck, Users, X, ChevronDown } from 'lucide-react';
import { apiJson } from '../../infrastructure/http/apiClient';
import { authSession } from '../../application/auth/authSession';
import { AppLayout } from '../components/AppLayout';
import { Modal } from '../components/Modal';
import { initials } from '../utils/format';

const modules = [
  ['dashboard', 'Dashboard'],
  ['productos', 'Catálogo'],
  ['importacion', 'Importación de productos'],
  ['consulta_precios', 'Consulta de precios'],
  ['cotizaciones', 'Cotizaciones'],
  ['recomendaciones', 'Recomendaciones IA'],
  ['pdf', 'Generación de PDF'],
  ['usuarios', 'Usuarios y roles']
];

const roleText = { admin: 'Administrador', gerente: 'Gerente', vendedor: 'Vendedor' };
const permissionsKey = 'goldcontinent_role_permissions';

export function UsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState({});
  const [tab, setTab] = useState('usuarios');
  const [query, setQuery] = useState('');
  const [activeRole, setActiveRole] = useState('admin');
  const [modal, setModal] = useState(null);
  const [error, setError] = useState('');
  
  const current = authSession.user();

  const load = useCallback(async () => {
    try {
      const [userData, roleData] = await Promise.all([
        apiJson('/api/usuarios'),
        apiJson('/api/usuarios/roles')
      ]);
      const local = JSON.parse(localStorage.getItem(permissionsKey) || '{}');
      Object.entries(local).forEach(([key, value]) => {
        if (roleData[key]) roleData[key].permisos = { ...roleData[key].permisos, ...value };
      });
      setUsers(userData);
      setRoles(roleData);
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function open(user = null, profile = false) {
    setModal({
      profile,
      original: user,
      nombre: user?.nombre || '',
      email: user?.email || '',
      password: '',
      rol: user?.rol || 'vendedor',
      activo: user?.activo ?? true
    });
  }

  async function save() {
    const payload = { 
      nombre: modal.nombre.trim(), 
      email: modal.email.trim(), 
      rol: modal.rol, 
      activo: modal.activo 
    };
    if (modal.password) payload.password = modal.password;
    const path = modal.profile ? '/api/usuarios/perfil' : modal.original ? `/api/usuarios/${modal.original.id_usuario}` : '/api/usuarios';
    const data = await apiJson(path, {
      method: modal.original || modal.profile ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
    if (modal.profile) {
      authSession.save({ ...authSession.get(), usuario: data });
    }
    setModal(null);
    load();
  }

  async function toggle(user) {
    await apiJson(`/api/usuarios/${user.id_usuario}`, {
      method: 'PUT',
      body: JSON.stringify({ ...user, activo: !user.activo })
    });
    load();
  }

  function changePermission(module, value) {
    const next = {
      ...roles,
      [activeRole]: {
        ...roles[activeRole],
        permisos: { ...roles[activeRole].permisos, [module]: value }
      }
    };
    setRoles(next);
    localStorage.setItem(
      permissionsKey, 
      JSON.stringify(Object.fromEntries(Object.entries(next).map(([key, role]) => [key, role.permisos])))
    );
  }

  const filtered = users.filter(user => user.nombre.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <AppLayout title="Usuarios y configuración">
      <div className="space-y-8 select-none animate-in">
        {error && (
          <div className="rounded-xl border border-[#7b1c1c] bg-red-50/50 p-4 text-xs font-semibold text-[#7b1c1c]">
            {error}
          </div>
        )}

        {/* Card Perfil del Usuario Actual */}
        <section className="bg-white border border-[#d9d9d9] p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-[#7b1c1c] text-white flex items-center justify-center text-sm font-bold shadow-xs select-none">
              {initials(current?.nombre)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <strong className="text-sm font-bold text-[#414141]">{current?.nombre}</strong>
                <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-[9px] font-semibold text-neutral-600 border border-[#d9d9d9]/40 uppercase tracking-wider">
                  {roleText[current?.rol]}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">{current?.email}</p>
            </div>
          </div>
          <button 
            onClick={() => open(current, true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#d9d9d9] bg-white px-4 py-2.5 text-xs font-semibold text-[#414141] hover:bg-[#fdf2f2] hover:text-[#7b1c1c] transition-all shadow-2xs"
          >
            <Edit3 className="h-3.5 w-3.5 text-neutral-500" />
            <span>Editar perfil</span>
          </button>
        </section>

        {/* Pestañas (Tabs) */}
        <div className="border-b border-[#d9d9d9] flex gap-6">
          <button 
            onClick={() => setTab('usuarios')}
            className={`
              pb-3 text-xs font-bold transition-all relative outline-none
              ${tab === 'usuarios' 
                ? 'text-[#7b1c1c] border-b-2 border-[#7b1c1c] font-bold' 
                : 'text-neutral-400 hover:text-neutral-650'}
            `}
          >
            Listado de usuarios
          </button>
          <button 
            onClick={() => setTab('roles')}
            className={`
              pb-3 text-xs font-bold transition-all relative outline-none
              ${tab === 'roles' 
                ? 'text-[#7b1c1c] border-b-2 border-[#7b1c1c] font-bold' 
                : 'text-neutral-400 hover:text-neutral-650'}
            `}
          >
            Roles y permisos
          </button>
        </div>

        {tab === 'usuarios' ? (
          /* Pestaña: Usuarios */
          <section className="space-y-6">
            {/* Barra superior de listado */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border border-[#d9d9d9] bg-white p-5 rounded-2xl shadow-xs">
              <div className="relative flex-1 max-w-sm">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Buscar usuario por nombre..."
                  className="block w-full rounded-xl border border-[#d9d9d9] bg-white py-2.5 pl-9 pr-4 text-xs placeholder-neutral-400 focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none"
                />
              </div>

              <button
                onClick={() => open()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7b1c1c] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#601414] shadow-xs transition-all duration-150"
              >
                <Plus className="h-4 w-4" />
                <span>Agregar usuario</span>
              </button>
            </div>

            {/* Grid de usuarios */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.length ? (
                filtered.map(user => (
                  <article 
                    key={user.id_usuario}
                    className="relative overflow-hidden rounded-2xl border border-[#d9d9d9] bg-white p-6 shadow-2xs flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between">
                      <div className="h-10 w-10 rounded-full bg-neutral-100 text-neutral-650 flex items-center justify-center text-xs font-bold">
                        {initials(user.nombre)}
                      </div>
                      <span className={`
                        inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold border tracking-wide uppercase
                        ${user.activo 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100/50' 
                          : 'bg-neutral-100 text-neutral-500 border-[#d9d9d9]/50'}
                      `}>
                        {user.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>

                    <div className="mt-4">
                      <strong className="text-xs font-bold text-[#414141] block truncate">
                        {user.nombre}
                      </strong>
                      <span className="text-[10px] text-neutral-450 block truncate mt-0.5">
                        {user.email}
                      </span>
                      <span className="inline-block mt-3 text-[10px] font-semibold text-neutral-500 bg-[#f8fafc] border border-[#d9d9d9] px-2 py-0.5 rounded">
                        {roleText[user.rol]}
                      </span>
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#d9d9d9] flex items-center justify-end gap-2">
                      <button
                        onClick={() => open(user)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#d9d9d9] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#414141] hover:bg-[#fdf2f2] hover:text-[#7b1c1c] shadow-2xs transition-all"
                      >
                        <Edit3 className="h-3 w-3 text-neutral-400" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => toggle(user).catch(requestError => setError(requestError.message))}
                        className={`
                          inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold shadow-2xs transition-all
                          ${user.activo 
                            ? 'border-red-100 bg-white text-red-650 hover:bg-red-50' 
                            : 'border-[#d9d9d9] bg-white text-[#414141] hover:bg-[#f8fafc]'}
                        `}
                      >
                        <Ban className="h-3 w-3" />
                        <span>{user.activo ? 'Deshabilitar' : 'Habilitar'}</span>
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="text-center text-xs text-neutral-400 py-12 sm:col-span-2 lg:col-span-3 xl:col-span-4">
                  No se encontraron usuarios en la lista.
                </div>
              )}
            </div>
          </section>
        ) : (
          /* Pestaña: Roles y Permisos */
          <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
            {/* Sidebar de Roles */}
            <aside className="space-y-2">
              <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase block mb-3">
                Selecciona un rol
              </span>
              {Object.entries(roles).map(([key, role]) => (
                <button
                  key={key}
                  onClick={() => setActiveRole(key)}
                  className={`
                    w-full text-left rounded-xl p-4 border transition-all duration-150 outline-none block
                    ${activeRole === key
                      ? 'border-[#7b1c1c] bg-[#7b1c1c] text-white shadow-2xs'
                      : 'border-[#d9d9d9] text-[#414141] bg-white hover:border-[#7b1c1c]'}
                  `}
                >
                  <strong className={`text-xs font-bold block ${activeRole === key ? 'text-white' : 'text-[#414141]'}`}>
                    {role.nombre}
                  </strong>
                  <span className={`text-[10px] block mt-1 leading-relaxed ${activeRole === key ? 'text-red-100/80' : 'text-neutral-450'}`}>
                    {role.descripcion}
                  </span>
                </button>
              ))}
            </aside>

            {/* Panel de Permisos */}
            {roles[activeRole] && (
              <article className="bg-white border border-[#d9d9d9] rounded-2xl p-6 shadow-xs space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-[#414141] flex items-center gap-1.5">
                    <ShieldCheck className="h-4.5 w-4.5 text-[#7b1c1c]" />
                    <span>Permisos de rol: {roles[activeRole].nombre}</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{roles[activeRole].descripcion}</p>
                </div>

                <div className="overflow-hidden rounded-xl border border-[#d9d9d9]">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#d9d9d9] bg-[#f8fafc]">
                        <th className="px-5 py-3 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Módulo</th>
                        <th className="px-5 py-3 text-center text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-[120px]">Sin acceso</th>
                        <th className="px-5 py-3 text-center text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-[120px]">Lectura</th>
                        <th className="px-5 py-3 text-center text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-[120px]">Edición</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#d9d9d9]/40">
                      {modules.map(([key, label]) => (
                        <tr key={key} className="hover:bg-[#f8fafc]/50 transition-colors">
                          <td className="px-5 py-3 font-semibold text-[#414141]/90">{label}</td>
                          {['sin_acceso', 'lectura', 'edicion'].map(level => (
                            <td key={level} className="px-5 py-3 text-center">
                              <input
                                type="radio"
                                name={key}
                                checked={(roles[activeRole].permisos[key] || 'sin_acceso') === level}
                                onChange={() => changePermission(key, level)}
                                className="h-4 w-4 border-[#d9d9d9] text-[#7b1c1c] focus:ring-[#7b1c1c] cursor-pointer"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            )}
          </section>
        )}
      </div>

      {/* Modal Agregar/Editar Usuario */}
      <Modal
        open={Boolean(modal)}
        title={modal?.profile ? 'Editar perfil' : modal?.original ? 'Editar usuario' : 'Agregar usuario'}
        onClose={() => setModal(null)}
        footer={(
          <div className="flex justify-end gap-3 w-full">
            <button
              className="rounded-xl border border-[#d9d9d9] bg-white px-4 py-2 text-xs font-semibold text-[#414141] hover:bg-[#f8fafc] transition-all shadow-2xs"
              onClick={() => setModal(null)}
            >
              Cancelar
            </button>
            <button
              className="rounded-xl bg-[#7b1c1c] px-4 py-2 text-xs font-semibold text-white hover:bg-[#601414] transition-all shadow-xs"
              onClick={() => save().catch(requestError => setError(requestError.message))}
            >
              Guardar
            </button>
          </div>
        )}
      >
        {modal && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                Nombre completo
              </label>
              <input
                value={modal.nombre}
                onChange={event => setModal({ ...modal, nombre: event.target.value })}
                className="block w-full rounded-xl border border-[#d9d9d9] bg-white py-2.5 px-3 text-xs focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                Correo electrónico
              </label>
              <input
                type="email"
                value={modal.email}
                onChange={event => setModal({ ...modal, email: event.target.value })}
                className="block w-full rounded-xl border border-[#d9d9d9] bg-white py-2.5 px-3 text-xs focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none"
              />
            </div>

            {!modal.profile && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={modal.password}
                    onChange={event => setModal({ ...modal, password: event.target.value })}
                    placeholder={modal.original ? 'Dejar vacío para mantenerla' : 'Mínimo 6 caracteres'}
                    className="block w-full rounded-xl border border-[#d9d9d9] bg-white py-2.5 px-3 text-xs focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none placeholder-neutral-450"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                    Rol asignado
                  </label>
                  <div className="relative">
                    <select
                      value={modal.rol}
                      onChange={event => setModal({ ...modal, rol: event.target.value })}
                      className="block w-full rounded-xl border border-[#d9d9d9] bg-white py-2.5 px-3 text-xs focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none appearance-none pr-8"
                    >
                      {Object.entries(roleText).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-neutral-450">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-neutral-700 pt-2 text-xs">
                  <input
                    type="checkbox"
                    checked={modal.activo}
                    onChange={event => setModal({ ...modal, activo: event.target.checked })}
                    className="h-4 w-4 rounded border-[#d9d9d9] text-[#7b1c1c] focus:ring-[#7b1c1c] cursor-pointer"
                  />
                  <span>Usuario activo en la plataforma</span>
                </label>
              </>
            )}
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
