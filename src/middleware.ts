import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/', '/login', '/register', '/home', '/search', '/services', '/api'];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some(path =>
    pathname === path || pathname.startsWith(path + '/')
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check for mock auth mode
  const isMockMode = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder');

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
