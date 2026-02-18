'use client';

import { useState, useEffect } from 'react';
import { getAllProfiles } from '@/lib/supabase/queries';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { Profile } from '@/types/database';

const roleTabs = ['all', 'client', 'provider', 'admin'] as const;
const roleLabels: Record<string, string> = { all: 'Todos', client: 'Clientes', provider: 'Proveedores', admin: 'Admins' };
const roleColors: Record<string, string> = { client: 'bg-blue-100 text-blue-800', provider: 'bg-green-100 text-green-800', admin: 'bg-purple-100 text-purple-800' };

export default function AdminUsuariosPage() {
  const [tab, setTab] = useState('all');
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllProfiles().then(setUsers).finally(() => setLoading(false));
  }, []);

  const filtered = tab === 'all' ? users : users.filter((u) => u.role === tab);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gestion de Usuarios</h1>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>{roleTabs.map((r) => <TabsTrigger key={r} value={r}>{roleLabels[r]}</TabsTrigger>)}</TabsList>
        <TabsContent value={tab} className="mt-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Verificado</TableHead>
                  <TableHead>Registro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell><Badge className={roleColors[u.role]}>{u.role}</Badge></TableCell>
                    <TableCell>{u.verified ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-400" />}</TableCell>
                    <TableCell>{new Date(u.created_at).toLocaleDateString('es-PR')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
