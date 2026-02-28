'use client';

import { useState, useEffect } from 'react';
import { getAllProfiles, updateProfileVerified, updateProfileRole } from '@/lib/supabase/queries';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { CheckCircle, XCircle, Loader2, ShieldCheck } from 'lucide-react';
import type { Profile, UserRole } from '@/types/database';

const PAGE_SIZE = 20;

const roleTabs = ['all', 'client', 'provider', 'admin'] as const;
const roleLabels: Record<string, string> = { all: 'Todos', client: 'Clientes', provider: 'Proveedores', admin: 'Admins' };

export default function AdminUsuariosPage() {
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    getAllProfiles().then(setUsers).finally(() => setLoading(false));
  }, []);

  useEffect(() => { setPage(1); }, [tab]);

  const filtered = tab === 'all' ? users : users.filter((u) => u.role === tab);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleVerify = async (id: string, verified: boolean) => {
    try {
      await updateProfileVerified(id, verified);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, verified } : u));
      toast({ title: verified ? 'Usuario verificado' : 'Verificacion removida' });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleRoleChange = async (id: string, role: UserRole) => {
    try {
      await updateProfileRole(id, role);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
      toast({ title: `Rol cambiado a ${role}` });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" role="status" aria-label="Cargando usuarios" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestion de Usuarios</h1>
        <p className="text-sm text-muted-foreground">{users.length} usuarios registrados</p>
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
                  <TableHead>Verificado</TableHead>
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
                    <TableCell>
                      <Button size="sm" variant="outline" className="h-7" aria-label={u.verified ? 'Quitar verificacion de usuario' : 'Verificar usuario'} onClick={() => handleVerify(u.id, !u.verified)}>
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        {u.verified ? 'Quitar' : 'Verificar'}
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
    </div>
  );
}
