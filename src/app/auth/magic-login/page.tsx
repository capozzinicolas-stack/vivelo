'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function MagicLoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type');
    const next = searchParams.get('next') || '/dashboard/proveedor';

    if (!tokenHash || type !== 'magiclink') {
      setError('Link invalido');
      return;
    }

    const verifyToken = async () => {
      try {
        const supabase = createClient();
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'magiclink',
        });

        if (verifyError) {
          console.error('[MagicLogin] Verify error:', verifyError);
          setError('No se pudo iniciar sesion. El link puede haber expirado.');
          return;
        }

        // Session established — redirect
        router.replace(next);
      } catch (err) {
        console.error('[MagicLogin] Error:', err);
        setError('Error al procesar el acceso');
      }
    };

    verifyToken();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-destructive font-medium">{error}</p>
        <a href="/login" className="text-sm text-muted-foreground underline">
          Ir a iniciar sesion
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-[#43276c]" />
      <p className="text-muted-foreground">Iniciando sesion...</p>
    </div>
  );
}
