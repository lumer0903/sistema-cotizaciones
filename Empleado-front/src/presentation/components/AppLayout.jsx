import { ChevronDown, ChevronRight, FileText, LayoutDashboard, LogOut, Menu, Package, Search, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authSession } from '../../application/auth/authSession';
import { can } from '../../application/auth/permissions';

const items = [
  ['/dashboard', LayoutDashboard, 'Dashboard', 'dashboard'],
  ['/productos', Package, 'Catálogo', 'productos'],
  ['/consulta-precios', Search, 'Precios', 'consulta_precios'],
  ['/cotizaciones', FileText, 'Mis Cotizaciones', 'cotizaciones'],
  ['/ventas', FileText, 'Ventas', 'cotizaciones'],
];

const roleNames = { admin: 'Administrador', gerente: 'Gerente', vendedor: 'Vendedor' };

export function AppLayout({ title, children }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const user = authSession.user();
  
  // Definimos si estamos dentro del flujo o módulo de Cotizaciones
  const quoteRoute = location.pathname.startsWith('/cotizacion') || location.pathname === '/crear-cotizacion';
  // Definimos si estamos dentro del flujo o módulo de Ventas
  const ventaRoute = location.pathname.startsWith('/venta') || location.pathname === '/crear-venta';

  const userInitials = user?.nombre
    ? user.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'US';

  return (
    <div className="min-h-screen flex bg-[#f8fafc] text-[#414141]">
      {/* Backdrop para Móviles */}
      {open && (
        <div 
          className="fixed inset-0 z-40 bg-neutral-950/20 backdrop-blur-xs md:hidden" 
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar Lateral */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex w-64 flex-col justify-between border-r border-[#d9d9d9] bg-white transition-transform duration-300 ease-in-out md:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Logo / Cabecera Sidebar */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-[#d9d9d9]">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-md bg-[#7b1c1c] flex items-center justify-center text-white font-bold text-sm">G</div>
              <span className="font-semibold text-sm tracking-tight text-[#414141]">Gold Continent</span>
            </div>
            <button 
              className="p-1 rounded-md text-neutral-400 hover:text-[#7b1c1c] hover:bg-[#fdf2f2] md:hidden"
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Menú de Navegación */}
          <nav className="flex-1 px-4 py-6 space-y-1.5">
            {items.filter(([, , , permission]) => can(user, permission)).map(([href, Icon, label]) => {
              const isActive = location.pathname === href || (href === '/cotizaciones' && quoteRoute);
              return (
                <div key={href} className="space-y-1">
                  <Link 
                    to={href} 
                    onClick={() => setOpen(false)}
                    className={`
                      flex items-center justify-between rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150
                      ${isActive 
                        ? 'bg-[#7b1c1c] text-white shadow-xs' 
                        : 'text-[#414141]/80 hover:bg-[#f8fafc] hover:text-[#7b1c1c]'}
                    `}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-neutral-400'}`} />
                      <span>{label}</span>
                    </div>
                    {href === '/cotizaciones' ? (
                      quoteRoute ? (
                        <ChevronDown className={`h-3.5 w-3.5 opacity-60 ${isActive ? 'text-white' : 'text-neutral-400'}`} />
                      ) : (
                        <ChevronRight className={`h-3.5 w-3.5 opacity-60 ${isActive ? 'text-white' : 'text-neutral-400'}`} />
                      )
                    ) : (
                      href !== '/dashboard' && <ChevronRight className={`h-3.5 w-3.5 opacity-60 ${isActive ? 'text-white' : 'text-neutral-400'}`} />
                    )}
                  </Link>

                  {/* Submenú de Cotizaciones */}
                  {href === '/cotizaciones' && quoteRoute && (
                    <div className="ml-5 pl-4 border-l border-[#d9d9d9] py-1 space-y-1">
                      <Link 
                        to="/crear-cotizacion" 
                        onClick={() => setOpen(false)}
                        className={`
                          block rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors
                          ${location.pathname === '/crear-cotizacion' 
                            ? 'text-[#7b1c1c] font-semibold bg-[#fdf2f2]' 
                            : 'text-[#414141]/60 hover:text-[#7b1c1c] hover:bg-[#f8fafc]'}
                        `}
                      >
                        Crear cotización
                      </Link>
                      <Link 
                        to="/cotizaciones" 
                        onClick={() => setOpen(false)}
                        className={`
                          block rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors
                          ${location.pathname === '/cotizaciones' 
                            ? 'text-[#7b1c1c] font-semibold bg-[#fdf2f2]' 
                            : 'text-[#414141]/60 hover:text-[#7b1c1c] hover:bg-[#f8fafc]'}
                        `}
                      >
                        Mis cotizaciones
                      </Link>
                    </div>
                  )}

                  {/* Submenú de Ventas */}
                  {href === '/ventas' && ventaRoute && (
                    <div className="ml-5 pl-4 border-l border-[#d9d9d9] py-1 space-y-1">
                      <Link 
                        to="/crear-venta" 
                        onClick={() => setOpen(false)}
                        className={`
                          block rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors
                          ${location.pathname === '/crear-venta' 
                            ? 'text-[#7b1c1c] font-semibold bg-[#fdf2f2]' 
                            : 'text-[#414141]/60 hover:text-[#7b1c1c] hover:bg-[#f8fafc]'}
                        `}
                      >
                        Crear venta
                      </Link>
                      <Link 
                        to="/ventas" 
                        onClick={() => setOpen(false)}
                        className={`
                          block rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors
                          ${location.pathname === '/ventas' 
                            ? 'text-[#7b1c1c] font-semibold bg-[#fdf2f2]' 
                            : 'text-[#414141]/60 hover:text-[#7b1c1c] hover:bg-[#f8fafc]'}
                        `}
                      >
                        Mis ventas
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-[#d9d9d9] bg-[#f8fafc]">
          <button 
            type="button" 
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-[#414141]/60 hover:bg-red-50 hover:text-red-650 transition-all duration-150"
            onClick={() => authSession.logout()}
          >
            <LogOut className="h-4 w-4" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Viewport */}
      <div className="flex flex-col flex-1 min-w-0 md:pl-64">
        {/* Navbar Superior */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#d9d9d9] bg-white/80 backdrop-blur-md px-6 md:px-8">
          <div className="flex items-center gap-4">
            <button 
              className="p-1 rounded-md text-neutral-500 hover:text-[#7b1c1c] hover:bg-[#fdf2f2] md:hidden"
              onClick={() => setOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-base font-semibold text-[#414141] tracking-tight">{title}</h1>
          </div>

          {/* Información del Usuario */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-[#414141]">{user?.nombre || 'Usuario'}</span>
              <span className="text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
                {roleNames[user?.rol] || user?.rol || 'Rol'}
              </span>
            </div>
            <div className="h-8 w-8 rounded-full bg-[#7b1c1c] text-white flex items-center justify-center text-[11px] font-bold shadow-xs hover:bg-[#601414] transition-colors select-none">
              {userInitials}
            </div>
          </div>
        </header>

        {/* Contenedor Principal */}
        <main className="flex-1 p-6 md:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}