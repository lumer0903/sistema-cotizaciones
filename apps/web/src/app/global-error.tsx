'use client';

/**
 * Error boundary del layout raíz: cuando el error ocurre en el propio
 * root layout, error.tsx normal no puede renderizarse (necesita html/body).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body style={{ fontFamily: 'system-ui, sans-serif' }}>
        <main
          style={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fff',
            padding: '1rem',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: 420 }}>
            <p style={{ fontSize: 48, fontWeight: 700, color: '#414141', margin: 0 }}>
              ¡Ups!
            </p>
            <h1 style={{ fontSize: 20, color: '#414141', marginTop: 12 }}>
              No pudimos cargar la aplicación
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>
              Ocurrió un error inesperado.
              {error.digest ? ` (ref: ${error.digest})` : ''}
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: 20,
                height: 44,
                padding: '0 20px',
                borderRadius: 6,
                border: 'none',
                background: '#414141',
                color: '#fff',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Reintentar
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
