'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';

export function AdminLoginForm() {
  const router = useRouter();
  const { signIn, signOut } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

      if (!profile || profile.role !== 'admin') {
        await signOut();
        setError('No tienes permisos de administrador');
        setLoading(false);
        return;
      }

      // Check if admin must change password
      if (profile.must_change_password) {
        router.push('/dashboard/perfil?cambiar=1');
      } else {
        router.push('/dashboard');
      }
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
      const res = await fetch('/api/admin/auth/recover', {
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
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <CheckCircle className="h-12 w-12 text-green-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Correo enviado</h3>
          <p className="text-sm text-gray-500 mt-2">
            Si el correo <strong>{recoveryEmail}</strong> esta registrado como administrador, recibiras una contrasena temporal.
          </p>
        </div>
        <Button
          variant="ghost"
          className="text-violet-600 hover:text-violet-700"
          onClick={() => { setRecoveryMode(false); setRecoverySent(false); setRecoveryEmail(''); }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Iniciar Sesion
        </Button>
      </div>
    );
  }

  // Recovery form
  if (recoveryMode) {
    return (
      <form onSubmit={handleRecovery} className="space-y-6">
        {recoveryError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {recoveryError}
          </div>
        )}

        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-gray-900">Recuperar contrasena</h3>
          <p className="text-sm text-gray-500">
            Ingresa tu correo y te enviaremos una contrasena temporal.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="recovery-email" className="text-sm font-medium text-gray-700">
            Correo electronico
          </Label>
          <Input
            id="recovery-email"
            type="email"
            placeholder="admin@vivelo.com"
            value={recoveryEmail}
            onChange={(e) => setRecoveryEmail(e.target.value)}
            required
            className="h-11"
            autoComplete="email"
          />
        </div>

        <Button
          type="submit"
          disabled={recoveryLoading}
          className="w-full h-11 bg-gradient-to-r from-violet-600 to-pink-500 hover:from-violet-700 hover:to-pink-600 text-white font-medium"
        >
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
          className="flex items-center justify-center w-full text-sm text-violet-600 hover:text-violet-700 hover:underline"
          onClick={() => { setRecoveryMode(false); setRecoveryError(''); }}
        >
          <ArrowLeft className="mr-1 h-3 w-3" />
          Volver a Iniciar Sesion
        </button>
      </form>
    );
  }

  // Login form
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-gray-700">
          Correo electronico
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="admin@vivelo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-11"
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-gray-700">
          Contrasena
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-11 pr-10"
            autoComplete="current-password"
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

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-11 bg-gradient-to-r from-violet-600 to-pink-500 hover:from-violet-700 hover:to-pink-600 text-white font-medium"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Iniciando sesion...
          </>
        ) : (
          'Iniciar Sesion'
        )}
      </Button>

      <p className="text-center text-sm text-gray-500">
        <button
          type="button"
          className="text-violet-600 hover:text-violet-700 hover:underline"
          onClick={() => setRecoveryMode(true)}
        >
          Olvidaste tu contrasena?
        </button>
      </p>
    </form>
  );
}
