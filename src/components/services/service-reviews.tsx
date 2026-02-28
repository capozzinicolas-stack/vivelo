import { Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Profile } from '@/types/database';

interface ReviewData {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client?: Profile;
}

interface ServiceReviewsProps {
  reviews: ReviewData[];
}

export function ServiceReviews({ reviews }: ServiceReviewsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Resenas ({reviews.length})</h2>
      <div className="space-y-4">
        {reviews.map(review => (
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
