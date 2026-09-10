'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { UsuarioAutenticado } from '@goldcontinent/shared/auth/rbac';
import { apiClient } from '@/lib/apiClient';

interface AuthContextType {
  usuario: UsuarioAutenticado | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function setRoleCookie(rol: string) {
  document.cookie = `userRole=${rol}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

function clearRoleCookie() {
  document.cookie = 'userRole=; path=/; max-age=0';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    // Evitar hacer la petición si no hay cookie de rol (usuario deslogueado)
    if (typeof document !== 'undefined' && !document.cookie.includes('userRole=')) {
      setUsuario(null);
      setLoading(false);
      return;
    }

    try {
      const data = await apiClient('/api/auth/me');
      if (data.success) {
        setUsuario(data.data.usuario);
        setRoleCookie(data.data.usuario.rol);
      } else {
        setUsuario(null);
        clearRoleCookie();
      }
    } catch {
      setUsuario(null);
      clearRoleCookie();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiClient('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (!data.success) {
      throw new Error(data.message || 'Error al iniciar sesión');
    }

    setUsuario(data.data.usuario);
    setRoleCookie(data.data.usuario.rol);
  };

  const logout = async () => {
    try {
      await apiClient('/api/auth/logout', { method: 'POST' });
    } finally {
      setUsuario(null);
      clearRoleCookie();
    }
  };

  const refresh = async () => {
    try {
      await apiClient('/api/auth/refresh', { method: 'POST' });
      await fetchUser();
    } catch {
      setUsuario(null);
      clearRoleCookie();
    }
  };

  return (
    <AuthContext.Provider value={{ usuario, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}