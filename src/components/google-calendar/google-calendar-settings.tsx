'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, RefreshCw, Unlink, ExternalLink } from 'lucide-react';

interface GoogleCalendarSettingsProps {
  providerId: string;
  isMockMode: boolean;
}

interface ConnectionStatus {
  connected: boolean;
  mock?: boolean;
  email?: string;
  lastSync?: string;
  syncStatus?: string;
  syncError?: string;
}

export default function GoogleCalendarSettings({ providerId, isMockMode }: GoogleCalendarSettingsProps) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Show toast from callback redirect
  useEffect(() => {
    const googleParam = searchParams.get('google');
    if (googleParam === 'connected') {
      toast({ title: 'Google Calendar conectado exitosamente' });
    } else if (googleParam === 'error') {
      toast({ title: 'Error al conectar Google Calendar', variant: 'destructive' });
    }
  }, [searchParams, toast]);

  // Fetch connection status
  useEffect(() => {
    if (isMockMode) {
      setStatus({ connected: true, mock: true, email: 'carlos.rivera@gmail.com', lastSync: new Date().toISOString(), syncStatus: 'active' });
      setLoading(false);
      return;
    }

    fetch(`/api/google-calendar/status?providerId=${providerId}`)
      .then(res => res.json())
      .then(data => setStatus(data))
      .catch(() => setStatus({ connected: false }))
      .finally(() => setLoading(false));
  }, [providerId, isMockMode]);

  const handleConnect = () => {
    window.location.href = `/api/google-calendar/auth?providerId=${providerId}`;
  };

  const handleSync = async () => {
    if (isMockMode) {
      toast({ title: 'Sincronizacion simulada (mock mode)' });
      return;
    }
    setSyncing(true);
    try {
      const res = await fetch('/api/google-calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: `Sincronizado: ${data.synced} eventos importados, ${data.deleted} eliminados` });
        setStatus(prev => prev ? { ...prev, lastSync: new Date().toISOString(), syncStatus: 'active', syncError: undefined } : prev);
      } else {
        toast({ title: 'Error al sincronizar', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error al sincronizar', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (isMockMode) {
      setStatus({ connected: false });
      toast({ title: 'Google Calendar desconectado (mock mode)' });
      return;
    }
    setDisconnecting(true);
    try {
      const res = await fetch('/api/google-calendar/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus({ connected: false });
        toast({ title: 'Google Calendar desconectado' });
      } else {
        toast({ title: 'Error al desconectar', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error al desconectar', variant: 'destructive' });
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar
        </CardTitle>
        <CardDescription>
          Sincroniza tus eventos de Google Calendar con Vivelo para evitar reservas duplicadas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.connected ? (
          <>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Conectado
              </Badge>
              {status.syncStatus === 'error' && (
                <Badge variant="destructive">Error de sync</Badge>
              )}
            </div>

            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Cuenta:</span> {status.email}</p>
              {status.lastSync && (
                <p><span className="font-medium">Ultima sincronizacion:</span>{' '}
                  {new Date(status.lastSync).toLocaleString('es-MX')}
                </p>
              )}
            </div>

            {status.syncError && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
                <p className="font-medium">Error:</p>
                <p>{status.syncError}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
                {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Sincronizar Ahora
              </Button>
              <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={disconnecting}>
                {disconnecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Unlink className="h-4 w-4 mr-2" />}
                Desconectar
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Conecta tu Google Calendar para importar automaticamente tus eventos como bloqueos y enviar tus reservas confirmadas a tu calendario.
            </p>
            <Button onClick={handleConnect}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Conectar Google Calendar
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
