'use client';

import { useState } from 'react';
import { mockServices } from '@/data/mock-services';
import { categoryMap } from '@/data/categories';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Star, Pause, CheckCircle, Archive } from 'lucide-react';

const statusTabs = ['all', 'active', 'draft', 'paused'] as const;
const tabLabels: Record<string, string> = { all: 'Todos', active: 'Activos', draft: 'Borrador', paused: 'Pausados' };
const statusColors: Record<string, string> = { active: 'bg-green-100 text-green-800', draft: 'bg-gray-100 text-gray-800', paused: 'bg-yellow-100 text-yellow-800', archived: 'bg-red-100 text-red-800' };

export default function AdminServiciosPage() {
  const [tab, setTab] = useState('all');
  const { toast } = useToast();
  const filtered = tab === 'all' ? mockServices : mockServices.filter((s) => s.status === tab);

  const handleAction = (action: string, title: string) => {
    toast({ title: `Servicio ${action}`, description: `"${title}" ha sido ${action.toLowerCase()}.` });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Moderacion de Servicios</h1>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>{statusTabs.map((s) => <TabsTrigger key={s} value={s}>{tabLabels[s]}</TabsTrigger>)}</TabsList>
        <TabsContent value={tab} className="mt-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titulo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const cat = categoryMap[s.category];
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.title}</TableCell>
                      <TableCell><Badge className={cat?.color} variant="secondary">{cat?.label}</Badge></TableCell>
                      <TableCell><Badge className={statusColors[s.status]}>{s.status}</Badge></TableCell>
                      <TableCell><div className="flex items-center gap-1"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />{s.avg_rating}</div></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7" onClick={() => handleAction('Aprobado', s.title)}><CheckCircle className="h-3 w-3 text-green-600" /></Button>
                          <Button size="sm" variant="ghost" className="h-7" onClick={() => handleAction('Pausado', s.title)}><Pause className="h-3 w-3 text-yellow-600" /></Button>
                          <Button size="sm" variant="ghost" className="h-7" onClick={() => handleAction('Archivado', s.title)}><Archive className="h-3 w-3 text-red-600" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
