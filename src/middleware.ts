import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/', '/login', '/register', '/home', '/search', '/services', '/servicios', '/carrito', '/checkout', '/api/stripe/webhook'];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some(path =>
    pathname === path || pathname.startsWith(path + '/')
  );
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const isAdminDomain = hostname.startsWith('admin.');

  if (isAdminDomain) {
    const { pathname } = request.nextUrl;

    // No rewrite for API, static assets, Next.js internals
    if (
      pathname.startsWith('/api/') ||
      pathname.startsWith('/_next/') ||
      pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$/)
    ) {
      return NextResponse.next();
    }

    // Root → redirect to /login
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Rewrite to /admin-portal/*
    const url = request.nextUrl.clone();
    url.pathname = `/admin-portal${pathname}`;
    const response = NextResponse.rewrite(url);
    response.headers.set('x-admin-portal', '1');
    return response;
  }

  // Block direct access to /admin-portal/* from main domain (allow in dev for testing)
  if (request.nextUrl.pathname.startsWith('/admin-portal')) {
    const isDev = process.env.NODE_ENV === 'development';
    if (!isDev) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    // In dev, set the admin portal header so layout hides customer chrome
    const response = NextResponse.next();
    response.headers.set('x-admin-portal', '1');
    return response;
  }

  // Redirect /dashboard/admin/* to admin subdomain
  if (request.nextUrl.pathname.startsWith('/dashboard/admin')) {
    const adminDomain = process.env.NEXT_PUBLIC_ADMIN_DOMAIN || 'admin.solovivelo.com';
    const protocol = request.nextUrl.protocol;
    const subpath = request.nextUrl.pathname.replace('/dashboard/admin', '/dashboard');
    return NextResponse.redirect(new URL(`${protocol}//${adminDomain}${subpath}`));
  }

  const { pathname } = request.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check for mock auth mode
  const isMockMode = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder');

  if (isMockMode) {
    // In mock mode, allow all routes
    return NextResponse.next();
  }

  // In production, use Supabase middleware
  const { updateSession } = await import('@/lib/supabase/middleware');
  return updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
