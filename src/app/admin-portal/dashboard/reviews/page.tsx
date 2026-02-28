'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Star, Loader2, Check, X, Plus, Eye, Image as ImageIcon } from 'lucide-react';
import type { Review, Service } from '@/types/database';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'md' ? 'h-5 w-5' : 'h-3.5 w-3.5';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`${sizeClass} ${i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
      ))}
    </div>
  );
}

export default function AdminReviewsPage() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Detail dialog
  const [detailReview, setDetailReview] = useState<Review | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [newReview, setNewReview] = useState({ serviceId: '', rating: 5, comment: '', clientName: '' });
  const [createLoading, setCreateLoading] = useState(false);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/admin/reviews?${params}`);
      const data = await res.json();
      if (res.ok) setReviews(data.reviews || []);
    } catch (err) {
      console.error('[AdminReviews] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchReviews(); }, [statusFilter]);

  const handleModerate = async (reviewId: string, action: 'approve' | 'reject', notes?: string) => {
    setActionLoading(reviewId);
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, action, adminNotes: notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({ title: action === 'approve' ? 'Review aprobada' : 'Review rechazada' });
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r));
      setDetailOpen(false);
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error al moderar', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const fetchServices = async () => {
    setServicesLoading(true);
    try {
      const { getAllServices } = await import('@/lib/supabase/queries');
      const data = await getAllServices();
      setServices(data);
    } catch {
      console.error('[AdminReviews] Error fetching services');
    } finally {
      setServicesLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setCreateOpen(true);
    if (services.length === 0) fetchServices();
  };

  const handleCreateReview = async () => {
    if (!newReview.serviceId) {
      toast({ title: 'Error', description: 'Selecciona un servicio', variant: 'destructive' });
      return;
    }
    setCreateLoading(true);
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: newReview.serviceId,
          rating: newReview.rating,
          comment: newReview.comment || undefined,
          clientName: newReview.clientName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({ title: 'Review creada', description: 'La review ha sido publicada.' });
      setNewReview({ serviceId: '', rating: 5, comment: '', clientName: '' });
      setCreateOpen(false);
      fetchReviews();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error al crear', variant: 'destructive' });
    } finally {
      setCreateLoading(false);
    }
  };

  const filteredServices = serviceSearch
    ? services.filter(s => s.title.toLowerCase().includes(serviceSearch.toLowerCase()))
    : services;

  const pendingCount = reviews.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reviews</h1>
          {pendingCount > 0 && (
            <p className="text-sm text-muted-foreground">{pendingCount} pendiente{pendingCount !== 1 ? 's' : ''} de moderar</p>
          )}
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />Agregar Review
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="approved">Aprobadas</SelectItem>
            <SelectItem value="rejected">Rechazadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Comentario</TableHead>
                  <TableHead>Fotos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No hay reviews
                    </TableCell>
                  </TableRow>
                ) : (
                  reviews.map(review => (
                    <TableRow key={review.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {review.service?.title || 'Servicio'}
                        {review.created_by_admin && (
                          <Badge variant="outline" className="ml-1 text-xs">Admin</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{review.client?.full_name || '—'}</TableCell>
                      <TableCell><StarRating rating={review.rating} /></TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {review.comment || '—'}
                      </TableCell>
                      <TableCell>
                        {review.photos && review.photos.length > 0 && (
                          <div className="flex items-center gap-1">
                            <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs">{review.photos.length}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[review.status]}>{STATUS_LABELS[review.status]}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString('es-MX')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setDetailReview(review); setAdminNotes(review.admin_notes || ''); setDetailOpen(true); }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {review.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => handleModerate(review.id, 'approve')}
                                disabled={actionLoading === review.id}
                              >
                                {actionLoading === review.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleModerate(review.id, 'reject')}
                                disabled={actionLoading === review.id}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de Review</DialogTitle>
            <DialogDescription>
              {detailReview?.service?.title || 'Servicio'}
            </DialogDescription>
          </DialogHeader>
          {detailReview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{detailReview.client?.full_name || 'Cliente'}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(detailReview.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StarRating rating={detailReview.rating} size="md" />
                  <Badge className={STATUS_COLORS[detailReview.status]}>{STATUS_LABELS[detailReview.status]}</Badge>
                </div>
              </div>

              {detailReview.comment && (
                <p className="text-sm">{detailReview.comment}</p>
              )}

              {detailReview.photos && detailReview.photos.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Fotos</p>
                  <div className="flex gap-2 flex-wrap">
                    {detailReview.photos.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                        className="relative block h-20 w-20 rounded border overflow-hidden hover:opacity-80">
                        <Image src={url} alt={`Foto ${i + 1}`} fill className="object-cover" sizes="80px" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {detailReview.videos && detailReview.videos.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Videos</p>
                  <div className="flex gap-2 flex-wrap">
                    {detailReview.videos.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline bg-primary/10 px-2 py-1 rounded">
                        Video {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin notes */}
              <div>
                <p className="text-sm font-medium mb-2">Notas del admin</p>
                <Textarea
                  placeholder="Agregar notas..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Actions */}
              {detailReview.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleModerate(detailReview.id, 'approve', adminNotes)}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === detailReview.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                    Aprobar
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleModerate(detailReview.id, 'reject', adminNotes)}
                    disabled={!!actionLoading}
                  >
                    <X className="h-4 w-4 mr-1" />Rechazar
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Review Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Review</DialogTitle>
            <DialogDescription>
              Crear una review manual (se publica directamente como aprobada)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Service selector */}
            <div>
              <p className="text-sm font-medium mb-2">Servicio</p>
              <Input
                placeholder="Buscar servicio..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="mb-2"
              />
              {servicesLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <div className="max-h-40 overflow-y-auto border rounded-md">
                  {filteredServices.slice(0, 20).map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { setNewReview(prev => ({ ...prev, serviceId: s.id })); setServiceSearch(s.title); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
                        newReview.serviceId === s.id ? 'bg-accent font-medium' : ''
                      }`}
                    >
                      {s.title}
                    </button>
                  ))}
                  {filteredServices.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No se encontraron servicios</p>
                  )}
                </div>
              )}
            </div>

            {/* Client name */}
            <div>
              <p className="text-sm font-medium mb-2">Nombre del cliente (opcional)</p>
              <Input
                placeholder="Nombre..."
                value={newReview.clientName}
                onChange={(e) => setNewReview(prev => ({ ...prev, clientName: e.target.value }))}
              />
            </div>

            {/* Rating */}
            <div>
              <p className="text-sm font-medium mb-2">Calificacion</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                    className="p-0.5 transition-transform hover:scale-110"
                  >
                    <Star className={`h-7 w-7 ${star <= newReview.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div>
              <p className="text-sm font-medium mb-2">Comentario</p>
              <Textarea
                placeholder="Escribe la review..."
                value={newReview.comment}
                onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                rows={3}
              />
            </div>

            <Button onClick={handleCreateReview} disabled={createLoading || !newReview.serviceId} className="w-full">
              {createLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Crear Review
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
