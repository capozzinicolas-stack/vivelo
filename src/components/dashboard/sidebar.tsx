'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types/database';
import { useAuthContext } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { LayoutDashboard, CalendarCheck, CalendarDays, Package, Users, ShieldCheck, Menu, LogOut, DollarSign, Settings, UserCircle, Megaphone, FileText, Bell, Store, Gift, Home, FolderOpen, Tag } from 'lucide-react';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const dashboardHome: Record<UserRole, string> = {
  client: '/dashboard/cliente',
  provider: '/dashboard/proveedor',
  admin: '/dashboard/admin',
};

const navByRole: Record<UserRole, { label: string; href: string; icon: React.ElementType }[]> = {
  client: [
    { label: 'Resumen', href: '/dashboard/cliente', icon: LayoutDashboard },
    { label: 'Mis Eventos', href: '/dashboard/cliente/eventos', icon: FolderOpen },
    { label: 'Mis Reservas', href: '/dashboard/cliente/reservas', icon: CalendarCheck },
    { label: 'Mi Perfil', href: '/dashboard/cliente/perfil', icon: UserCircle },
    // Referidos (cliente) oculto en V1 — solo proveedor→proveedor
    // { label: 'Referidos', href: '/dashboard/cliente/referidos', icon: Gift },
  ],
  provider: [
    { label: 'Resumen', href: '/dashboard/proveedor', icon: LayoutDashboard },
    { label: 'Mis Servicios', href: '/dashboard/proveedor/servicios', icon: Package },
    { label: 'Reservas', href: '/dashboard/proveedor/reservas', icon: CalendarCheck },
    { label: 'Calendario', href: '/dashboard/proveedor/calendario', icon: CalendarDays },
    { label: 'Campanas', href: '/dashboard/proveedor/campanas', icon: Megaphone },
    { label: 'Mis Promociones', href: '/dashboard/proveedor/promociones', icon: Tag },
    { label: 'Notificaciones', href: '/dashboard/proveedor/notificaciones', icon: Bell },
    { label: 'Mi Perfil', href: '/dashboard/proveedor/perfil', icon: UserCircle },
    { label: 'Referidos', href: '/dashboard/proveedor/referidos', icon: Gift },
    { label: 'Configuracion', href: '/dashboard/proveedor/configuracion', icon: Settings },
  ],
  admin: [
    { label: 'Resumen', href: '/dashboard/admin', icon: LayoutDashboard },
    { label: 'Usuarios', href: '/dashboard/admin/usuarios', icon: Users },
    { label: 'Proveedores', href: '/dashboard/admin/proveedores', icon: Store },
    { label: 'Servicios', href: '/dashboard/admin/servicios', icon: ShieldCheck },
    { label: 'Reservas', href: '/dashboard/admin/reservas', icon: CalendarCheck },
    { label: 'Finanzas', href: '/dashboard/admin/finanzas', icon: DollarSign },
    { label: 'Marketing', href: '/dashboard/admin/marketing', icon: Megaphone },
    { label: 'Contenido', href: '/dashboard/admin/contenido', icon: FileText },
    { label: 'Notificaciones', href: '/dashboard/admin/notificaciones', icon: Bell },
    { label: 'Configuracion', href: '/dashboard/admin/configuracion', icon: Settings },
  ],
};

function UserAvatar({ user, role }: { user: { full_name: string; email: string; avatar_url?: string | null }; role: UserRole }) {
  return (
    <Link href={dashboardHome[role]} className="flex items-center gap-3 rounded-lg p-3 hover:bg-muted transition-colors">
      <Avatar className="h-10 w-10">
        {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.full_name} />}
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
          {getInitials(user.full_name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{user.full_name}</p>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
      </div>
    </Link>
  );
}

function NavLinks({ items, pathname, onNav }: { items: typeof navByRole.client; pathname: string; onNav?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      <a
        href="/"
        onClick={onNav}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />Ir al Inicio
      </a>
      <div className="my-1 border-b" />
      {items.map((item) => (
        <Link key={item.href} href={item.href} onClick={onNav} className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors', pathname === item.href ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
          <item.icon className="h-4 w-4" />{item.label}
        </Link>
      ))}
    </nav>
  );
}

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const { signOut, user } = useAuthContext();
  const [open, setOpen] = useState(false);
  const items = navByRole[role];

  return (
    <>
      {/* Mobile hamburger + sheet */}
      <div className="fixed right-4 top-4 z-40 lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild><Button variant="outline" size="icon" aria-label="Abrir menu"><Menu className="h-5 w-5" /></Button></SheetTrigger>
          <SheetContent side="right" className="w-64 p-0">
            <SheetHeader className="border-b p-4">
              <SheetTitle className="text-left">
                <a href="/" onClick={() => setOpen(false)}>
                  <Image src="/logo-vivelo.png" alt="Vivelo" width={110} height={33} className="h-8 w-auto" />
                </a>
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col justify-between h-[calc(100%-65px)]">
              <div className="p-4">
                {user && <div className="mb-4"><UserAvatar user={user} role={role} /></div>}
                <NavLinks items={items} pathname={pathname} onNav={() => setOpen(false)} />
              </div>
              <div className="border-t p-4">
                <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={async () => { await signOut(); window.location.href = '/'; }}>
                  <LogOut className="h-4 w-4" />Cerrar Sesion
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
            <a href="/">
              <Image src="/logo-vivelo.png" alt="Vivelo" width={110} height={33} className="h-8 w-auto" />
            </a>
          </div>
          {user && (
            <div className="border-b px-1 py-2">
              <UserAvatar user={user} role={role} />
            </div>
          )}
          <div className="flex flex-1 flex-col justify-between p-4">
            <NavLinks items={items} pathname={pathname} />
            <div className="border-t pt-4">
              <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={async () => { await signOut(); window.location.href = '/'; }}>
                <LogOut className="h-4 w-4" />Cerrar Sesion
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
