'use client';

import { useState, useEffect, useMemo } from 'react';
import { getProvidersWithCommission, getCategoryCommissionRates } from '@/lib/supabase/queries';
import { calculateWeightedAvgCommission } from '@/lib/commission';
import { COMMISSION_RATE } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Loader2, CheckCircle, Search } from 'lucide-react';
import type { Profile } from '@/types/database';

const PAGE_SIZE = 20;

type ProviderRow = Profile & { service_count: number; services_by_category: Record<string, number> };

export default function AdminProveedoresPage() {
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [categoryRates, setCategoryRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([getProvidersWithCommission(), getCategoryCommissionRates()]).then(([p, rates]) => {
      setProviders(p);
      setCategoryRates(rates);
    }).finally(() => setLoading(false));
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

  // Compute weighted avg for each provider
  const providerAvgRates = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of providers) {
      const services = Object.entries(p.services_by_category).flatMap(([cat, count]) =>
        Array.from({ length: count }, () => ({ category: cat }))
      );
      map[p.id] = calculateWeightedAvgCommission(services, categoryRates);
    }
    return map;
  }, [providers, categoryRates]);

  // Global weighted avg across all providers
  const globalWeightedAvg = useMemo(() => {
    const allServices = providers.flatMap(p =>
      Object.entries(p.services_by_category).flatMap(([cat, count]) =>
        Array.from({ length: count }, () => ({ category: cat }))
      )
    );
    return calculateWeightedAvgCommission(allServices, categoryRates);
  }, [providers, categoryRates]);

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
          <CardContent><p className="text-2xl font-bold">{(globalWeightedAvg * 100).toFixed(1)}%</p></CardContent>
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
              <TableHead>Comision Prom.</TableHead>
              <TableHead>Verificado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No se encontraron proveedores
                </TableCell>
              </TableRow>
            ) : (
              paged.map((p) => {
                const avgRate = providerAvgRates[p.id] ?? COMMISSION_RATE;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name}</TableCell>
                    <TableCell>{p.email}</TableCell>
                    <TableCell className="hidden md:table-cell">{p.company_name || '-'}</TableCell>
                    <TableCell>{p.service_count}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{(avgRate * 100).toFixed(1)}%</Badge>
                    </TableCell>
                    <TableCell>
                      {p.verified
                        ? <CheckCircle className="h-4 w-4 text-green-500" />
                        : <span className="text-xs text-muted-foreground">No</span>}
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
    </div>
  );
}
