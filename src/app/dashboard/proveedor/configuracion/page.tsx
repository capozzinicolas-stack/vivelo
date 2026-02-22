'use client';

import { useState, Suspense } from 'react';
import { useAuthContext } from '@/providers/auth-provider';
import { updateMaxConcurrentServices, updateProviderBufferConfig } from '@/lib/supabase/queries';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, Settings, Clock } from 'lucide-react';
import GoogleCalendarSettings from '@/components/google-calendar/google-calendar-settings';

export default function ProveedorConfiguracionPage() {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [maxConcurrent, setMaxConcurrent] = useState(
    user?.max_concurrent_services?.toString() || '1'
  );
  const [applyBuffersToAll, setApplyBuffersToAll] = useState(user?.apply_buffers_to_all || false);
  const [globalBufferBefore, setGlobalBufferBefore] = useState(
    (user?.global_buffer_before_minutes || 0).toString()
  );
  const [globalBufferAfter, setGlobalBufferAfter] = useState(
    (user?.global_buffer_after_minutes || 0).toString()
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
      await updateProviderBufferConfig(user.id, {
        apply_buffers_to_all: applyBuffersToAll,
        global_buffer_before_minutes: parseInt(globalBufferBefore) || 0,
        global_buffer_after_minutes: parseInt(globalBufferAfter) || 0,
      });
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Tiempos de Preparacion Globales
          </CardTitle>
          <CardDescription>
            Si esta activado, estos valores reemplazan los tiempos individuales de cada servicio en tu calendario.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="apply-all">Aplicar a todos mis servicios</Label>
            <Switch
              id="apply-all"
              checked={applyBuffersToAll}
              onCheckedChange={setApplyBuffersToAll}
            />
          </div>
          {applyBuffersToAll && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Minutos antes</Label>
                <Input
                  type="number"
                  min={0}
                  step={15}
                  value={globalBufferBefore}
                  onChange={(e) => setGlobalBufferBefore(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Minutos despues</Label>
                <Input
                  type="number"
                  min={0}
                  step={15}
                  value={globalBufferAfter}
                  onChange={(e) => setGlobalBufferAfter(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {user && (
        <Suspense fallback={<Card><CardContent className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></CardContent></Card>}>
          <GoogleCalendarSettings
            providerId={user.id}
            isMockMode={process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') ?? true}
          />
        </Suspense>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
        {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : 'Guardar Configuracion'}
      </Button>
    </div>
  );
}
