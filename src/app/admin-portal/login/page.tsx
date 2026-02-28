'use client';

import Image from 'next/image';
import { AdminLoginForm } from '@/components/admin/admin-login-form';

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left panel - Brand */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-violet-600 via-purple-600 to-pink-500 relative overflow-hidden">
        {/* Decorative dots pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16">
          <div className="mb-8">
            <Image
              src="/logo-vivelo.png"
              alt="Vivelo"
              width={160}
              height={48}
              className="h-12 w-auto brightness-0 invert"
            />
          </div>
          <h1 className="text-3xl xl:text-4xl font-bold text-white mb-4">
            Panel de Administracion
          </h1>
          <p className="text-lg text-white/80 leading-relaxed max-w-md">
            Gestiona servicios, proveedores, reservas y mas desde un solo lugar.
          </p>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-20 bg-white">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <Image
            src="/logo-vivelo.png"
            alt="Vivelo"
            width={120}
            height={36}
            className="h-9 w-auto"
          />
        </div>

        <div className="w-full max-w-sm mx-auto lg:mx-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Bienvenido de vuelta
          </h2>
          <p className="text-gray-500 mb-8">
            Ingresa tus credenciales para acceder al panel
          </p>

          <AdminLoginForm />
        </div>
      </div>
    </div>
  );
}
