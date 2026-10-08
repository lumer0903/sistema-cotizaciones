'use client';

import { useEffect } from 'react';

/**
 * Error boundary raíz (App Router): captura errores de render en cualquier
 * página y evita la página en blanco de Next por defecto.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // El error queda registrado en los logs del navegador/servidor.
    console.error('[error.tsx]', error);
  }, [error]);

  return (
    <main className="min-h-[100dvh] w-full bg-white flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold text-brand-subtitle">¡Ups!</p>
        <h1 className="mt-4 text-2xl font-semibold text-brand-subtitle">
          Algo salió mal
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Ocurrió un error inesperado. Puedes intentar de nuevo.
          {error.digest ? (
            <span className="block mt-1 text-xs text-zinc-400">
              Referencia: {error.digest}
            </span>
          ) : null}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center rounded-md bg-brand-subtitle px-5 text-sm font-medium text-white hover:bg-black transition-colors"
          >
            Reintentar
          </button>
          <a
            href="/login"
            className="inline-flex h-11 items-center rounded-md border border-border-default px-5 text-sm font-medium text-brand-subtitle hover:bg-zinc-50 transition-colors"
          >
            Ir al inicio de sesión
          </a>
        </div>
      </div>
    </main>
  );
}
