'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);
  const { signUp } = useAuth();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');

  // Auto-select role from ?role= param (e.g. from landing page)
  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'provider' || roleParam === 'client') {
      setRole(roleParam);
    }
  }, [searchParams]);

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

    if (role === 'provider' && !termsAccepted) {
      setError('Debes aceptar los Terminos y Condiciones para Proveedores');
      setLoading(false);
      return;
    }

    try {
      await signUp(email, password, fullName, role, digitsOnly);

      // Record terms acceptance for providers (non-blocking)
      if (role === 'provider') {
        try {
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            await fetch('/api/terms/accept', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: authUser.id,
                termsType: 'provider',
                termsVersion: '1.0',
                fullName,
                email,
              }),
            });
          }
        } catch {
          // Non-blocking: terms recording failure shouldn't block registration
        }
      }

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

      window.location.href = redirectTo || '/dashboard';
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

          {role === 'provider' && (
            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                className="mt-0.5"
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight">
                Acepto los{' '}
                <button
                  type="button"
                  onClick={() => setTermsDialogOpen(true)}
                  className="text-primary hover:underline font-medium"
                >
                  Terminos y Condiciones para Proveedores
                </button>
              </label>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading || (role === 'provider' && !termsAccepted)}>
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

      {/* Provider Terms Dialog */}
      <Dialog open={termsDialogOpen} onOpenChange={setTermsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Terminos y Condiciones para Proveedores</DialogTitle>
          </DialogHeader>
          <div className="h-[60vh] overflow-y-auto pr-4">
            <div className="space-y-6 text-sm leading-relaxed text-foreground">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                <p className="font-semibold text-amber-800">IMPORTANTE</p>
                <p className="text-amber-700 mt-1">Al registrarse como Proveedor en la plataforma Vivelo y marcar la casilla de aceptacion, usted manifiesta haber leido, comprendido y aceptado de manera expresa e incondicional los presentes Terminos.</p>
              </div>

              <div>
                <h3 className="font-bold text-deep-purple mb-1">1. Objeto</h3>
                <p>Los presentes Terminos establecen las reglas bajo las cuales el Proveedor publicara, ofrecera y prestara sus servicios a traves de la plataforma digital Vivelo (solovivelo.com), operada por VIVELO TECNOLOGIA EN EXPERIENCIAS S.A.S de C.V.</p>
              </div>

              <div>
                <h3 className="font-bold text-deep-purple mb-1">2. Alta y Registro</h3>
                <p>El Proveedor debera completar el formulario de registro con informacion veraz, proporcionar documentacion requerida (RFC, CLABE, identificacion), y aceptar estos Terminos. El registro esta sujeto a aprobacion de Vivelo.</p>
              </div>

              <div>
                <h3 className="font-bold text-deep-purple mb-1">3. Comisiones y Pagos</h3>
                <p>Vivelo retendra una comision base del 16% sobre cada transaccion (puede variar por categoria). El pago se liquida posterior a la prestacion del servicio y recepcion de factura. El Proveedor debera emitir CFDI dentro de 3 dias habiles.</p>
              </div>

              <div>
                <h3 className="font-bold text-deep-purple mb-1">4. Obligaciones del Proveedor</h3>
                <p>Prestar servicios con calidad y puntualidad, mantener disponibilidad actualizada, responder en maximo 4 horas habiles, cumplir con legislacion mexicana, no redirigir clientes fuera de la Plataforma.</p>
              </div>

              <div>
                <h3 className="font-bold text-deep-purple mb-1">5. Cancelaciones y Penalizaciones</h3>
                <p>Cancelaciones por el Proveedor: penalizacion del 10% (mas de 15 dias) al 100% (menos de 72 horas). Mas de 2 cancelaciones en 6 meses pueden causar baja.</p>
              </div>

              <div>
                <h3 className="font-bold text-deep-purple mb-1">6-14. Mas clausulas</h3>
                <p>Este es un resumen. Para leer los terminos completos, visita la pagina de{' '}
                  <Link href="/terminos-y-condiciones?tab=proveedores" target="_blank" className="text-primary hover:underline font-medium">
                    Terminos y Condiciones para Proveedores
                  </Link>.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-deep-purple mb-1">Aceptacion Digital</h3>
                <p>Vivelo registrara la fecha, hora e identificador de la aceptacion como evidencia legal del consentimiento otorgado, conforme a los articulos 89 a 94 del Codigo de Comercio de Mexico.</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Link href="/terminos-y-condiciones?tab=proveedores" target="_blank" className="text-sm text-primary hover:underline mr-auto self-center">
              Ver terminos completos
            </Link>
            <Button variant="outline" onClick={() => setTermsDialogOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={() => { setTermsAccepted(true); setTermsDialogOpen(false); }}>
              Acepto los Terminos
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
