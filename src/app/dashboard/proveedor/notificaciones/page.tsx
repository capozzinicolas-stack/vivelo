'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, Star, Megaphone, Info, CheckCheck } from 'lucide-react';
import type { Notification } from '@/types/database';
import { NOTIFICATION_TYPE_LABELS } from '@/lib/constants';
import { useAuthContext } from '@/providers/auth-provider';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/supabase/queries';

const typeIcons: Record<string, React.ElementType> = {
  featured_placement: Star,
  campaign_enrollment: Megaphone,
  campaign_available: Megaphone,
  system: Info,
};

export default function ProviderNotificacionesPage() {
  const { user } = useAuthContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotifications(user!.id);
      setNotifications(data);
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id, loadData]);

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead(user!.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Notificaciones</h1>
          {unreadCount > 0 && <Badge>{unreadCount} sin leer</Badge>}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllRead}>
            <CheckCheck className="h-4 w-4 mr-2" />Marcar todas como leidas
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No tienes notificaciones.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map(n => {
            const Icon = typeIcons[n.type] || Bell;
            return (
              <Card
                key={n.id}
                className={`cursor-pointer transition-colors ${!n.read ? 'border-primary/30 bg-primary/5' : ''}`}
                onClick={() => !n.read && handleMarkRead(n.id)}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div className={`mt-0.5 rounded-full p-2 ${!n.read ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`font-medium text-sm ${!n.read ? '' : 'text-muted-foreground'}`}>{n.title}</p>
                      <Badge variant="secondary" className="text-xs">{NOTIFICATION_TYPE_LABELS[n.type]}</Badge>
                      {!n.read && <Badge className="text-xs">Nueva</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString('es-MX')}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
