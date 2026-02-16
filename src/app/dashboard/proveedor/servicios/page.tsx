'use client';

import Link from 'next/link';
import { mockServices } from '@/data/mock-services';
import { categoryMap } from '@/data/categories';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Star } from 'lucide-react';

const statusLabels: Record<string, string> = { active: 'Activo', draft: 'Borrador', paused: 'Pausado', archived: 'Archivado' };
const statusColors: Record<string, string> = { active: 'bg-green-100 text-green-800', draft: 'bg-gray-100 text-gray-800', paused: 'bg-yellow-100 text-yellow-800', archived: 'bg-red-100 text-red-800' };

export default function ProveedorServiciosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis Servicios</h1>
        <Button asChild><Link href="/dashboard/proveedor/servicios/nuevo"><Plus className="h-4 w-4 mr-2" />Nuevo Servicio</Link></Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titulo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Rating</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockServices.map((s) => {
              const cat = categoryMap[s.category];
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell><Badge className={cat?.color} variant="secondary">{cat?.label}</Badge></TableCell>
                  <TableCell>${s.base_price.toLocaleString()} {s.price_unit}</TableCell>
                  <TableCell><Badge className={statusColors[s.status]}>{statusLabels[s.status]}</Badge></TableCell>
                  <TableCell><div className="flex items-center gap-1"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />{s.avg_rating}</div></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
