'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Iniciar Sesion</CardTitle>
          <CardDescription>Ingresa tus credenciales para acceder a tu cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <p className="text-center text-sm text-muted-foreground mt-6">
            No tienes cuenta?{' '}
            <Link href="/register" className="text-violet-600 font-medium hover:underline">Registrate</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
