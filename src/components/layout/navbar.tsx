'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthContext } from '@/providers/auth-provider';
import { UserRole } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import Image from 'next/image';
import { Menu, LogOut, LayoutDashboard } from 'lucide-react';

const navLinks = [{ href: '/servicios', label: 'Servicios' }];

const mockRoles: { value: UserRole; label: string }[] = [
  { value: 'client', label: 'Cliente' },
  { value: 'provider', label: 'Proveedor' },
  { value: 'admin', label: 'Admin' },
];

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function Navbar() {
  const { user, signOut, isMockMode, switchMockUser } = useAuthContext();
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center">
          <Image src="/logo-vivelo.png" alt="Vivelo" width={120} height={36} className="h-9 w-auto" />
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={`text-sm font-medium transition-colors hover:text-violet-600 ${pathname === link.href ? 'text-violet-600' : 'text-muted-foreground'}`}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {isMockMode && user && (
            <div className="flex items-center gap-1">
              {mockRoles.map((role) => (
                <button key={role.value} onClick={() => switchMockUser(role.value)} className="focus:outline-none">
                  <Badge variant={user.role === role.value ? 'default' : 'outline'} className={`cursor-pointer text-[10px] px-1.5 py-0 ${user.role === role.value ? '' : 'hover:bg-muted'}`}>
                    {role.label}
                  </Badge>
                </button>
              ))}
            </div>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.full_name} />}
                    <AvatarFallback className="bg-violet-100 text-violet-700 text-sm font-medium">{getInitials(user.full_name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="text-sm font-medium">{user.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="cursor-pointer"><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />Cerrar Sesion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild><Link href="/login">Iniciar Sesion</Link></Button>
              <Button size="sm" asChild><Link href="/register">Registrarse</Link></Button>
            </div>
          )}
        </div>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="sm" className="px-2"><Menu className="h-5 w-5" /></Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px]">
            <SheetHeader><SheetTitle><Image src="/logo-vivelo.png" alt="Vivelo" width={100} height={30} className="h-7 w-auto" /></SheetTitle></SheetHeader>
            <nav className="flex flex-col gap-4 mt-8">
              {navLinks.map((link) => (
                <SheetClose asChild key={link.href}>
                  <Link href={link.href} className={`text-base font-medium ${pathname === link.href ? 'text-violet-600' : 'text-foreground'}`}>{link.label}</Link>
                </SheetClose>
              ))}
              {isMockMode && user && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Modo Demo:</p>
                  <div className="flex gap-2">
                    {mockRoles.map((role) => (
                      <button key={role.value} onClick={() => switchMockUser(role.value)} className="focus:outline-none">
                        <Badge variant={user.role === role.value ? 'default' : 'outline'} className="cursor-pointer text-xs">{role.label}</Badge>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="border-t pt-4 mt-2">
                {user ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-violet-100 text-violet-700">{getInitials(user.full_name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <SheetClose asChild><Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium hover:text-violet-600"><LayoutDashboard className="h-4 w-4" />Dashboard</Link></SheetClose>
                    <button onClick={() => { signOut(); setSheetOpen(false); }} className="flex items-center gap-2 text-sm font-medium text-red-600"><LogOut className="h-4 w-4" />Cerrar Sesion</button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <SheetClose asChild><Button variant="outline" className="w-full" asChild><Link href="/login">Iniciar Sesion</Link></Button></SheetClose>
                    <SheetClose asChild><Button className="w-full" asChild><Link href="/register">Registrarse</Link></Button></SheetClose>
                  </div>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
