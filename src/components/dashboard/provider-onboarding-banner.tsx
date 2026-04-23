'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getProviderOnboardingStatus } from '@/lib/provider-onboarding';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, X, Building2, Landmark } from 'lucide-react';
import type { Profile } from '@/types/database';

export function ProviderOnboardingBanner({ profile }: { profile: Profile }) {
  const [dismissed, setDismissed] = useState(false);
  const status = getProviderOnboardingStatus(profile);

  if (status.complete && status.bankingStatus !== 'rejected') return null;
  if (dismissed) return null;

  // Banking rejected — show red banner
  if (status.bankingStatus === 'rejected') {
    return (
      <div className="mx-6 mt-6 lg:mx-8 lg:mt-8 mb-0 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-800">Tus datos bancarios fueron rechazados</p>
          <p className="text-sm text-red-700 mt-1">
            {profile.banking_rejection_reason || 'Contacta a soporte para mas informacion.'}
          </p>
          <Button asChild size="sm" variant="outline" className="mt-2 border-red-300 text-red-700 hover:bg-red-100">
            <Link href="/dashboard/proveedor/perfil#datos-bancarios">Actualizar datos</Link>
          </Button>
        </div>
        <button onClick={() => setDismissed(true)} className="text-red-400 hover:text-red-600">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Profile incomplete — show amber banner with checklist
  return (
    <div className="mx-6 mt-6 lg:mx-8 lg:mt-8 mb-0 p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-800">Completa tu perfil para empezar a recibir reservas</p>
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            {status.missingSteps.companyInfo ? (
              <>
                <Building2 className="h-4 w-4 text-amber-600" />
                <span className="text-amber-800">Completa los datos de tu empresa para que tus clientes te conozcan</span>
                <Button asChild size="sm" variant="link" className="h-auto p-0 text-amber-700 font-medium">
                  <Link href="/dashboard/proveedor/perfil">Completar</Link>
                </Button>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-green-800">Datos de empresa completos</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            {status.missingSteps.bankingInfo ? (
              <>
                <Landmark className="h-4 w-4 text-amber-600" />
                <span className="text-amber-800">Agrega tus datos bancarios para poder recibir pagos</span>
                <Button asChild size="sm" variant="link" className="h-auto p-0 text-amber-700 font-medium">
                  <Link href="/dashboard/proveedor/perfil#datos-bancarios">Agregar</Link>
                </Button>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-green-800">Datos bancarios completos</span>
              </>
            )}
          </div>
        </div>
      </div>
      <button onClick={() => setDismissed(true)} className="text-amber-400 hover:text-amber-600">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
