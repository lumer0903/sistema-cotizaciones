import { useEffect, useState } from 'react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { authSession } from '../../application/auth/authSession';
import { apiClient } from '../../infrastructure/http/apiClient';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    document.title = 'Iniciar sesión - Gold Continent';
  }, []);

  if (authSession.token()) return <Navigate to="/dashboard" replace />;

async function submit(event) {
    event.preventDefault();
    console.log('🔐 Submit iniciado');
    setMessage('');
    if (!email.trim() || !password.trim()) return setMessage('Completa todos los campos.');
    if (attempts >= 3) return setMessage('Acceso bloqueado temporalmente.');
    setLoading(true);
    try {
      const response = await apiClient('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), password: password.trim() })
      });
      console.log('📡 Response status:', response.status);
      const result = await response.json();
      console.log('📦 Result:', result);
      if (response.ok && result.success) {
        authSession.save(result.data);
        navigate('/dashboard', { replace: true });
        return;
      }
      const next = attempts + 1;
      setAttempts(next);
      setMessage(next >= 3
        ? 'Has superado el límite de intentos.'
        : `${result.message || 'Credenciales incorrectas.'} Te quedan ${3 - next} intentos.`);
    } catch (err) {
      console.error('💥 Error:', err);
      setMessage('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }

  const blocked = attempts >= 3;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden select-none">
      {/* Elementos decorativos sutiles de fondo (gradients) */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] aspect-square rounded-full bg-red-100/35 blur-3xl opacity-50" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] aspect-square rounded-full bg-red-100/35 blur-3xl opacity-50" />

      <div className="w-full max-w-md space-y-8 z-10 animate-in">
        {/* Cabecera del Login */}
        <div className="flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-xl bg-[#7b1c1c] flex items-center justify-center text-white font-bold text-xl shadow-xs">
            G
          </div>
          <h2 className="mt-6 text-xl font-bold tracking-tight text-[#414141]">
            Ingresa a tu cuenta
          </h2>
          <p className="mt-2 text-xs text-neutral-450 font-medium">
            Introduce tus credenciales para acceder a Gold Continent
          </p>
        </div>

        {/* Card Formulario */}
        <div className="bg-white border border-[#d9d9d9] rounded-2xl p-8 shadow-sm">
          <form className="space-y-6" onSubmit={submit}>
            {/* Campo Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                Correo electrónico
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="nombre@goldcontinent.com"
                  required
                  autoComplete="username"
                  className="block w-full rounded-xl border border-[#d9d9d9] bg-white py-3 pl-10 pr-4 text-sm placeholder-neutral-400 focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none"
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="password"
                  type={visible ? 'text' : 'password'}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="block w-full rounded-xl border border-[#d9d9d9] bg-white py-3 pl-10 pr-12 text-sm placeholder-neutral-400 focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-neutral-400 hover:text-[#7b1c1c] transition-colors"
                  onClick={() => setVisible(value => !value)}
                  aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Alerta de Error */}
            {message && (
              <div className="rounded-xl border border-red-100 bg-red-50/50 p-3 text-xs font-medium text-red-650 animate-in" role="alert">
                {message}
              </div>
            )}

            {/* Botón de Ingresar */}
            <button
              type="submit"
              disabled={loading || blocked}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-xs font-bold text-white bg-[#7b1c1c] hover:bg-[#601414] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7b1c1c] transition-all shadow-xs hover:shadow-sm"
            >
              {blocked ? 'ACCESO BLOQUEADO' : loading ? 'VALIDANDO...' : 'INGRESAR'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
