'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Profile, UserRole } from '@/types/database';
import { mockUsers } from '@/data/mock-users';

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: UserRole, phone?: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchMockUser: (role: UserRole) => void;
  updateUser: (updates: Partial<Profile>) => void;
  isMockMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isMockMode = typeof window !== 'undefined'
  ? process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') ?? true
  : true;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isMockMode) {
      // Default to client user in mock mode
      const savedRole = typeof window !== 'undefined' ? localStorage.getItem('vivelo-mock-role') : null;
      const defaultUser = mockUsers.find(u => u.role === (savedRole || 'client')) || mockUsers[0];
      setUser(defaultUser);
      setLoading(false);
      return;
    }

    // Real Supabase auth
    const initAuth = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (authUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();

          setUser(profile);
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const signIn = useCallback(async (email: string, _password: string) => {
    if (isMockMode) {
      const mockUser = mockUsers.find(u => u.email === email) || mockUsers[0];
      setUser(mockUser);
      localStorage.setItem('vivelo-mock-role', mockUser.role);
      return;
    }

    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: _password });
    if (error) throw error;

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
      setUser(profile);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string, role: UserRole, phone?: string) => {
    if (isMockMode) {
      const newUser: Profile = {
        id: crypto.randomUUID(),
        email,
        full_name: fullName,
        avatar_url: null,
        role,
        phone: phone || null,
        company_name: null,
        bio: null,
        verified: false,
        max_concurrent_services: 1,
        apply_buffers_to_all: false,
        global_buffer_before_minutes: 0,
        global_buffer_after_minutes: 0,
        rfc: null,
        clabe: null,
        bank_document_url: null,
        banking_status: 'not_submitted',
        banking_rejection_reason: null,
        commission_rate: 0.12,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setUser(newUser);
      localStorage.setItem('vivelo-mock-role', role);
      return;
    }

    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role, phone: phone || null } },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    if (isMockMode) {
      setUser(null);
      localStorage.removeItem('vivelo-mock-role');
      return;
    }

    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const switchMockUser = useCallback((role: UserRole) => {
    const mockUser = mockUsers.find(u => u.role === role);
    if (mockUser) {
      setUser(mockUser);
      localStorage.setItem('vivelo-mock-role', role);
    }
  }, []);

  const updateUser = useCallback((updates: Partial<Profile>) => {
    setUser(prev => prev ? { ...prev, ...updates } : prev);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, switchMockUser, updateUser, isMockMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
