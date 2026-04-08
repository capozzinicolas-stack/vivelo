'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuthContext } from '@/providers/auth-provider';
import { getServicesByProvider, updateServiceStatus, requestServiceDeletion, getFeaturedPlacements } from '@/lib/supabase/queries';
import { useCatalog } from '@/providers/catalog-provider';
import { MediaGallery } from '@/components/services/media-gallery';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Star, Loader2, Eye, Pencil, Pause, Play, Trash2, MapPin, Sparkles, AlertTriangle, MessageSquare } from 'lucide-react';
import { ExportButton } from '@/components/ui/export-button';
import type { ExportColumn } from '@/lib/export';
import type { Service, ServiceStatus } from '@/types/database';

const statusLabels: Record<string, string> = { active: 'Activo', draft: 'Borrador', pending_review: 'Pendiente de aprobacion', needs_revision: 'Necesita Ajustes', paused: 'Pausado', archived: 'Archivado' };
const statusColors: Record<string, string> = { active: 'bg-green-100 text-green-800', draft: 'bg-gray-100 text-gray-800', pending_review: 'bg-blue-100 text-blue-800', needs_revision: 'bg-orange-100 text-orange-800', paused: 'bg-yellow-100 text-yellow-800', archived: 'bg-red-100 text-red-800' };

type StatusTab = 'all' | 'active' | 'pending_review' | 'needs_revision' | 'paused' | 'draft';

export default function ProveedorServiciosPage() {
  const { categoryMap, getCategoryCommissionRate } = useCatalog();
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [featuredServiceIds, setFeaturedServiceIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Service | null>(null);
  const [tab, setTab] = useState<StatusTab>('all');
  const [notesService, setNotesService] = useState<Service | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getServicesByProvider(user.id),
      getFeaturedPlacements(),
    ])
      .then(([svcs, placements]) => {
        setServices(svcs);
        setFeaturedServiceIds(new Set(placements.map(p => p.service_id)));
      })
      .catch((err) => {
        console.error('[ProveedorServicios] Error loading services:', err);
        toast({ title: 'Error cargando servicios', description: err?.message || 'Intenta recargar la pagina.', variant: 'destructive' });
      })
      .finally(() => setLoading(false));
  }, [user, toast]);

  const handleTogglePause = async (s: Service) => {
    const newStatus: ServiceStatus = s.status === 'active' ? 'paused' : 'active';
    try {
      await updateServiceStatus(s.id, newStatus);
      setServices(prev => prev.map(svc => svc.id === s.id ? { ...svc, status: newStatus } : svc));
      toast({ title: newStatus === 'paused' ? 'Servicio pausado' : 'Servicio activado' });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleRequestDeletion = async (s: Service) => {
    try {
      await requestServiceDeletion(s.id);
      setServices(prev => prev.map(svc => svc.id === s.id ? { ...svc, deletion_requested: true } : svc));
      toast({ title: 'Solicitud enviada', description: 'Un admin de Vivelo revisara tu solicitud de eliminacion.' });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const exportColumns: ExportColumn[] = [
    { header: 'Titulo', accessor: 'title' },
    { header: 'Categoria', accessor: (r) => categoryMap[r.category]?.label || r.category },
    { header: 'Precio', accessor: (r) => `$${r.base_price?.toLocaleString()} ${r.price_unit}` },
    { header: 'Estado', accessor: (r) => statusLabels[r.status] || r.status },
    { header: 'Rating', accessor: 'avg_rating' },
  ];

  const tabCounts = useMemo(() => ({
    all: services.length,
    active: services.filter(s => s.status === 'active').length,
    pending_review: services.filter(s => s.status === 'pending_review').length,
    needs_revision: services.filter(s => s.status === 'needs_revision').length,
    paused: services.filter(s => s.status === 'paused').length,
    draft: services.filter(s => s.status === 'draft').length,
  }), [services]);

  const filtered = useMemo(() => {
    if (tab === 'all') return services;
    return services.filter(s => s.status === tab);
  }, [services, tab]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const renderTable = (rows: Service[]) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titulo</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No hay servicios en esta categoria</TableCell></TableRow>
          ) : rows.map((s) => {
            const cat = categoryMap[s.category];
            return (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.title}</span>
                    {featuredServiceIds.has(s.id) && (
                      <Badge className="bg-violet-100 text-violet-700 text-[10px] gap-1">
                        <Sparkles className="h-3 w-3" />Destacado
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell><Badge className={cat?.color} variant="secondary">{cat?.label}</Badge></TableCell>
                <TableCell>${s.base_price.toLocaleString()} {s.price_unit}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge className={statusColors[s.status]}>{statusLabels[s.status]}</Badge>
                    {s.status === 'pending_review' && <span className="text-xs text-blue-600">Un admin revisara tu servicio</span>}
                    {s.status === 'needs_revision' && s.admin_notes && (
                      <button
                        className="text-xs text-orange-700 flex items-center gap-1 hover:underline cursor-pointer text-left"
                        onClick={() => setNotesService(s)}
                      >
                        <MessageSquare className="h-3 w-3 shrink-0" />
                        Ver notas del admin
                      </button>
                    )}
                    {s.deletion_requested && <Badge className="bg-red-100 text-red-800 text-[10px]">Eliminacion solicitada</Badge>}
                  </div>
                </TableCell>
                <TableCell><div className="flex items-center gap-1"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />{s.avg_rating}</div></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" title="Ver" onClick={() => setPreview(s)}>
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" title="Editar" asChild>
                      <Link href={`/dashboard/proveedor/servicios/${s.id}/editar`}><Pencil className="h-3 w-3" /></Link>
                    </Button>
                    {s.status !== 'pending_review' && s.status !== 'needs_revision' && s.status !== 'archived' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0"
                        title={s.status === 'active' ? 'Pausar' : 'Activar'}
                        onClick={() => handleTogglePause(s)}
                      >
                        {s.status === 'active' ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                      </Button>
                    )}
                    {!s.deletion_requested && s.status !== 'pending_review' && s.status !== 'needs_revision' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-red-500" title="Solicitar eliminacion">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Solicitar eliminacion</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta accion enviara una solicitud a un administrador de Vivelo para eliminar el servicio &quot;{s.title}&quot;.
                              El servicio no se eliminara hasta que un admin lo apruebe.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRequestDeletion(s)} className="bg-red-600 hover:bg-red-700">
                              Solicitar eliminacion
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Mis Servicios</h1>
          <ExportButton data={filtered} columns={exportColumns} filename="mis-servicios" pdfTitle="Mis Servicios" />
        </div>
        <Button asChild><Link href="/dashboard/proveedor/servicios/nuevo"><Plus className="h-4 w-4 mr-2" />Nuevo Servicio</Link></Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as StatusTab)}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all">
            Todos <span className="ml-1.5 text-muted-foreground">{tabCounts.all}</span>
          </TabsTrigger>
          <TabsTrigger value="active">
            Activos <span className="ml-1.5 text-muted-foreground">{tabCounts.active}</span>
          </TabsTrigger>
          <TabsTrigger value="pending_review">
            En revision
            {tabCounts.pending_review > 0 ? (
              <span className="ml-1.5 inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-500 text-white text-[10px] font-bold">{tabCounts.pending_review}</span>
            ) : (
              <span className="ml-1.5 text-muted-foreground">0</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="needs_revision">
            Necesita ajustes
            {tabCounts.needs_revision > 0 ? (
              <span className="ml-1.5 inline-flex items-center justify-center h-5 w-5 rounded-full bg-orange-500 text-white text-[10px] font-bold">{tabCounts.needs_revision}</span>
            ) : (
              <span className="ml-1.5 text-muted-foreground">0</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="paused">
            Pausados <span className="ml-1.5 text-muted-foreground">{tabCounts.paused}</span>
          </TabsTrigger>
          <TabsTrigger value="draft">
            Borradores <span className="ml-1.5 text-muted-foreground">{tabCounts.draft}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {renderTable(filtered)}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle>{preview.title}</DialogTitle>
                <DialogDescription>
                  {categoryMap[preview.category]?.label} · ${preview.base_price.toLocaleString()} {preview.price_unit}
                </DialogDescription>
              </DialogHeader>

              {(() => {
                const rate = getCategoryCommissionRate(preview.category);
                const pct = (rate * 100).toFixed(0);
                const amount = Math.round(preview.base_price * rate * 100) / 100;
                return (
                  <div className="flex items-center">
                    <span className="inline-flex items-center gap-1.5 bg-deep-purple/10 text-deep-purple text-sm px-3 py-1.5 rounded-full font-medium">
                      Comisión Vivelo ({pct}%): ${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                );
              })()}

              {(preview.images?.length > 0 || preview.videos?.length > 0) && (
                <MediaGallery images={preview.images || []} videos={preview.videos || []} title={preview.title} />
              )}

              <div className="space-y-4">
                {preview.description && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Descripcion</h4>
                    <p className="text-sm text-muted-foreground">{preview.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 rounded-lg bg-muted">
                    <span className="text-muted-foreground">Invitados</span>
                    <p className="font-medium">{preview.min_guests} - {preview.max_guests}</p>
                  </div>
                  {preview.price_unit === 'por hora' && (
                    <div className="p-3 rounded-lg bg-muted">
                      <span className="text-muted-foreground">Horas</span>
                      <p className="font-medium">{preview.min_hours || 1} - {preview.max_hours || 12}h</p>
                    </div>
                  )}
                  <div className="p-3 rounded-lg bg-muted">
                    <span className="text-muted-foreground">Rating</span>
                    <p className="font-medium flex items-center gap-1"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />{preview.avg_rating} ({preview.review_count})</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <span className="text-muted-foreground">Vistas</span>
                    <p className="font-medium">{preview.view_count}</p>
                  </div>
                </div>

                {preview.zones.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {preview.zones.map((z) => <Badge key={z} variant="outline"><MapPin className="h-3 w-3 mr-1" />{z}</Badge>)}
                  </div>
                )}

                {preview.extras && preview.extras.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Extras ({preview.extras.length})</h4>
                    <div className="space-y-1">
                      {preview.extras.map(ex => (
                        <div key={ex.id} className="flex justify-between text-sm p-2 rounded bg-muted">
                          <span>{ex.name} <span className="text-muted-foreground">({ex.price_type === 'fixed' ? 'fijo' : ex.price_type === 'per_hour' ? 'por hora' : 'por persona'})</span></span>
                          <span className="font-medium">${ex.price.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Admin Notes Dialog */}
      <Dialog open={!!notesService} onOpenChange={(open) => !open && setNotesService(null)}>
        <DialogContent>
          {notesService && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Notas del admin
                </DialogTitle>
                <DialogDescription>
                  Ajustes solicitados para &quot;{notesService.title}&quot;
                </DialogDescription>
              </DialogHeader>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm whitespace-pre-wrap">
                {notesService.admin_notes}
              </div>
              <div className="flex justify-end">
                <Button asChild>
                  <Link href={`/dashboard/proveedor/servicios/${notesService.id}/editar`}>
                    <Pencil className="h-4 w-4 mr-2" />Editar servicio
                  </Link>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
