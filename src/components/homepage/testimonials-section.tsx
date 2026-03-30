import Link from 'next/link';
import { Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface TestimonialReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client?: { full_name: string };
  service?: { title: string; slug: string };
}

function formatClientName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName;
  return `${parts[0]} ${parts[1][0]}.`;
}

export function TestimonialsSection({ reviews }: { reviews: TestimonialReview[] }) {
  if (reviews.length === 0) return null;

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">Lo que dicen nuestros clientes</h2>
        <p className="text-muted-foreground mb-8">Testimonios reales de clientes satisfechos</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map(review => (
            <Card key={review.id} className="h-full">
              <CardContent className="p-6 space-y-4">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
                    />
                  ))}
                </div>
                {review.comment && (
                  <p className="text-sm text-muted-foreground line-clamp-4">
                    &ldquo;{review.comment}&rdquo;
                  </p>
                )}
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium">
                    {review.client ? formatClientName(review.client.full_name) : 'Cliente'}
                  </p>
                  {review.service && (
                    <Link
                      href={`/servicios/${review.service.slug}`}
                      className="text-xs text-muted-foreground hover:text-primary"
                    >
                      {review.service.title}
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
