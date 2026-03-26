'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signOut, isMockMode } = useAuth();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');

  // Recovery mode state
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const profile = await signIn(email, password);

      if (profile?.role === 'admin') {
        await signOut();
        setError('Los administradores deben acceder desde admin.solovivelo.com');
        setLoading(false);
        return;
      }

      if (profile?.must_change_password) {
        const perfilPath = profile.role === 'provider'
          ? '/dashboard/proveedor/perfil?cambiar=1'
          : '/dashboard/cliente/perfil?cambiar=1';
        window.location.href = perfilPath;
        return;
      }

      window.location.href = redirectTo || '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoveryLoading(true);

    try {
      const res = await fetch('/api/auth/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al procesar la solicitud');

      setRecoverySent(true);
    } catch (err) {
      setRecoveryError(err instanceof Error ? err.message : 'Error al procesar la solicitud');
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Recovery success screen
  if (recoverySent) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Correo enviado</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Si el correo <strong>{recoveryEmail}</strong> esta registrado, recibiras una contrasena temporal.
              </p>
            </div>
            <Button
              variant="ghost"
              className="text-primary hover:text-primary/80"
              onClick={() => { setRecoveryMode(false); setRecoverySent(false); setRecoveryEmail(''); }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Iniciar Sesion
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Recovery form
  if (recoveryMode) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Recuperar contrasena</CardTitle>
          <CardDescription>Ingresa tu correo y te enviaremos una contrasena temporal.</CardDescription>
        </CardHeader>
        <form onSubmit={handleRecovery}>
          <CardContent className="space-y-4">
            {recoveryError && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {recoveryError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="recovery-email">Correo Electronico</Label>
              <Input
                id="recovery-email"
                type="email"
                placeholder="tu@email.com"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={recoveryLoading}>
              {recoveryLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Recuperar contrasena'
              )}
            </Button>
            <button
              type="button"
              className="flex items-center justify-center text-sm text-primary hover:underline"
              onClick={() => { setRecoveryMode(false); setRecoveryError(''); }}
            >
              <ArrowLeft className="mr-1 h-3 w-3" />
              Volver a Iniciar Sesion
            </button>
          </CardFooter>
        </form>
      </Card>
    );
  }

  // Login form
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-primary">Iniciar Sesion</CardTitle>
        <CardDescription>Ingresa tus credenciales para acceder a Vivelo</CardDescription>
        {isMockMode && (
          <p className="text-xs text-muted-foreground mt-2 bg-muted p-2 rounded">
            Modo demo: usa cualquier email para ingresar
          </p>
        )}
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Correo Electronico</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contrasena</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!isMockMode}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ingresando...
              </>
            ) : (
              'Iniciar Sesion'
            )}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => setRecoveryMode(true)}
            >
              ¿Olvidaste tu contrasena?
            </button>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
