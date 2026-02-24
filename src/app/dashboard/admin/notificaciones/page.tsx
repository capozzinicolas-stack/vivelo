'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, Bell, Star, Megaphone, Info } from 'lucide-react';
import type { Notification, Profile, NotificationType } from '@/types/database';
import { NOTIFICATION_TYPE_LABELS } from '@/lib/constants';
import { getAllProfiles, createNotification } from '@/lib/supabase/queries';
import { mockNotifications } from '@/data/mock-notifications';

const typeIcons: Record<string, React.ElementType> = {
  featured_placement: Star,
  campaign_enrollment: Megaphone,
  campaign_available: Megaphone,
  system: Info,
};

export default function AdminNotificacionesPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [providers, setProviders] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [recipientId, setRecipientId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const profiles = await getAllProfiles();
      setProviders(profiles.filter(p => p.role === 'provider'));
      // In mock mode, show all notifications for admin view
      setNotifications([...mockNotifications].sort((a, b) => b.created_at.localeCompare(a.created_at)));
    } catch (err) {
      console.error('Error loading data:', err);
    }
    setLoading(false);
  }

  async function handleSend() {
    if (!recipientId || !title || !message) return;
    try {
      const notif = await createNotification({
        recipient_id: recipientId,
        type: 'system' as NotificationType,
        title,
        message,
        link: link || undefined,
      });
      setNotifications(prev => [notif, ...prev]);
      setDialogOpen(false);
      setRecipientId('');
      setTitle('');
      setMessage('');
      setLink('');
    } catch (err) {
      console.error('Error sending notification:', err);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notificaciones</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Send className="h-4 w-4 mr-2" />Enviar Notificacion</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Enviar Notificacion</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Destinatario</Label>
                <Select value={recipientId} onValueChange={setRecipientId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
                  <SelectContent>
                    {providers.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name} ({p.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Titulo</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titulo de la notificacion" />
              </div>
              <div>
                <Label>Mensaje</Label>
                <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="Mensaje..." />
              </div>
              <div>
                <Label>Link (opcional)</Label>
                <Input value={link} onChange={e => setLink(e.target.value)} placeholder="/dashboard/proveedor/..." />
              </div>
              <Button onClick={handleSend} className="w-full">Enviar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historial de Notificaciones</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Titulo</TableHead>
                <TableHead>Mensaje</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sin notificaciones</TableCell></TableRow>
              ) : notifications.map(n => {
                const Icon = typeIcons[n.type] || Bell;
                return (
                  <TableRow key={n.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span className="text-sm">{NOTIFICATION_TYPE_LABELS[n.type]}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{n.title}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{n.message}</TableCell>
                    <TableCell>
                      <Badge variant={n.read ? 'secondary' : 'default'}>{n.read ? 'Leida' : 'No leida'}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{new Date(n.created_at).toLocaleString('es-MX')}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
