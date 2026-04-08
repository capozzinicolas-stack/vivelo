'use client';

import { useState, useEffect, useMemo } from 'react';
import { getProvidersWithCommission, getCategoryCommissionRates, getProvidersPendingBanking, updateBankingStatus, createNotification } from '@/lib/supabase/queries';
import { calculateWeightedAvgCommission } from '@/lib/commission';
import { COMMISSION_RATE } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, Search, Landmark, XCircle, FileText, ExternalLink, LogIn } from 'lucide-react';
import { ExportButton } from '@/components/ui/export-button';
import type { ExportColumn } from '@/lib/export';
import type { Profile, BankingStatus } from '@/types/database';

const PAGE_SIZE = 20;

type ProviderRow = Profile & { service_count: number; services_by_category: Record<string, number> };

export default function AdminProveedoresPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState('providers');
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [categoryRates, setCategoryRates] = useState<Record<string, number>>({});
  const [pendingBanking, setPendingBanking] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      getProvidersWithCommission(),
      getCategoryCommissionRates(),
      getProvidersPendingBanking(),
    ]).then(([p, rates, pending]) => {
      setProviders(p);
      setCategoryRates(rates);
      setPendingBanking(pending);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { setPage(1); }, [search, tab]);

  const filtered = search
    ? providers.filter(p =>
        p.full_name.toLowerCase().includes(search.toLowerCase()) ||
        p.email.toLowerCase().includes(search.toLowerCase()) ||
        (p.company_name && p.company_name.toLowerCase().includes(search.toLowerCase()))
      )
    : providers;

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

  const globalWeightedAvg = useMemo(() => {
    const allServices = providers.flatMap(p =>
      Object.entries(p.services_by_category).flatMap(([cat, count]) =>
        Array.from({ length: count }, () => ({ category: cat }))
      )
    );
    return calculateWeightedAvgCommission(allServices, categoryRates);
  }, [providers, categoryRates]);

  const handleApproveBanking = async (p: Profile) => {
    try {
      await updateBankingStatus(p.id, 'verified' as BankingStatus);
      await createNotification({
        recipient_id: p.id,
        type: 'system',
        title: 'Datos bancarios verificados',
        message: 'Tus datos bancarios han sido verificados. Ya puedes recibir pagos.',
        link: '/dashboard/proveedor/configuracion',
      });
      setPendingBanking(prev => prev.filter(x => x.id !== p.id));
      toast({ title: 'Banking verificado', description: `Datos de "${p.full_name}" aprobados.` });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleRejectBanking = async (p: Profile) => {
    const reason = rejectionReasons[p.id]?.trim();
    if (!reason) {
      toast({ title: 'Escribe un motivo de rechazo', variant: 'destructive' });
      return;
    }
    try {
      await updateBankingStatus(p.id, 'rejected' as BankingStatus, reason);
      await createNotification({
        recipient_id: p.id,
        type: 'system',
        title: 'Datos bancarios rechazados',
        message: `Tus datos bancarios fueron rechazados: ${reason}`,
        link: '/dashboard/proveedor/configuracion#datos-bancarios',
      });
      setPendingBanking(prev => prev.filter(x => x.id !== p.id));
      setRejectionReasons(prev => { const n = { ...prev }; delete n[p.id]; return n; });
      toast({ title: 'Banking rechazado', description: `Se notifico a "${p.full_name}".` });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const [impersonating, setImpersonating] = useState<string | null>(null);

  const handleImpersonate = async (providerId: string) => {
    setImpersonating(providerId);
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Error', description: data.error || 'No se pudo generar el acceso', variant: 'destructive' });
        return;
      }
      window.open(data.url, '_blank');
      toast({ title: 'Acceso generado', description: 'Se abrio el dashboard del proveedor en una nueva ventana.' });
    } catch {
      toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
    } finally {
      setImpersonating(null);
    }
  };

  const exportColumns: ExportColumn[] = [
    { header: 'Proveedor', accessor: 'full_name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Empresa', accessor: (r) => r.company_name || '' },
    { header: 'Servicios', accessor: 'service_count' },
    { header: 'Comision Prom.', accessor: (r) => ((providerAvgRates[r.id] ?? COMMISSION_RATE) * 100).toFixed(1) + '%' },
    { header: 'Verificado', accessor: (r) => r.verified ? 'Si' : 'No' },
  ];

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
        <div className="flex items-center gap-2">
          {pendingBanking.length > 0 && (
            <Badge className="bg-yellow-100 text-yellow-800 gap-1">
              <Landmark className="h-3 w-3" />
              {pendingBanking.length} banking pendiente{pendingBanking.length !== 1 ? 's' : ''}
            </Badge>
          )}
          <p className="text-sm text-muted-foreground">{providers.length} proveedores</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="providers">
            Proveedores
            <span className="ml-1.5 text-muted-foreground">{providers.length}</span>
          </TabsTrigger>
          <TabsTrigger value="banking">
            Banking
            {pendingBanking.length > 0 ? (
              <span className="ml-1.5 inline-flex items-center justify-center h-5 w-5 rounded-full bg-yellow-500 text-white text-[10px] font-bold">
                {pendingBanking.length}
              </span>
            ) : (
              <span className="ml-1.5 text-muted-foreground">0</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="mt-4 space-y-6">
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
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar proveedor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <ExportButton data={filtered} columns={exportColumns} filename="proveedores" pdfTitle="Proveedores" />
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
                  <TableHead className="text-right">Acciones</TableHead>
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
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            disabled={impersonating === p.id}
                            onClick={() => handleImpersonate(p.id)}
                            aria-label={`Acceder como ${p.full_name}`}
                          >
                            {impersonating === p.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <LogIn className="h-3 w-3" />
                            )}
                            Acceder
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
        </TabsContent>

        <TabsContent value="banking" className="mt-4">
          <div className="space-y-4">
            {pendingBanking.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 border rounded-md">
                No hay datos bancarios pendientes de revision
              </div>
            ) : pendingBanking.map(p => (
              <div key={p.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{p.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{p.email} · {p.company_name || 'Sin empresa'}</p>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-muted">
                    <span className="text-muted-foreground">RFC</span>
                    <p className="font-mono font-medium">{p.rfc || 'No proporcionado'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <span className="text-muted-foreground">CLABE</span>
                    <p className="font-mono font-medium">{p.clabe || 'No proporcionada'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <span className="text-muted-foreground">Documento</span>
                    {p.bank_document_url ? (
                      <a href={p.bank_document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-medium text-blue-600 hover:underline">
                        <FileText className="h-3 w-3" /> Ver documento <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <p className="font-medium text-red-600">No subido</p>
                    )}
                  </div>
                </div>

                <div className="flex items-end gap-3">
                  <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700" onClick={() => handleApproveBanking(p)}>
                    <CheckCircle className="h-3 w-3" /> Verificar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" /> Rechazar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Rechazar datos bancarios</AlertDialogTitle>
                        <AlertDialogDescription>
                          Escribe el motivo del rechazo. El proveedor &quot;{p.full_name}&quot; recibira una notificacion con este mensaje.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <Textarea
                        placeholder="Ej: La CLABE no coincide con el documento bancario..."
                        value={rejectionReasons[p.id] || ''}
                        onChange={(e) => setRejectionReasons(prev => ({ ...prev, [p.id]: e.target.value }))}
                        rows={3}
                      />
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRejectBanking(p)} className="bg-red-600 hover:bg-red-700">
                          Rechazar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
