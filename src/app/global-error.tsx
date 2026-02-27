'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Algo salio mal</h2>
            <p style={{ color: '#666', marginTop: '0.5rem' }}>Hubo un error inesperado.</p>
            <button onClick={reset} style={{ marginTop: '1rem', padding: '0.5rem 1rem', border: '1px solid #ccc', borderRadius: '0.375rem', cursor: 'pointer' }}>
              Reintentar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
