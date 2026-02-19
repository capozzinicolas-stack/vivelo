'use client';

import { useState } from 'react';
import { useAuthContext } from '@/providers/auth-provider';
import { updateMaxConcurrentServices } from '@/lib/supabase/queries';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Settings } from 'lucide-react';

export default function ProveedorConfiguracionPage() {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [maxConcurrent, setMaxConcurrent] = useState(
    user?.max_concurrent_services?.toString() || '1'
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    const value = parseInt(maxConcurrent) || 1;
    if (value < 1) {
      toast({ title: 'El valor minimo es 1', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await updateMaxConcurrentServices(user.id, value);
      toast({ title: 'Configuracion guardada!' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar la configuracion.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Configuracion</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Servicios Concurrentes
          </CardTitle>
          <CardDescription>
            Define cuantos servicios puedes atender al mismo tiempo. El sistema bloqueara nuevas reservas si ya alcanzaste el maximo en un horario.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Maximo de servicios simultaneos</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={maxConcurrent}
              onChange={(e) => setMaxConcurrent(e.target.value)}
              className="mt-1 max-w-[200px]"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Si ofreces multiples servicios (ej: catering + meseros), puedes aumentar este numero.
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : 'Guardar'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
