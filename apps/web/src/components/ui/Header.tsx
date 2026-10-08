'use client';

import { useAuth } from '@/lib/authProvider';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { Menu, LogOut } from 'lucide-react';

interface HeaderProps {
  /** Control externo opcional del estado del sidebar. */
  sidebarOpen?: boolean;
  /** Callback al alternar el sidebar (además de la persistencia local). */
  onToggleSidebar?: () => void;
}

export function Header({ sidebarOpen: controlledOpen, onToggleSidebar }: HeaderProps = {}) {
  const { usuario, logout } = useAuth();
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hidratación desde localStorage: recuerda el estado del sidebar entre sesiones
  // (fallback: abierto en desktop, cerrado en móvil). Estado inicial `false`
  // para evitar mismatch de hidratación SSR/cliente.
  useEffect(() => {
    const stored = localStorage.getItem('sidebarOpen');
    if (stored !== null) {
      setInternalOpen(stored === 'true');
    } else {
      setInternalOpen(window.innerWidth >= 1024);
    }
    setHydrated(true);
  }, []);

  const open = controlledOpen ?? internalOpen;

  const toggleSidebar = () => {
    const next = !open;
    if (controlledOpen === undefined) {
      setInternalOpen(next);
      if (hydrated) localStorage.setItem('sidebarOpen', String(next));
    }
    onToggleSidebar?.();
  };

  return (
    <header className="w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={toggleSidebar}
          className="p-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-md text-zinc-600 hover:text-black hover:bg-zinc-100 transition-colors shrink-0"
          aria-label="Alternar menú"
          aria-expanded={open}
          aria-controls="menu-lateral"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden sm:flex flex-col items-end">
          <span className="text-xs font-semibold text-zinc-900">{usuario?.nombre || 'Usuario'}</span>
          <span className={`text-xs font-semibold tracking-wider uppercase ${open ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {usuario?.rol || 'Vendedor'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Avatar
          src={usuario?.avatar_url}
          nombre={usuario?.nombre || 'US'}
          size="md"
          className="bg-brand-primary text-brand-ink border-transparent"
        />

        <button
          onClick={async () => {
            await logout();
            router.push('/login');
          }}
          className="min-h-11 min-w-11 flex items-center justify-center gap-2 text-zinc-700 hover:text-black hover:bg-zinc-100 rounded-lg transition-colors px-3"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <LogOut className="w-4.5 h-4.5 text-zinc-500" />
          <span className="hidden sm:inline text-xs font-semibold">Cerrar</span>
        </button>
      </div>
    </header>
  );
}
