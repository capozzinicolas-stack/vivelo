import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vivelo Admin',
  description: 'Panel de administracion de Vivelo',
  robots: { index: false, follow: false },
};

export default function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
