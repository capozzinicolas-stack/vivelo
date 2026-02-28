'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Star, Loader2 } from 'lucide-react';

interface CreateReviewDialogProps {
  bookingId: string;
  serviceTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReviewCreated?: () => void;
}

export function CreateReviewDialog({ bookingId, serviceTitle, open, onOpenChange, onReviewCreated }: CreateReviewDialogProps) {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: 'Error', description: 'Selecciona una calificacion.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          rating,
          comment: comment.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar review');

      toast({ title: 'Review enviada', description: 'Tu opinion sera revisada y publicada pronto.' });
      setRating(0);
      setComment('');
      onReviewCreated?.();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'No se pudo enviar la review.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Deja tu opinion</DialogTitle>
          <DialogDescription>
            Cuentanos como fue tu experiencia con {serviceTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Star rating */}
          <div>
            <p className="text-sm font-medium mb-2">Calificacion</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-0.5 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoverRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <p className="text-sm font-medium mb-2">Comentario (opcional)</p>
            <Textarea
              placeholder="Comparte tu experiencia..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground mt-1">{comment.length}/2000</p>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={loading || rating === 0}
            className="w-full"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Enviar Review
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
