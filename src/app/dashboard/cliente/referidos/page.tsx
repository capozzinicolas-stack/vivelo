'use client';

// V1: Referidos para clientes esta oculto. Solo proveedor→proveedor esta activo.
// El codigo original se conserva en git history para uso futuro.
// Cuando se reactive, restaurar desde commit previo y volver a habilitar el link en sidebar.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReferidosPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/cliente');
  }, [router]);

  return (
    <div className="p-8 text-center text-muted-foreground">
      Redirigiendo...
    </div>
  );
}
