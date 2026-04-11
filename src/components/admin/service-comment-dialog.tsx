'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { SERVICE_COMMENT_CATEGORIES, SERVICE_COMMENT_CATEGORY_MAP, SERVICE_COMMENT_LIMITS } from '@/lib/constants';
import { Loader2, Send, Pencil, Trash2, CheckCircle2, Lightbulb, Award, AlertTriangle, Sparkles, Bell, MessageSquare, Eye, EyeOff, X } from 'lucide-react';
import type { ServiceAdminComment, ServiceCommentCategory } from '@/types/database';

const ICON_MAP = { Lightbulb, Award, AlertTriangle, Sparkles, Bell } as const;

interface ServiceCommentDialogProps {
  serviceId: string | null;
  serviceTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServiceCommentDialog({ serviceId, serviceTitle, open, onOpenChange }: ServiceCommentDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [comments, setComments] = useState<ServiceAdminComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState<ServiceCommentCategory>('sugerencia');
  const [commentText, setCommentText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<ServiceCommentCategory>('sugerencia');
  const [editText, setEditText] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    if (!serviceId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/services/${serviceId}/comments`);
      if (!res.ok) throw new Error('No se pudieron cargar los comentarios');
      const json = await res.json();
      setComments((json.comments || []) as ServiceAdminComment[]);
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error cargando', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [serviceId, toast]);

  useEffect(() => {
    if (open && serviceId) {
      setCommentText('');
      setCategory('sugerencia');
      setEditingId(null);
      loadComments();
    }
  }, [open, serviceId, loadComments]);

  const handleCreate = async () => {
    if (!serviceId) return;
    const text = commentText.trim();
    if (text.length < SERVICE_COMMENT_LIMITS.MIN_LENGTH) {
      toast({ title: 'Comentario vacio', variant: 'destructive' });
      return;
    }
    if (text.length > SERVICE_COMMENT_LIMITS.MAX_LENGTH) {
      toast({ title: `Maximo ${SERVICE_COMMENT_LIMITS.MAX_LENGTH} caracteres`, variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/services/${serviceId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, comment: text }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error creando comentario');
      setComments(prev => [json.comment as ServiceAdminComment, ...prev]);
      setCommentText('');
      setCategory('sugerencia');
      toast({ title: 'Comentario enviado', description: 'Se notifico al proveedor.' });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (c: ServiceAdminComment) => {
    setEditingId(c.id);
    setEditCategory(c.category);
    setEditText(c.comment);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleUpdate = async (commentId: string) => {
    if (!serviceId) return;
    const text = editText.trim();
    if (text.length < 1) {
      toast({ title: 'Comentario vacio', variant: 'destructive' });
      return;
    }
    try {
      const res = await fetch(`/api/admin/services/${serviceId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: editCategory, comment: text }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setComments(prev => prev.map(c => (c.id === commentId ? (json.comment as ServiceAdminComment) : c)));
      cancelEdit();
      toast({ title: 'Comentario actualizado' });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!serviceId) return;
    try {
      const res = await fetch(`/api/admin/services/${serviceId}/comments/${commentId}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Error');
      setComments(prev => prev.filter(c => c.id !== commentId));
      setConfirmDeleteId(null);
      toast({ title: 'Comentario eliminado' });
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
            Comentarios del servicio
          </DialogTitle>
          <DialogDescription className="truncate">{serviceTitle}</DialogDescription>
        </DialogHeader>

        {/* Create form */}
        <div className="border rounded-lg p-4 space-y-3 bg-muted/30 shrink-0">
          <div className="flex items-center gap-2">
            <Select value={category} onValueChange={(v) => setCategory(v as ServiceCommentCategory)} disabled={submitting}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_COMMENT_CATEGORIES.map((cat) => {
                  const Icon = ICON_MAP[cat.icon as keyof typeof ICON_MAP];
                  return (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        {Icon && <Icon className="h-4 w-4" />}
                        <span>{cat.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground flex-1">{SERVICE_COMMENT_CATEGORY_MAP[category]?.description}</p>
          </div>
          <Textarea
            placeholder="Escribe tu comentario para el proveedor..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            maxLength={SERVICE_COMMENT_LIMITS.MAX_LENGTH}
            className="min-h-[80px] resize-none"
            disabled={submitting}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{commentText.length}/{SERVICE_COMMENT_LIMITS.MAX_LENGTH}</span>
            <Button onClick={handleCreate} disabled={submitting || commentText.trim().length < 1} size="sm">
              {submitting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
              Enviar
            </Button>
          </div>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[200px]">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              Aun no hay comentarios para este servicio.
            </div>
          ) : (
            <>
              {activeComments.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Activos ({activeComments.length})</p>
                  {activeComments.map((c) => (
                    <CommentCard
                      key={c.id}
                      comment={c}
                      isOwnComment={!!(user?.id && c.admin_id === user.id)}
                      isEditing={editingId === c.id}
                      editCategory={editCategory}
                      editText={editText}
                      onEditCategoryChange={setEditCategory}
                      onEditTextChange={setEditText}
                      onStartEdit={() => startEdit(c)}
                      onCancelEdit={cancelEdit}
                      onSaveEdit={() => handleUpdate(c.id)}
                      onRequestDelete={() => setConfirmDeleteId(c.id)}
                    />
                  ))}
                </div>
              )}
              {resolvedComments.length > 0 && (
                <div className="space-y-3 mt-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Resueltos ({resolvedComments.length})</p>
                  {resolvedComments.map((c) => (
                    <CommentCard
                      key={c.id}
                      comment={c}
                      isOwnComment={!!(user?.id && c.admin_id === user.id)}
                      isEditing={editingId === c.id}
                      editCategory={editCategory}
                      editText={editText}
                      onEditCategoryChange={setEditCategory}
                      onEditTextChange={setEditText}
                      onStartEdit={() => startEdit(c)}
                      onCancelEdit={cancelEdit}
                      onSaveEdit={() => handleUpdate(c.id)}
                      onRequestDelete={() => setConfirmDeleteId(c.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar comentario</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion es permanente. El proveedor ya no vera este comentario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

interface CommentCardProps {
  comment: ServiceAdminComment;
  isOwnComment: boolean;
  isEditing: boolean;
  editCategory: ServiceCommentCategory;
  editText: string;
  onEditCategoryChange: (v: ServiceCommentCategory) => void;
  onEditTextChange: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onRequestDelete: () => void;
}

function CommentCard({
  comment,
  isOwnComment,
  isEditing,
  editCategory,
  editText,
  onEditCategoryChange,
  onEditTextChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onRequestDelete,
}: CommentCardProps) {
  const cat = SERVICE_COMMENT_CATEGORY_MAP[comment.category];
  const Icon = cat ? ICON_MAP[cat.icon as keyof typeof ICON_MAP] : null;

  if (isEditing) {
    return (
      <div className="border rounded-lg p-3 space-y-2 bg-white">
        <Select value={editCategory} onValueChange={(v) => onEditCategoryChange(v as ServiceCommentCategory)}>
          <SelectTrigger className="w-[200px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SERVICE_COMMENT_CATEGORIES.map((c) => {
              const I = ICON_MAP[c.icon as keyof typeof ICON_MAP];
              return (
                <SelectItem key={c.value} value={c.value}>
                  <div className="flex items-center gap-2">
                    {I && <I className="h-4 w-4" />}
                    <span>{c.label}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Textarea
          value={editText}
          onChange={(e) => onEditTextChange(e.target.value)}
          maxLength={SERVICE_COMMENT_LIMITS.MAX_LENGTH}
          className="min-h-[80px] resize-none"
        />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onCancelEdit}>
            <X className="h-3 w-3 mr-1" /> Cancelar
          </Button>
          <Button size="sm" onClick={onSaveEdit}>
            <CheckCircle2 className="h-3 w-3 mr-1" /> Guardar
          </Button>
        </div>
      </div>
    );
  }

  const isResolved = !!comment.resolved_at;

  return (
    <div className={`border rounded-lg p-3 space-y-2 ${isResolved ? 'bg-muted/40 opacity-80' : 'bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge className={cat?.color || 'bg-muted'} variant="outline">
            {Icon && <Icon className="h-3 w-3 mr-1" />}
            {cat?.label || comment.category}
          </Badge>
          {isResolved && (
            <Badge variant="secondary" className="text-[10px]">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Resuelto
            </Badge>
          )}
          {!comment.is_read && !isResolved && (
            <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-700">
              <Eye className="h-3 w-3 mr-1" /> No leido
            </Badge>
          )}
          {comment.is_read && !isResolved && (
            <Badge variant="outline" className="text-[10px]">
              <EyeOff className="h-3 w-3 mr-1" /> Leido
            </Badge>
          )}
        </div>
        {isOwnComment && !isResolved && (
          <div className="flex gap-1 shrink-0">
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onStartEdit} aria-label="Editar">
              <Pencil className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={onRequestDelete} aria-label="Eliminar">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
      <p className="text-sm whitespace-pre-wrap break-words">{comment.comment}</p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{comment.admin?.full_name || 'Admin'}</span>
        <span>·</span>
        <span>{new Date(comment.created_at).toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        {comment.updated_at !== comment.created_at && <span className="italic">(editado)</span>}
      </div>
    </div>
  );
}
