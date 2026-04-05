'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { REGIMENES_FISCALES } from '@/lib/fiscal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Search, CheckCircle2, XCircle, Eye, ExternalLink, FileText, Receipt } from 'lucide-react';
import { ExportButton } from '@/components/ui/export-button';
import type { ExportColumn } from '@/lib/export';
import type { ProviderFiscalData, FiscalStatus, RegimenFiscal, DireccionFiscal } from '@/types/database';

const statusConfig: Record<FiscalStatus, { label: string; className: string }> = {
  incomplete: { label: 'Incompleto', className: 'bg-gray-100 text-gray-800' },
  pending_review: { label: 'En revision', className: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Aprobado', className: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rechazado', className: 'bg-red-100 text-red-800' },
};

type FiscalRow = ProviderFiscalData & {
  provider_name: string;
  provider_email: string;
  constancia_signed_url?: string | null;
  estado_cuenta_signed_url?: string | null;
};

export default function AdminFiscalPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [fiscalRecords, setFiscalRecords] = useState<FiscalRow[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FiscalStatus | 'all'>('all');

  // Detail dialog
  const [selectedRecord, setSelectedRecord] = useState<FiscalRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Reject dialog
  const [rejectTarget, setRejectTarget] = useState<FiscalRow | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch all fiscal records
  useEffect(() => {
    async function fetchAll() {
      try {
        // Fetch all providers that have fiscal data
        // We use the admin search endpoint - fetch providers list first, then fiscal data for each
        const res = await fetch('/api/admin/fiscal/list');
        if (res.ok) {
          const { data } = await res.json();
          setFiscalRecords(data || []);
        }
      } catch {
        // Fallback: no records
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const filtered = fiscalRecords.filter(r => {
    const matchesSearch = !search ||
      r.provider_name.toLowerCase().includes(search.toLowerCase()) ||
      r.provider_email.toLowerCase().includes(search.toLowerCase()) ||
      r.rfc.toLowerCase().includes(search.toLowerCase()) ||
      r.razon_social.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.fiscal_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = fiscalRecords.filter(r => r.fiscal_status === 'pending_review').length;

  const exportColumns: ExportColumn[] = [
    { header: 'Proveedor', accessor: 'provider_name' },
    { header: 'Email', accessor: 'provider_email' },
    { header: 'RFC', accessor: 'rfc' },
    { header: 'Razon Social', accessor: 'razon_social' },
    { header: 'Regimen', accessor: (r) => REGIMENES_FISCALES[r.regimen_fiscal as RegimenFiscal] || r.regimen_fiscal },
    { header: 'Tipo', accessor: 'tipo_persona' },
    { header: 'Estado', accessor: (r) => statusConfig[r.fiscal_status as FiscalStatus]?.label || r.fiscal_status },
  ];

  const handleViewDetail = async (record: FiscalRow) => {
    setDetailLoading(true);
    setSelectedRecord(record);
    try {
      const res = await fetch(`/api/admin/fiscal/${record.provider_id}`);
      if (res.ok) {
        const { data } = await res.json();
        if (data) {
          setSelectedRecord(data as FiscalRow);
        }
      }
    } catch {
      // Use the record we already have
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async (record: FiscalRow) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/fiscal/${record.provider_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fiscal_status: 'approved', admin_notes: null }),
      });
      if (!res.ok) throw new Error();

      setFiscalRecords(prev => prev.map(r =>
        r.provider_id === record.provider_id ? { ...r, fiscal_status: 'approved' as FiscalStatus, admin_notes: null } : r
      ));
      setSelectedRecord(null);
      toast({ title: 'Datos fiscales aprobados', description: `Proveedor "${record.provider_name}" aprobado.` });
    } catch {
      toast({ title: 'Error al aprobar', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (!rejectNotes.trim()) {
      toast({ title: 'Escribe un motivo de rechazo', variant: 'destructive' });
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/fiscal/${rejectTarget.provider_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fiscal_status: 'rejected', admin_notes: rejectNotes.trim() }),
      });
      if (!res.ok) throw new Error();

      setFiscalRecords(prev => prev.map(r =>
        r.provider_id === rejectTarget.provider_id
          ? { ...r, fiscal_status: 'rejected' as FiscalStatus, admin_notes: rejectNotes.trim() }
          : r
      ));
      setSelectedRecord(null);
      setRejectTarget(null);
      setRejectNotes('');
      toast({ title: 'Datos fiscales rechazados', description: `Se rechazo a "${rejectTarget.provider_name}".` });
    } catch {
      toast({ title: 'Error al rechazar', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin" role="status" aria-label="Cargando datos fiscales" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Datos Fiscales</h1>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge className="bg-yellow-100 text-yellow-800 gap-1">
              <Receipt className="h-3 w-3" />
              {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
            </Badge>
          )}
          <p className="text-sm text-muted-foreground">{fiscalRecords.length} proveedor{fiscalRecords.length !== 1 ? 'es' : ''}</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['pending_review', 'approved', 'rejected', 'incomplete'] as FiscalStatus[]).map(status => {
          const count = fiscalRecords.filter(r => r.fiscal_status === status).length;
          const config = statusConfig[status];
          return (
            <Card key={status} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{config.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email, RFC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {statusFilter !== 'all' && (
          <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')}>
            Limpiar filtro
          </Button>
        )}
        <ExportButton data={filtered} columns={exportColumns} filename="datos-fiscales" pdfTitle="Datos Fiscales" />
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead>Proveedor</TableHead>
              <TableHead>RFC</TableHead>
              <TableHead className="hidden md:table-cell">Regimen</TableHead>
              <TableHead className="hidden md:table-cell">Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {fiscalRecords.length === 0 ? 'No hay datos fiscales registrados' : 'No se encontraron resultados'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(r => {
                const config = statusConfig[r.fiscal_status];
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{r.provider_name}</p>
                        <p className="text-xs text-muted-foreground">{r.provider_email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{r.rfc}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {REGIMENES_FISCALES[r.regimen_fiscal as RegimenFiscal]?.substring(0, 30) || r.regimen_fiscal}...
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm capitalize">{r.tipo_persona}</TableCell>
                    <TableCell>
                      <Badge className={config.className}>{config.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="gap-1" onClick={() => handleViewDetail(r)}>
                        <Eye className="h-3 w-3" /> Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={(open) => { if (!open) setSelectedRecord(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Datos Fiscales — {selectedRecord?.provider_name}</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : selectedRecord && (
            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center gap-2">
                <Badge className={statusConfig[selectedRecord.fiscal_status].className}>
                  {statusConfig[selectedRecord.fiscal_status].label}
                </Badge>
                {selectedRecord.reviewed_at && (
                  <span className="text-xs text-muted-foreground">
                    Revisado: {new Date(selectedRecord.reviewed_at).toLocaleDateString('es-MX')}
                  </span>
                )}
              </div>

              {selectedRecord.admin_notes && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  <span className="font-medium">Notas:</span> {selectedRecord.admin_notes}
                </div>
              )}

              {/* Fiscal info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted">
                  <span className="text-muted-foreground">RFC</span>
                  <p className="font-mono font-medium">{selectedRecord.rfc}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <span className="text-muted-foreground">Tipo de Persona</span>
                  <p className="font-medium capitalize">{selectedRecord.tipo_persona}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted col-span-2">
                  <span className="text-muted-foreground">Razon Social</span>
                  <p className="font-medium">{selectedRecord.razon_social}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted col-span-2">
                  <span className="text-muted-foreground">Regimen Fiscal</span>
                  <p className="font-medium">
                    {selectedRecord.regimen_fiscal} — {REGIMENES_FISCALES[selectedRecord.regimen_fiscal as RegimenFiscal] || 'Desconocido'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <span className="text-muted-foreground">Uso CFDI</span>
                  <p className="font-medium">{selectedRecord.uso_cfdi}</p>
                </div>
              </div>

              {/* Direccion Fiscal */}
              {selectedRecord.direccion_fiscal && (
                <div className="p-3 rounded-lg bg-muted text-sm">
                  <span className="text-muted-foreground">Direccion Fiscal</span>
                  {(() => {
                    const d = selectedRecord.direccion_fiscal as DireccionFiscal;
                    return (
                      <p className="font-medium">
                        {d.calle} {d.numero_exterior}{d.numero_interior ? ` Int. ${d.numero_interior}` : ''}, Col. {d.colonia}, C.P. {d.codigo_postal}, {d.municipio}, {d.estado}
                      </p>
                    );
                  })()}
                </div>
              )}

              {/* Bank data */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted">
                  <span className="text-muted-foreground">Banco</span>
                  <p className="font-medium">{selectedRecord.banco || 'No proporcionado'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <span className="text-muted-foreground">CLABE</span>
                  <p className="font-mono font-medium">{selectedRecord.clabe || 'No proporcionada'}</p>
                </div>
              </div>

              {/* Documents */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted">
                  <span className="text-muted-foreground">Constancia Fiscal</span>
                  {selectedRecord.constancia_signed_url ? (
                    <a href={selectedRecord.constancia_signed_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-medium text-blue-600 hover:underline mt-1">
                      <FileText className="h-3 w-3" /> Ver documento <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <p className="font-medium text-red-600 mt-1">No subida</p>
                  )}
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <span className="text-muted-foreground">Estado de Cuenta</span>
                  {selectedRecord.estado_cuenta_signed_url ? (
                    <a href={selectedRecord.estado_cuenta_signed_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-medium text-blue-600 hover:underline mt-1">
                      <FileText className="h-3 w-3" /> Ver documento <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <p className="font-medium text-red-600 mt-1">No subido</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              {selectedRecord.fiscal_status !== 'approved' && (
                <div className="flex items-center gap-3 pt-2 border-t">
                  <Button
                    size="sm"
                    className="gap-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleApprove(selectedRecord)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                    Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1"
                    onClick={() => { setRejectTarget(selectedRecord); }}
                    disabled={actionLoading}
                  >
                    <XCircle className="h-3 w-3" /> Rechazar
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <AlertDialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectNotes(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar datos fiscales</AlertDialogTitle>
            <AlertDialogDescription>
              Escribe el motivo del rechazo para &quot;{rejectTarget?.provider_name}&quot;. El proveedor vera este mensaje.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Ej: El RFC no coincide con la constancia de situacion fiscal..."
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} className="bg-red-600 hover:bg-red-700" disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Rechazar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
