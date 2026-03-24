'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';

const ERROR_MESSAGES: Record<string, string> = {
  otp_expired: 'El enlace ha expirado. Solicita uno nuevo desde el panel de administracion.',
  access_denied: 'El enlace es invalido o ha expirado.',
};

function parseHashParams(hash: string): Record<string, string> {
  const params: Record<string, string> = {};
  const stripped = hash.startsWith('#') ? hash.slice(1) : hash;
  for (const part of stripped.split('&')) {
    const [key, ...rest] = part.split('=');
    if (key) params[key] = decodeURIComponent(rest.join('='));
  }
  return params;
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const [hashError, setHashError] = useState('');

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) {
      setReady(true);
      return;
    }

    const params = parseHashParams(hash);

    // Handle error from Supabase redirect
    if (params.error) {
      const code = params.error_code || params.error;
      setHashError(ERROR_MESSAGES[code] || params.error_description?.replace(/\+/g, ' ') || 'Enlace invalido.');
      return;
    }

    // If hash contains tokens, Supabase client auto-detects and sets session.
    // Listen for PASSWORD_RECOVERY event to confirm session is ready.
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
        // Clean hash from URL
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    // Fallback: if session is already set (e.g. page reload), enable form
    const timeout = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setReady(true);
    }, 2000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la contrasena');
    } finally {
      setLoading(false);
    }
  };

  // Error from hash (expired link, etc.)
  if (hashError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="text-2xl font-bold">Enlace invalido</CardTitle>
            <CardDescription>{hashError}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" asChild>
              <Link href="/login">Volver a Iniciar Sesion</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">Contrasena actualizada</CardTitle>
            <CardDescription>Tu contrasena ha sido cambiada exitosamente.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" onClick={() => { window.location.href = '/login'; }}>
              Ir a Iniciar Sesion
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Waiting for session to be ready
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">Verificando enlace...</CardTitle>
            <CardDescription>Espera un momento mientras verificamos tu enlace.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Password form
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Nueva Contrasena</CardTitle>
          <CardDescription>Ingresa tu nueva contrasena para tu cuenta de Vivelo</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Nueva contrasena</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar contrasena</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Actualizando...' : 'Establecer contrasena'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
