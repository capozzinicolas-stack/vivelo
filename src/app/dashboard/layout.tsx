'use client';

import { useAuthContext } from '@/providers/auth-provider';
import { Sidebar } from '@/components/dashboard/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext();

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p>Cargando...</p></div>;
  if (!user) return <div className="flex items-center justify-center min-h-screen"><p>Debes iniciar sesion</p></div>;

  return (
    <div className="flex min-h-screen">
      <Sidebar role={user.role} />
      <div className="flex-1 p-6 lg:p-8">{children}</div>
    </div>
  );
}
