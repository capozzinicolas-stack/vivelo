'use client';

import { useEffect } from 'react';
import { useAuthContext } from '@/providers/auth-provider';
import { Sidebar } from '@/components/dashboard/sidebar';
import { ProviderOnboardingBanner } from '@/components/dashboard/provider-onboarding-banner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/login';
    }
  }, [loading, user]);

  if (loading || !user) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="flex min-h-screen">
      <Sidebar role={user.role} />
      <div className="flex-1">
        {user.role === 'provider' && <ProviderOnboardingBanner profile={user} />}
        <div className="p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
