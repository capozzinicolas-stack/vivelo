'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAllServices, updateServiceStatus, approveDeletion, rejectDeletion } from '@/lib/supabase/queries';
import { useCatalog } from '@/providers/catalog-provider';
import { MediaGallery } from '@/components/services/media-gallery';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Star, Pause, CheckCircle, Archive, Loader2, Trash2, XCircle, AlertTriangle, Eye, Pencil, MapPin } from 'lucide-react';
import type { Service, ServiceStatus } from '@/types/database';

const statusTabs = ['all', 'active', 'paused', 'archived', 'deletion'] as const;
const tabLabels: Record<string, string> = { all: 'Todos', active: 'Activos', paused: 'Pausados', archived: 'Archivados', deletion: 'Solicitudes de eliminacion' };
const statusColors: Record<string, string> = { active: 'bg-green-100 text-green-800', draft: 'bg-gray-100 text-gray-800', paused: 'bg-yellow-100 text-yellow-800', archived: 'bg-red-100 text-red-800' };

export default function AdminServiciosPage() {
  const { categoryMap } = useCatalog();
  const [tab, setTab] = useState('all');
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Service | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    getAllServices().then(setServices).finally(() => setLoading(false));
  }, []);

  const deletionRequests = services.filter(s => s.deletion_requested);
  const filtered = tab === 'all'
    ? services
    : tab === 'deletion'
      ? deletionRequests
      : services.filter(s => s.status === tab);

  const handleAction = async (id: string, status: ServiceStatus, title: string) => {
    const labels: Record<string, string> = { active: 'Aprobado', paused: 'Pausado', archived: 'Archivado' };
    try {
      await updateServiceStatus(id, status);
      setServices(prev => prev.map(s => s.id === id ? { ...s, status } : s));
      toast({ title: `Servicio ${labels[status]}`, description: `"${title}" ha sido ${labels[status].toLowerCase()}.` });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleApproveDeletion = async (s: Service) => {
    try {
      await approveDeletion(s.id);
      setServices(prev => prev.map(svc => svc.id === s.id ? { ...svc, status: 'archived' as ServiceStatus, deletion_requested: false } : svc));
      toast({ title: 'Eliminacion aprobada', description: `"${s.title}" ha sido archivado.` });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleRejectDeletion = async (s: Service) => {
    try {
      await rejectDeletion(s.id);
      setServices(prev => prev.map(svc => svc.id === s.id ? { ...svc, deletion_requested: false } : svc));
      toast({ title: 'Solicitud rechazada', description: `La solicitud para "${s.title}" ha sido rechazada.` });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Moderacion de Servicios</h1>
        {deletionRequests.length > 0 && (
          <Badge className="bg-red-100 text-red-800 gap-1">
            <AlertTriangle className="h-3 w-3" />
            {deletionRequests.length} solicitud{deletionRequests.length !== 1 ? 'es' : ''} de eliminacion
          </Badge>
        )}
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {statusTabs.map((s) => (
            <TabsTrigger key={s} value={s} className="relative">
              {tabLabels[s]}
              {s === 'deletion' && deletionRequests.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {deletionRequests.length}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          {tab === 'deletion' ? (
            <div className="space-y-4">
              {deletionRequests.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 border rounded-md">No hay solicitudes de eliminacion pendientes</div>
              ) : deletionRequests.map(s => {
                const cat = categoryMap[s.category];
                return (
                  <div key={s.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{s.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {cat?.label} · ${s.base_price.toLocaleString()} {s.price_unit} · Proveedor: {s.provider?.full_name || 'N/A'}
                        </p>
                        {s.deletion_requested_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Solicitado: {new Date(s.deletion_requested_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0" title="Ver detalle" onClick={() => setPreview(s)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Badge className={statusColors[s.status]}>{s.status}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive" className="gap-1">
                            <Trash2 className="h-3 w-3" /> Aprobar eliminacion
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar eliminacion</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esto archivara el servicio &quot;{s.title}&quot; permanentemente. El proveedor no podra reactivarlo.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleApproveDeletion(s)} className="bg-red-600 hover:bg-red-700">
                              Confirmar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => handleRejectDeletion(s)}>
                        <XCircle className="h-3 w-3" /> Rechazar solicitud
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titulo</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No hay servicios</TableCell></TableRow>
                  ) : filtered.map((s) => {
                    const cat = categoryMap[s.category];
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          {s.title}
                          {s.deletion_requested && <Badge className="ml-2 bg-red-100 text-red-800 text-[10px]">Eliminacion solicitada</Badge>}
                        </TableCell>
                        <TableCell className="text-sm">{s.provider?.full_name || 'N/A'}</TableCell>
                        <TableCell><Badge className={cat?.color} variant="secondary">{cat?.label}</Badge></TableCell>
                        <TableCell>${s.base_price.toLocaleString()} {s.price_unit}</TableCell>
                        <TableCell><Badge className={statusColors[s.status]}>{s.status}</Badge></TableCell>
                        <TableCell><div className="flex items-center gap-1"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />{s.avg_rating}</div></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Ver detalle" onClick={() => setPreview(s)}>
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Editar" asChild>
                              <Link href={`/dashboard/admin/servicios/${s.id}/editar`}><Pencil className="h-3 w-3" /></Link>
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Activar" onClick={() => handleAction(s.id, 'active', s.title)}><CheckCircle className="h-3 w-3 text-green-600" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Pausar" onClick={() => handleAction(s.id, 'paused', s.title)}><Pause className="h-3 w-3 text-yellow-600" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Archivar" onClick={() => handleAction(s.id, 'archived', s.title)}><Archive className="h-3 w-3 text-red-600" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {preview && (() => {
            const cat = categoryMap[preview.category];
            return (
              <>
                <DialogHeader>
                  <DialogTitle>{preview.title}</DialogTitle>
                  <DialogDescription>
                    {cat?.label} · ${preview.base_price.toLocaleString()} {preview.price_unit} · Proveedor: {preview.provider?.full_name || 'N/A'}
                  </DialogDescription>
                </DialogHeader>

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

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-lg bg-muted">
                      <span className="text-muted-foreground">Estado</span>
                      <p><Badge className={statusColors[preview.status]}>{preview.status}</Badge></p>
                    </div>
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
                    <div className="p-3 rounded-lg bg-muted">
                      <span className="text-muted-foreground">Creado</span>
                      <p className="font-medium">{new Date(preview.created_at).toLocaleDateString('es-MX')}</p>
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

                  {preview.deletion_requested && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                      <p className="text-sm text-red-700 font-medium">Eliminacion solicitada</p>
                      {preview.deletion_requested_at && (
                        <p className="text-xs text-red-600 mt-1">
                          {new Date(preview.deletion_requested_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" asChild>
                      <Link href={`/dashboard/admin/servicios/${preview.id}/editar`}><Pencil className="h-3 w-3 mr-1" /> Editar</Link>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { handleAction(preview.id, preview.status === 'active' ? 'paused' : 'active', preview.title); setPreview(null); }}>
                      {preview.status === 'active' ? <><Pause className="h-3 w-3 mr-1" /> Pausar</> : <><CheckCircle className="h-3 w-3 mr-1" /> Activar</>}
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
