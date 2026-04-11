'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { SERVICE_COMMENT_CATEGORY_MAP } from '@/lib/constants';
import { Loader2, CheckCircle2, RotateCcw, Lightbulb, Award, AlertTriangle, Sparkles, Bell, MessageSquare } from 'lucide-react';
import type { ServiceAdminComment } from '@/types/database';

const ICON_MAP = { Lightbulb, Award, AlertTriangle, Sparkles, Bell } as const;

interface ServiceCommentsPanelProps {
  serviceId: string | null;
  serviceTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCommentsChanged?: () => void;
}

export function ServiceCommentsPanel({ serviceId, serviceTitle, open, onOpenChange, onCommentsChanged }: ServiceCommentsPanelProps) {
  const { toast } = useToast();
  const [comments, setComments] = useState<ServiceAdminComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'active' | 'resolved'>('active');

  const loadComments = useCallback(async () => {
    if (!serviceId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/provider/services/${serviceId}/comments?includeResolved=true`);
      if (!res.ok) throw new Error('Error cargando');
      const json = await res.json();
      setComments((json.comments || []) as ServiceAdminComment[]);
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [serviceId, toast]);

  const markAllAsRead = useCallback(async () => {
    if (!serviceId) return;
    try {
      await fetch(`/api/provider/services/${serviceId}/comments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      onCommentsChanged?.();
    } catch (err) {
      console.warn('[Provider Comments] markAllAsRead failed:', err);
    }
  }, [serviceId, onCommentsChanged]);

  useEffect(() => {
    if (open && serviceId) {
      loadComments().then(() => markAllAsRead());
    }
  }, [open, serviceId, loadComments, markAllAsRead]);

  const handleResolve = async (commentId: string) => {
    if (!serviceId) return;
    try {
      const res = await fetch(`/api/provider/services/${serviceId}/comments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, resolved: true }),
      });
      if (!res.ok) throw new Error('Error');
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, resolved_at: new Date().toISOString(), is_read: true } : c));
      toast({ title: 'Marcado como resuelto' });
      onCommentsChanged?.();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
    }
  };

  const handleUnresolve = async (commentId: string) => {
    if (!serviceId) return;
    try {
      const res = await fetch(`/api/provider/services/${serviceId}/comments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, resolved: false }),
      });
      if (!res.ok) throw new Error('Error');
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, resolved_at: null } : c));
      toast({ title: 'Reabierto' });
      onCommentsChanged?.();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
    }
  };

  const activeComments = comments.filter(c => !c.resolved_at);
  const resolvedComments = comments.filter(c => c.resolved_at);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-deep-purple" />
            Comentarios del equipo Vivelo
          </DialogTitle>
          <DialogDescription className="truncate">{serviceTitle}</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'active' | 'resolved')} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="shrink-0">
            <TabsTrigger value="active">
              Activos <span className="ml-1.5 text-muted-foreground">{activeComments.length}</span>
            </TabsTrigger>
            <TabsTrigger value="resolved">
              Resueltos <span className="ml-1.5 text-muted-foreground">{resolvedComments.length}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="flex-1 overflow-y-auto pr-1 mt-4">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : activeComments.length === 0 ? (
              <EmptyState message="Sin comentarios activos" description="Cuando el equipo de Vivelo te deje notas o sugerencias, apareceran aqui." />
            ) : (
              <div className="space-y-3">
                {activeComments.map(c => (
                  <CommentCard key={c.id} comment={c} onResolve={() => handleResolve(c.id)} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="resolved" className="flex-1 overflow-y-auto pr-1 mt-4">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : resolvedComments.length === 0 ? (
              <EmptyState message="Sin comentarios resueltos" description="Los comentarios que marques como resueltos se archivaran aqui." />
            ) : (
              <div className="space-y-3">
                {resolvedComments.map(c => (
                  <CommentCard key={c.id} comment={c} onUnresolve={() => handleUnresolve(c.id)} resolved />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ message, description }: { message: string; description: string }) {
  return (
    <div className="text-center py-12 text-sm">
      <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
      <p className="font-medium">{message}</p>
      <p className="text-muted-foreground mt-1 max-w-sm mx-auto">{description}</p>
    </div>
  );
}

interface CommentCardProps {
  comment: ServiceAdminComment;
  onResolve?: () => void;
  onUnresolve?: () => void;
  resolved?: boolean;
}

function CommentCard({ comment, onResolve, onUnresolve, resolved }: CommentCardProps) {
  const cat = SERVICE_COMMENT_CATEGORY_MAP[comment.category];
  const Icon = cat ? ICON_MAP[cat.icon as keyof typeof ICON_MAP] : null;

  return (
    <div className={`border rounded-lg p-4 space-y-2 ${resolved ? 'bg-muted/40 opacity-80' : 'bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <Badge className={cat?.color || 'bg-muted'} variant="outline">
          {Icon && <Icon className="h-3 w-3 mr-1" />}
          {cat?.label || comment.category}
        </Badge>
        {!resolved && onResolve && (
          <Button size="sm" variant="outline" onClick={onResolve} className="h-7 text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Marcar resuelto
          </Button>
        )}
        {resolved && onUnresolve && (
          <Button size="sm" variant="ghost" onClick={onUnresolve} className="h-7 text-xs">
            <RotateCcw className="h-3 w-3 mr-1" /> Reabrir
          </Button>
        )}
      </div>
      <p className="text-sm whitespace-pre-wrap break-words">{comment.comment}</p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{comment.admin?.full_name || 'Equipo Vivelo'}</span>
        <span>·</span>
        <span>{new Date(comment.created_at).toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        {comment.resolved_at && (
          <>
            <span>·</span>
            <span className="text-green-700">Resuelto {new Date(comment.resolved_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>
          </>
        )}
      </div>
    </div>
  );
}
