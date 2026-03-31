'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { CheckCircle, XCircle, Loader2, KeyRound, UserPlus, Pause, Play, Trash2, AlertTriangle, Copy, Lock } from 'lucide-react';
import type { Profile, UserRole } from '@/types/database';

const PAGE_SIZE = 20;

const roleTabs = ['all', 'client', 'provider', 'admin'] as const;
const roleLabels: Record<string, string> = { all: 'Todos', client: 'Clientes', provider: 'Proveedores', admin: 'Admins' };

export default function AdminUsuariosPage() {
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  // Invite admin dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Temp password dialog state
  const [tempPasswordTarget, setTempPasswordTarget] = useState<Profile | null>(null);
  const [generatingPassword, setGeneratingPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, verified, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[AdminUsuarios] Supabase query error:', error);
        toast({ title: 'Error al cargar usuarios', description: error.message, variant: 'destructive' });
        return;
      }

      setUsers((data || []) as unknown as Profile[]);
    } catch (err) {
      console.error('[AdminUsuarios] Exception:', err);
      toast({ title: 'Error al cargar usuarios', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { setPage(1); }, [tab]);

  const filtered = tab === 'all' ? users : users.filter((u) => u.role === tab);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleVerify = async (id: string, verified: boolean) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('profiles').update({ verified }).eq('id', id);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === id ? { ...u, verified } : u));
      toast({ title: verified ? 'Usuario activado' : 'Usuario pausado' });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleResetPassword = async (id: string, email: string) => {
    setResettingId(id);
    try {
      const res = await fetch('/api/admin/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al enviar enlace');
      }
      toast({ title: `Enlace de restablecimiento enviado a ${email}` });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error al enviar enlace', variant: 'destructive' });
    } finally {
      setResettingId(null);
    }
  };

  const handleRoleChange = async (id: string, role: UserRole) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
      toast({ title: `Rol cambiado a ${role}` });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleInviteAdmin = async () => {
    if (!inviteEmail || !inviteName) return;
    setInviting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, full_name: inviteName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al invitar admin');
      toast({ title: `Invitacion enviada a ${inviteEmail}` });
      setInviteOpen(false);
      setInviteEmail('');
      setInviteName('');
      setLoading(true);
      loadUsers();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error al invitar', variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al borrar usuario');
      toast({ title: `Usuario ${deleteTarget.full_name} eliminado` });
      setDeleteTarget(null);
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error al borrar', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const handleGenerateTempPassword = async () => {
    if (!tempPasswordTarget) return;
    setGeneratingPassword(true);
    try {
      const res = await fetch('/api/admin/users/temp-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: tempPasswordTarget.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al generar contrasena');
      setGeneratedPassword(data.tempPassword);
      toast({ title: 'Contrasena temporal generada' });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error al generar', variant: 'destructive' });
    } finally {
      setGeneratingPassword(false);
    }
  };

  const handleCopyPassword = async () => {
    if (!generatedPassword) return;
    await navigator.clipboard.writeText(generatedPassword);
    toast({ title: 'Contrasena copiada al portapapeles' });
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" role="status" aria-label="Cargando usuarios" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestion de Usuarios</h1>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">{users.length} usuarios registrados</p>
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1" />
            Invitar Admin
          </Button>
        </div>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>{roleTabs.map((r) => <TabsTrigger key={r} value={r}>{roleLabels[r]}</TabsTrigger>)}</TabsList>
        <TabsContent value={tab} className="mt-4">
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden md:table-cell">Registro</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No hay usuarios</TableCell></TableRow>
                ) : paged.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Select value={u.role} onValueChange={(v) => handleRoleChange(u.id, v as UserRole)}>
                        <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="client">Cliente</SelectItem>
                          <SelectItem value="provider">Proveedor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {u.verified
                        ? <CheckCircle className="h-4 w-4 text-green-500" />
                        : <XCircle className="h-4 w-4 text-red-400" />}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{new Date(u.created_at).toLocaleDateString('es-MX')}</TableCell>
                    <TableCell className="space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7"
                        aria-label={u.verified ? 'Pausar usuario' : 'Activar usuario'}
                        onClick={() => handleVerify(u.id, !u.verified)}
                      >
                        {u.verified
                          ? <><Pause className="h-3 w-3 mr-1" />Pausar</>
                          : <><Play className="h-3 w-3 mr-1" />Activar</>}
                      </Button>
                      <Button size="sm" variant="outline" className="h-7" aria-label="Restablecer contrasena" disabled={resettingId === u.id} onClick={() => handleResetPassword(u.id, u.email)}>
                        {resettingId === u.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <KeyRound className="h-3 w-3 mr-1" />}
                        Restablecer
                      </Button>
                      <Button size="sm" variant="outline" className="h-7" aria-label="Generar contrasena temporal" onClick={() => { setTempPasswordTarget(u); setGeneratedPassword(null); }}>
                        <Lock className="h-3 w-3 mr-1" />
                        Temp Pass
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                        aria-label="Borrar usuario"
                        disabled={u.id === currentUser?.id}
                        onClick={() => setDeleteTarget(u)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Borrar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls currentPage={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </TabsContent>
      </Tabs>

      {/* Invite Admin Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar Admin</DialogTitle>
            <DialogDescription>
              Se creara una cuenta con rol admin y se enviara un enlace para establecer contrasena.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="invite-name">Nombre completo</Label>
              <Input
                id="invite-name"
                placeholder="Juan Perez"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="admin@ejemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={inviting}>
              Cancelar
            </Button>
            <Button onClick={handleInviteAdmin} disabled={inviting || !inviteEmail || !inviteName}>
              {inviting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
              Invitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Borrar usuario
            </DialogTitle>
            <DialogDescription>
              Borrar permanentemente a <strong>{deleteTarget?.full_name}</strong> ({deleteTarget?.email})? Esta accion no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Borrar permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Temp Password Dialog */}
      <Dialog open={!!tempPasswordTarget} onOpenChange={(open) => { if (!open) { setTempPasswordTarget(null); setGeneratedPassword(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-500" />
              Generar contrasena temporal
            </DialogTitle>
            <DialogDescription>
              {generatedPassword
                ? <>Contrasena generada para <strong>{tempPasswordTarget?.full_name}</strong>. El usuario debera cambiarla al iniciar sesion.</>
                : <>Se generara una contrasena temporal para <strong>{tempPasswordTarget?.full_name}</strong> ({tempPasswordTarget?.email}). La contrasena actual sera reemplazada.</>
              }
            </DialogDescription>
          </DialogHeader>

          {generatedPassword ? (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <code className="flex-1 text-lg font-mono font-bold text-center select-all">{generatedPassword}</code>
                <Button size="sm" variant="ghost" aria-label="Copiar contrasena" onClick={handleCopyPassword}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Copia esta contrasena y compartela con el usuario. No se mostrara de nuevo.
              </p>
            </div>
          ) : null}

          <DialogFooter>
            {generatedPassword ? (
              <Button onClick={() => { setTempPasswordTarget(null); setGeneratedPassword(null); }}>
                Cerrar
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setTempPasswordTarget(null)} disabled={generatingPassword}>
                  Cancelar
                </Button>
                <Button onClick={handleGenerateTempPassword} disabled={generatingPassword}>
                  {generatingPassword ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <KeyRound className="h-4 w-4 mr-1" />}
                  Generar contrasena
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
