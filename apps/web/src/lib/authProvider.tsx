'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
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

/** Resultado de la carga de sesión: `clearCookie` sólo aplica cuando no hay sesión. */
interface SessionResult {
  usuario: UsuarioAutenticado | null;
  clearCookie: boolean;
}

function setRoleCookie(rol: string) {
  document.cookie = `userRole=${rol}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

function clearRoleCookie() {
  document.cookie = 'userRole=; path=/; max-age=0';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async (): Promise<SessionResult> => {
    // Evitar hacer la petición si no hay cookie de rol (usuario deslogueado)
    if (typeof document !== 'undefined' && !document.cookie.includes('userRole=')) {
      return { usuario: null, clearCookie: false };
    }

    try {
      const data = await apiClient('/api/auth/me');
      if (data.success) {
        return { usuario: data.data.usuario, clearCookie: false };
      }
      return { usuario: null, clearCookie: true };
    } catch {
      return { usuario: null, clearCookie: true };
    }
  }, []);

  const applySession = useCallback((result: SessionResult) => {
    if (result.usuario) {
      setUsuario(result.usuario);
      setRoleCookie(result.usuario.rol);
    } else {
      setUsuario(null);
      if (result.clearCookie) clearRoleCookie();
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSession()
      .then(applySession)
      .catch(() => {
        setUsuario(null);
        clearRoleCookie();
        setLoading(false);
      });
  }, [loadSession, applySession]);

  const login = async (email: string, password: string) => {
    const data = await apiClient('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (!data.success) {
      throw new Error(data.message || 'Error al iniciar sesión');
    }

    // El backend ya fija accessToken/refreshToken como cookies httpOnly.
    // NO copiar el token a localStorage/cookies legibles por JS (auditoría P13):
    // un XSS no debe poder exfiltrar el JWT.

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
      applySession(await loadSession());
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