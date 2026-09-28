import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-[100dvh] w-full bg-white flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold text-[#414141]">404</p>
        <h1 className="mt-4 text-2xl font-semibold text-[#414141]">
          Página no encontrada
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          La ruta que buscas no existe o fue movida.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-md bg-[#414141] px-5 text-sm font-medium text-white hover:bg-black transition-colors"
          >
            Ir al inicio
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center rounded-md border border-[#E4E4E4] px-5 text-sm font-medium text-[#414141] hover:bg-gray-50 transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </main>
  );
}
