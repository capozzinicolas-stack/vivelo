'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  ShieldCheck,
  Menu,
  LogOut,
  DollarSign,
  Settings,
  Megaphone,
  FileText,
  Bell,
  Store,
} from 'lucide-react';

const adminNavItems = [
  { label: 'Resumen', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Usuarios', href: '/dashboard/usuarios', icon: Users },
  { label: 'Proveedores', href: '/dashboard/proveedores', icon: Store },
  { label: 'Servicios', href: '/dashboard/servicios', icon: ShieldCheck },
  { label: 'Reservas', href: '/dashboard/reservas', icon: CalendarCheck },
  { label: 'Finanzas', href: '/dashboard/finanzas', icon: DollarSign },
  { label: 'Marketing', href: '/dashboard/marketing', icon: Megaphone },
  { label: 'Contenido', href: '/dashboard/contenido', icon: FileText },
  { label: 'Notificaciones', href: '/dashboard/notificaciones', icon: Bell },
  { label: 'Configuracion', href: '/dashboard/configuracion', icon: Settings },
];

function NavLinks({
  items,
  pathname,
  onNav,
}: {
  items: typeof adminNavItems;
  pathname: string;
  onNav?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNav}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            pathname === item.href
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, user } = useAuthContext();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed right-4 top-4 z-40 lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64 p-0">
            <SheetHeader className="border-b p-4">
              <SheetTitle className="text-left">Admin</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col justify-between h-[calc(100%-65px)]">
              <div className="p-4">
                {user && (
                  <div className="mb-4 rounded-lg bg-muted p-3">
                    <p className="text-sm font-medium">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                )}
                <NavLinks items={adminNavItems} pathname={pathname} onNav={() => setOpen(false)} />
              </div>
              <div className="border-t p-4">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-muted-foreground"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar Sesion
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:bg-card lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
        <div className="flex h-full flex-col">
          <div className="border-b p-4">
            <Link href="/dashboard">
              <Image src="/logo-vivelo.png" alt="Vivelo" width={110} height={33} className="h-8 w-auto" />
            </Link>
          </div>
          <div className="flex flex-1 flex-col justify-between p-4">
            <div>
              {user && (
                <div className="mb-6 rounded-lg bg-muted p-3">
                  <p className="text-sm font-medium">{user.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              )}
              <NavLinks items={adminNavItems} pathname={pathname} />
            </div>
            <div className="border-t pt-4">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesion
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
