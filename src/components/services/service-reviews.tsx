'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { Profile, ReviewStatus } from '@/types/database';

interface ReviewData {
  id: string;
  rating: number;
  comment: string | null;
  status?: ReviewStatus;
  photos?: string[];
  videos?: string[];
  created_at: string;
  client?: Profile;
}

interface ServiceReviewsProps {
  reviews: ReviewData[];
}

export function ServiceReviews({ reviews }: ServiceReviewsProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Only show approved reviews in the public view
  const approvedReviews = reviews.filter(r => !r.status || r.status === 'approved');

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Resenas ({approvedReviews.length})</h2>
      <div className="space-y-4">
        {approvedReviews.map(review => (
          <Card key={review.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium text-sm">
                    {review.client?.full_name || 'Cliente'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
              </div>
              {review.comment && (
                <p className="text-sm text-muted-foreground">{review.comment}</p>
              )}

              {/* Photo gallery */}
              {review.photos && review.photos.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {review.photos.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setLightboxUrl(url)}
                      className="relative h-20 w-20 rounded-lg overflow-hidden border hover:opacity-80 transition-opacity"
                    >
                      <Image src={url} alt={`Foto ${i + 1}`} fill className="object-cover" sizes="80px" />
                    </button>
                  ))}
                </div>
              )}

              {/* Video links */}
              {review.videos && review.videos.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {review.videos.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline bg-primary/10 px-2 py-1 rounded"
                    >
                      Video {i + 1}
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lightbox for photos */}
      <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {lightboxUrl && (
            <div className="relative w-full aspect-video">
              <Image src={lightboxUrl} alt="Foto de review" fill className="object-contain" sizes="(max-width: 768px) 100vw, 800px" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
