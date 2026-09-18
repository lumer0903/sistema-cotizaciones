import React from 'react'
import { Settings, Bell } from 'lucide-react'
import Link from 'next/link'

export interface UserProfile {
  name: string
  avatarUrl?: string
  role?: string
}

export interface NavbarProps {
  title: string
  userProfile?: {
    name: string
    avatarUrl?: string
    role?: string
  }
  onSettingsClick?: () => void
  onNotificationsClick?: () => void
  notificationCount?: number
}

const Navbar: React.FC<NavbarProps> = ({
  title,
  userProfile,
  onSettingsClick,
  onNotificationsClick,
  notificationCount,
}) => {
  return (
    <nav
      className="w-full h-24 bg-white border-b border-gray-200 px-16 py-10 flex justify-between items-center shadow-sm"
    >
      {/* Título a la izquierda */}
      <span className="text-yellow-500 font-black text-base tracking-wide">
        {title}
      </span>

      {/* Contenedor derecho: Avatar + Config + Notificaciones */}
      <div className="flex items-center gap-2.5">
        {/* Avatar del usuario */}
        {userProfile ? (
          <div className="relative">
            <img
              src={userProfile.avatarUrl}
              alt={userProfile.name || userProfile.name}
              className="w-14 h-14 rounded-2xl object-cover"
            />
            {userProfile.avatarUrl || (userProfile.name && userProfile.name.length > 0) ? null : (
              <span
                className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white"
              />
            )}
          </div>
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-gray-200 flex items-center justify-center">
            <span className="text-neutral-700 font-medium">U</span>
          </div>
        )}

        {/* Botón de Settings */}
        <button
          onClick={onSettingsClick}
          className="w-14 h-14 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-neutral-700 hover:bg-gray-50 cursor-pointer transition-colors"
          aria-label="Configuración"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* Botón de Notificaciones (opcional) */}
        {onNotificationsClick && (
          <button
            onClick={onNotificationsClick}
            className="w-14 h-14 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-neutral-700 hover:bg-gray-50 cursor-pointer relative"
            aria-label="Notificaciones"
          >
            <Bell className="w-5 h-5" />
            {notificationCount && (
              <span
                className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
              >
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>
        )}
      </div>
    </nav>
  )
}

export default Navbar