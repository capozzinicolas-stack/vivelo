'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Store, Gift } from 'lucide-react';
import Link from 'next/link';

export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('client');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const { signUp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');

  // Capture ?ref= param and store in localStorage
  useEffect(() => {
    const refParam = searchParams.get('ref');
    if (refParam) {
      setReferralCode(refParam);
      localStorage.setItem('vivelo-referral-code', refParam);
    } else {
      const stored = localStorage.getItem('vivelo-referral-code');
      if (stored) setReferralCode(stored);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length !== 10) {
      setError('El teléfono debe tener exactamente 10 dígitos');
      setLoading(false);
      return;
    }

    try {
      await signUp(email, password, fullName, role, digitsOnly);

      // Apply referral code after successful signup
      const storedRef = localStorage.getItem('vivelo-referral-code');
      if (storedRef) {
        try {
          await fetch('/api/referrals/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: storedRef, referredUserId: email }),
          });
          localStorage.removeItem('vivelo-referral-code');
        } catch {
          // Non-blocking: referral apply failure shouldn't block registration
        }
      }

      router.push(redirectTo || '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-primary">Crear Cuenta</CardTitle>
        <CardDescription>Únete a Vivelo y comienza a planificar eventos increíbles</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}
          {referralCode && (
            <div className="flex items-center gap-2 bg-green-50 text-green-700 text-sm p-3 rounded-md">
              <Gift className="h-4 w-4" />
              Codigo de referido activo: <Badge variant="secondary" className="font-mono">{referralCode}</Badge>
            </div>
          )}
          <div className="space-y-2">
            <Label>Tipo de Cuenta</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('client')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                  role === 'client'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Users className="h-6 w-6" />
                <span className="text-sm font-medium">Cliente</span>
                <span className="text-xs text-muted-foreground">Busco servicios</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('provider')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                  role === 'provider'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Store className="h-6 w-6" />
                <span className="text-sm font-medium">Proveedor</span>
                <span className="text-xs text-muted-foreground">Ofrezco servicios</span>
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Nombre Completo</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Tu nombre"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono (10 dígitos)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="5512345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              maxLength={15}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo Electrónico</Label>
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
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </Button>
          <p className="text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <Link href={`/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`} className="text-primary hover:underline font-medium">
              Inicia sesión
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
