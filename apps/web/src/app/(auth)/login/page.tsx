'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/authProvider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, usuario } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setError('');
    setLoading(true);

    try {
      await login(data.email.trim().toLowerCase(), data.password);
      if (usuario?.rol === 'vendedor') {
        router.push('/vendedor/pos');
      } else {
        router.push('/admin/dashboard');
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Error al iniciar sesión';
      setError(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center p-4 sm:p-6 md:p-8">
      <main className="w-full max-w-[1280px] flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12 my-auto">
        {/* LOGO PRINCIPAL */}
        <div className="w-full lg:w-[666px] flex justify-center lg:justify-start">
          <img
            className="w-full lg:h-[500px] object-contain"
            alt="Gold Continent Import & Export"
            src="/LOGO_GRANDE.svg"
          />
        </div>

        {/* TARJETA DE LOGIN (Derecha) */}
        <section
          className="relative w-full max-w-[468px] min-h-[558px] bg-white rounded-2xl border border-gray-200 shadow-xl p-6 sm:p-10 flex flex-col justify-center"
          aria-labelledby="login-heading"
        >
          {/* ISOTIPO SECUNDARIO */}
          <img
            className="absolute top-8 right-8 w-[120px] h-[120px] object-contain opacity-50"
            alt="Gold Continent Icon"
            src="/MUNDO.svg"
          />

          <form className="w-full flex flex-col mt-10 sm:mt-12" onSubmit={handleSubmit(onSubmit)}>
            {/* MENSAJE DE ERROR */}
            {error && (
              <div className="mb-6 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg shadow-sm" role="alert">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* ENCABEZADOS */}
            <div className="flex flex-col items-start w-full mb-8">
              <h1
                id="login-heading"
                className="font-black text-[#f8b602] text-4xl sm:text-5xl tracking-tight leading-tight m-0"
              >
                Bienvenido,
              </h1>
              <p className="font-medium text-gray-700 text-base sm:text-lg leading-normal m-0 mt-2">
                Ingresa tu correo y contraseña
              </p>
            </div>

            {/* CAMPO CORREO */}
            <div className="w-full flex flex-col gap-2 mb-6">
              <label
                htmlFor="email"
                className="font-medium text-gray-600 text-sm"
              >
                Correo electrónico
              </label>
              <div className="relative w-full">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  disabled={loading}
                  aria-label="Correo electrónico"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  className="w-full h-11 pl-12 pr-4 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white outline-none transition-colors
                    placeholder:text-gray-400
                    focus:border-[#f8b602] focus:ring-2 focus:ring-[#f8b602]/20
                    disabled:bg-gray-50 disabled:cursor-not-allowed
                    error:border-red-300 error:focus:border-red-500 error:focus:ring-red-200"
                  placeholder="correo@ejemplo.com"
                />
              </div>
              {errors.email && (
                <p id="email-error" className="text-xs text-red-600" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* CAMPO CONTRASEÑA */}
            <div className="w-full flex flex-col gap-2 mb-8">
              <label
                htmlFor="password"
                className="font-medium text-gray-600 text-sm"
              >
                Contraseña
              </label>
              <div className="relative w-full">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" aria-hidden="true" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  disabled={loading}
                  aria-label="Contraseña"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className="w-full h-11 pl-12 pr-14 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white outline-none transition-colors
                    placeholder:text-gray-400
                    focus:border-[#f8b602] focus:ring-2 focus:ring-[#f8b602]/20
                    disabled:bg-gray-50 disabled:cursor-not-allowed
                    error:border-red-300 error:focus:border-red-500 error:focus:ring-red-200"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="text-xs text-red-600" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* BOTÓN INGRESAR */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#f8b602] rounded-xl shadow-md text-white font-bold text-sm tracking-wide
                flex items-center justify-center gap-2
                hover:bg-[#e0a400] active:scale-[0.98] transition-all
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#f8b602] disabled:active:scale-100
                focus:outline-none focus:ring-2 focus:ring-[#f8b602] focus:ring-offset-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Ingresando...</span>
                </>
              ) : (
                'INGRESAR'
              )}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}