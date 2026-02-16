'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/providers/auth-provider';

export default function DashboardRedirect() {
  const { user } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    const routes = { client: '/dashboard/cliente', provider: '/dashboard/proveedor', admin: '/dashboard/admin' };
    router.replace(routes[user.role]);
  }, [user, router]);

  return <div className="flex items-center justify-center py-16"><p>Redirigiendo...</p></div>;
}
