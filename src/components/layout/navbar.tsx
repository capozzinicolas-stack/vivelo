'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthContext } from '@/providers/auth-provider';
import { UserRole } from '@/types/database';
import { useCatalog } from '@/providers/catalog-provider';
import { CategoryMegaMenu } from './category-mega-menu';
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
import Image from 'next/image';
import { LogOut, LayoutDashboard, ShoppingCart } from 'lucide-react';
import { useCart } from '@/providers/cart-provider';

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
  const { itemCount } = useCart();
  const { categories, getCategoryIcon } = useCatalog();
  const pathname = usePathname();
  const [openMegaMenu, setOpenMegaMenu] = useState<string | null>(null);

  const handleCategoryHover = (categoryValue: string) => {
    setOpenMegaMenu(categoryValue);
  };

  const closeMegaMenu = () => {
    setOpenMegaMenu(null);
  };

  const openCategory = openMegaMenu ? categories.find((c) => c.slug === openMegaMenu) : null;

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b shadow-sm">
      <div className="relative container mx-auto flex items-center justify-between px-4 py-2">
        <Link href="/" className="flex items-center shrink-0">
          <Image src="/logo-vivelo.png" alt="Vivelo" width={120} height={36} className="h-9 w-auto" />
        </Link>

        {/* Desktop nav: categories + servicios */}
        <nav className="hidden lg:flex items-center gap-1 mx-4">
          {categories.filter(c => c.is_active).map((cat) => {
            const CatIcon = getCategoryIcon(cat.slug);
            return (
              <div
                key={cat.slug}
                className="relative"
                onMouseEnter={() => handleCategoryHover(cat.slug)}
              >
                <Link
                  href={`/servicios?categoria=${cat.slug}`}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md text-center transition-colors hover:bg-muted w-[90px] ${
                    openMegaMenu === cat.slug ? 'bg-muted text-violet-600' : 'text-muted-foreground'
                  }`}
                >
                  <CatIcon className="h-5 w-5" />
                  <span className="text-[11px] font-medium leading-tight">{cat.label}</span>
                </Link>
              </div>
            );
          })}
          <Link
            href="/servicios"
            className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors hover:bg-muted w-[90px] text-center ${
              pathname === '/servicios' ? 'text-violet-600' : 'text-muted-foreground'
            }`}
            onMouseEnter={closeMegaMenu}
          >
            Ver Todos
          </Link>
        </nav>

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <Link href="/carrito" className="relative p-2 rounded-md hover:bg-muted transition-colors">
            <ShoppingCart className="h-5 w-5 text-muted-foreground" />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-violet-600 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </Link>

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


        {/* Mega menu overlay */}
        {openCategory && (
          <CategoryMegaMenu
            category={openCategory}
            onClose={closeMegaMenu}
          />
        )}
      </div>
    </header>
  );
}
