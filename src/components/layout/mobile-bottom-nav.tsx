'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, ShoppingCart, LayoutDashboard, LogIn } from 'lucide-react';
import { useCart } from '@/providers/cart-provider';
import { useAuthContext } from '@/providers/auth-provider';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { user } = useAuthContext();

  const tabs = [
    { href: '/servicios', label: 'Explorar', icon: Search, match: ['/servicios'] },
    { href: '/carrito', label: 'Carrito', icon: ShoppingCart, match: ['/carrito', '/checkout'] },
    user
      ? { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, match: ['/dashboard'] }
      : { href: '/login', label: 'Ingresar', icon: LogIn, match: ['/login', '/register'] },
  ];

  const isActive = (match: string[]) =>
    match.some((m) => pathname === m || pathname.startsWith(m + '/'));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 lg:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const active = isActive(tab.match);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                active ? 'text-violet-600' : 'text-gray-500'
              }`}
            >
              <div className="relative">
                <tab.icon className="h-5 w-5" />
                {tab.label === 'Carrito' && itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-violet-600 text-white text-[9px] font-bold rounded-full h-4 min-w-[16px] flex items-center justify-center px-0.5">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
