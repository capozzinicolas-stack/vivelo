import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types/database';

type AuthResult = {
  user: { id: string; email?: string };
  profile: { id: string; role: UserRole; [key: string]: unknown };
  supabase: ReturnType<typeof createServerSupabaseClient>;
};

export async function getAuthenticatedUser(): Promise<AuthResult | null> {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  return { user, profile, supabase };
}

export async function requireAuth(): Promise<AuthResult | NextResponse> {
  const result = await getAuthenticatedUser();
  if (!result) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  return result;
}

export async function requireRole(roles: UserRole[]): Promise<AuthResult | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  if (!roles.includes(result.profile.role as UserRole)) {
    return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
  }
  return result;
}

// Type guard helper
export function isAuthError(result: AuthResult | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
