import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vivelo Admin',
  description: 'Panel de administracion de Vivelo',
};

export default function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
