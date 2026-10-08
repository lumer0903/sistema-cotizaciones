import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-[100dvh] w-full bg-white flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold text-brand-subtitle">404</p>
        <h1 className="mt-4 text-2xl font-semibold text-brand-subtitle">
          Página no encontrada
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          La ruta que buscas no existe o fue movida.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-md bg-brand-subtitle px-5 text-sm font-medium text-white hover:bg-black transition-colors"
          >
            Ir al inicio
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center rounded-md border border-border-default px-5 text-sm font-medium text-brand-subtitle hover:bg-zinc-50 transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </main>
  );
}
