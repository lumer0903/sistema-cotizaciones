import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutGrid, Package, DollarSign, FileText, ShoppingCart,
  CreditCard, BarChart3, Users, Settings, LogOut, ChevronDown,
} from 'lucide-react'

interface SidebarProps {
  onLogout?: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ onLogout }) => {
  const pathname = usePathname()
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)

  const isActive = (path: string) => pathname === path
  const isSubmenuOpen = (id: string) => openSubmenu === id

  const activeStyles = 'bg-[#FFF8E6] border-l-4 border-yellow-500 text-amber-600 font-bold'
  const inactiveStyles = 'border-l-4 border-transparent text-neutral-700 hover:bg-gray-50 hover:text-amber-600 font-normal'

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, path: '/admin/dashboard' },
    { id: 'inventario', label: 'Inventario', icon: Package, path: '/admin/inventario' },
    { id: 'precio', label: 'Precio & Historial', icon: DollarSign, path: '/app/precios' },
    { 
      id: 'cotizaciones', 
      label: 'Cotizaciones', 
      icon: FileText, 
      path: '/app/cotizaciones',
      submenu: [
        { id: 'crear-coti', label: 'Crear cotización', path: '/app/cotizaciones/crear' },
        { id: 'mis-coti', label: 'Mis Cotizaciones', path: '/app/cotizaciones' },
      ]
    },
    { id: 'ventas', label: 'Ventas', icon: ShoppingCart, path: '/app/ventas' },
    { id: 'cobranza', label: 'Cobranza', icon: CreditCard, path: '/app/cobranza' },
    { id: 'reportes', label: 'Reportes', icon: BarChart3, path: '/app/reportes' },
    { id: 'usuarios', label: 'Usuarios', icon: Users, path: '/admin/usuarios' },
    { id: 'config', label: 'Configuración', icon: Settings, path: '/app/configuracion' },
  ]

  return (
    <nav className="w-72 h-screen bg-white border-r border-gray-200 flex flex-col justify-between shadow-sm">
      {/* Logo */}
      <div className="p-7 py-2 border-b border-gray-200">
        <Link href="/" className="w-60 h-14 block">
          {/* Logo aquí */}
        </Link>
      </div>

      {/* Navigation */}
      <ul className="flex-1 overflow-y-auto px-0 py-6">
        {menuItems.map((item) => (
          <div key={item.id}>
            {item.submenu ? (
              // Item con submenu
              <>
                <li>
                  <button
                    onClick={() => setOpenSubmenu(isSubmenuOpen(item.id) ? null : item.id)}
                    className={`w-full h-14 px-7 py-2 border-l-4 flex items-center gap-3 transition-colors
                      ${isActive(item.path) || pathname.startsWith(item.path)
                        ? activeStyles
                        : inactiveStyles
                      }`}
                  >
                    <item.icon className={`w-6 h-6 ${isActive(item.path) || pathname.startsWith(item.path) ? 'text-amber-600' : 'text-neutral-700'}`} />
                    <span className="text-base flex-1 text-left">{item.label}</span>
                    <ChevronDown 
                      className={`w-5 h-5 transition-transform ${isSubmenuOpen(item.id) ? 'rotate-180' : ''} ${isActive(item.path) || pathname.startsWith(item.path) ? 'text-amber-600' : 'text-neutral-700'}`}
                    />
                  </button>
                </li>

                {/* Submenu Items */}
                {isSubmenuOpen(item.id) && (
                  <ul className="bg-gray-50">
                    {item.submenu.map((subitem) => (
                      <li key={subitem.id}>
                        <Link
                          href={subitem.path}
                          className={`block h-14 pl-16 pr-9 py-2 border-l-4 flex items-center text-base transition-colors
                            ${isActive(subitem.path)
                              ? 'bg-[#FFF8E6] border-l-yellow-500 text-amber-600 font-bold'
                              : 'border-l-transparent text-neutral-400 hover:bg-gray-100 hover:text-amber-600 font-normal'}
                          }`}
                        >
                          {subitem.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              // Item sin submenu
              <li>
                <Link
                  href={item.path}
                  className={`block h-14 px-7 py-2 border-l-4 flex items-center gap-3 transition-colors
                    ${isActive(item.path)
                      ? activeStyles
                      : inactiveStyles
                    }`}
                >
                  <item.icon className={`w-6 h-6 ${isActive(item.path) ? 'text-amber-600' : 'text-neutral-700'}`} />
                  <span className="text-base">{item.label}</span>
                </Link>
              </li>
            )}
          </div>
        ))}
      </ul>

      {/* Logout */}
      <div className="border-t border-gray-200 p-7 py-2 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]">
        <button
          onClick={onLogout}
          className="w-full h-16 flex items-center gap-2.5 text-neutral-700 text-base font-medium hover:bg-red-50 rounded transition-colors"
        >
          <LogOut className="w-6 h-6" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </nav>
  )
}

export default Sidebar