'use client';

import { useState, useEffect } from 'react';
import { getProvidersWithCommission, updateProviderCommissionRate } from '@/lib/supabase/queries';
import { COMMISSION_RATE } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Pencil, CheckCircle, Search } from 'lucide-react';
import type { Profile } from '@/types/database';

const PAGE_SIZE = 20;

type ProviderRow = Profile & { service_count: number };

export default function AdminProveedoresPage() {
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { toast } = useToast();

  // Edit dialog state
  const [editProvider, setEditProvider] = useState<ProviderRow | null>(null);
  const [editRate, setEditRate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProvidersWithCommission()
      .then(setProviders)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { setPage(1); }, [search]);

  const filtered = search
    ? providers.filter(p =>
        p.full_name.toLowerCase().includes(search.toLowerCase()) ||
        p.email.toLowerCase().includes(search.toLowerCase()) ||
        (p.company_name && p.company_name.toLowerCase().includes(search.toLowerCase()))
      )
    : providers;

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Weighted average commission: sum(rate * service_count) / sum(service_count)
  const totalServices = providers.reduce((s, p) => s + p.service_count, 0);
  const weightedAvg = totalServices > 0
    ? providers.reduce((s, p) => s + (p.commission_rate ?? COMMISSION_RATE) * p.service_count, 0) / totalServices
    : COMMISSION_RATE;

  const openEdit = (provider: ProviderRow) => {
    setEditProvider(provider);
    setEditRate(((provider.commission_rate ?? COMMISSION_RATE) * 100).toFixed(2));
  };

  const handleSave = async () => {
    if (!editProvider) return;
    const rateNum = parseFloat(editRate);
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
      toast({ title: 'La comision debe estar entre 0% y 100%', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const rateDecimal = rateNum / 100;
      await updateProviderCommissionRate(editProvider.id, rateDecimal);
      setProviders(prev =>
        prev.map(p => p.id === editProvider.id ? { ...p, commission_rate: rateDecimal } : p)
      );
      toast({ title: `Comision de ${editProvider.full_name} actualizada a ${rateNum}%` });
      setEditProvider(null);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Error actualizando', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin" role="status" aria-label="Cargando proveedores" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestion de Proveedores</h1>
        <p className="text-sm text-muted-foreground">{providers.length} proveedores registrados</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Proveedores</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{providers.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Comision Promedio Ponderada</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{(weightedAvg * 100).toFixed(1)}%</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Comision Base (Default)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{(COMMISSION_RATE * 100).toFixed(0)}%</p></CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar proveedor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead>Proveedor</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="hidden md:table-cell">Empresa</TableHead>
              <TableHead>Servicios</TableHead>
              <TableHead>Comision</TableHead>
              <TableHead>Verificado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No se encontraron proveedores
                </TableCell>
              </TableRow>
            ) : (
              paged.map((p) => {
                const rate = p.commission_rate ?? COMMISSION_RATE;
                const isCustom = Math.abs(rate - COMMISSION_RATE) > 0.0001;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name}</TableCell>
                    <TableCell>{p.email}</TableCell>
                    <TableCell className="hidden md:table-cell">{p.company_name || '-'}</TableCell>
                    <TableCell>{p.service_count}</TableCell>
                    <TableCell>
                      <span className={isCustom ? 'font-semibold text-primary' : ''}>
                        {(rate * 100).toFixed(1)}%
                      </span>
                      {isCustom && (
                        <Badge variant="outline" className="ml-2 text-xs">Personalizada</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {p.verified
                        ? <CheckCircle className="h-4 w-4 text-green-500" />
                        : <span className="text-xs text-muted-foreground">No</span>}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7"
                        onClick={() => openEdit(p)}
                        aria-label={`Editar comision de ${p.full_name}`}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationControls
        currentPage={page}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      {/* Edit Commission Dialog */}
      <Dialog open={!!editProvider} onOpenChange={(open) => !open && setEditProvider(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Comision</DialogTitle>
          </DialogHeader>
          {editProvider && (
            <div className="space-y-4 py-2">
              <div>
                <p className="font-medium">{editProvider.full_name}</p>
                <p className="text-sm text-muted-foreground">{editProvider.email}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="commission-rate">Tasa de Comision (%)</Label>
                <Input
                  id="commission-rate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={editRate}
                  onChange={(e) => setEditRate(e.target.value)}
                  placeholder="12.00"
                />
                <p className="text-xs text-muted-foreground">
                  Comision base: {(COMMISSION_RATE * 100).toFixed(0)}%. Ingresa un valor entre 0% y 100%.
                </p>
              </div>
              {editRate && !isNaN(parseFloat(editRate)) && (
                <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                  <p><span className="text-muted-foreground">Ejemplo:</span> En una reserva de $10,000 MXN</p>
                  <p>Comision Vivelo: <span className="font-medium">${(10000 * parseFloat(editRate) / 100).toLocaleString()} MXN</span></p>
                  <p>Pago al proveedor: <span className="font-medium">${(10000 - 10000 * parseFloat(editRate) / 100).toLocaleString()} MXN</span></p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProvider(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
