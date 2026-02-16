'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RegisterForm } from '@/components/auth/register-form';

export default function RegisterPage() {
  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Crear Cuenta</CardTitle>
          <CardDescription>Registrate para empezar a reservar servicios</CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
          <p className="text-center text-sm text-muted-foreground mt-6">
            Ya tienes cuenta?{' '}
            <Link href="/login" className="text-violet-600 font-medium hover:underline">Inicia Sesion</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
