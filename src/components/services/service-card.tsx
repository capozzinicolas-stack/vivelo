import Link from 'next/link';
import { Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { categoryMap } from '@/data/categories';
import type { Service } from '@/types/database';

const placeholderColors: Record<string, string> = {
  FOOD_DRINKS: 'bg-orange-200', AUDIO: 'bg-blue-200', DECORATION: 'bg-pink-200',
  PHOTO_VIDEO: 'bg-purple-200', STAFF: 'bg-green-200', FURNITURE: 'bg-amber-200',
};

export function ServiceCard({ service }: { service: Service }) {
  const cat = categoryMap[service.category];
  const visibleZones = service.zones.slice(0, 2);
  const remaining = service.zones.length - 2;

  return (
    <Link href={`/servicios/${service.id}`}>
      <Card className="group overflow-hidden transition-shadow hover:shadow-lg cursor-pointer h-full">
        <div className={`${placeholderColors[service.category] || 'bg-gray-200'} h-48 w-full flex items-center justify-center`}>
          {cat && <cat.icon className="h-12 w-12 text-muted-foreground/50" />}
        </div>
        <CardContent className="p-4 space-y-3">
          {cat && <Badge className={cat.color} variant="secondary">{cat.label}</Badge>}
          <h3 className="font-semibold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">{service.title}</h3>
          <div className="flex items-center gap-1.5">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{service.avg_rating.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">({service.review_count})</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold">${service.base_price.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">{service.price_unit}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {visibleZones.map((z) => <Badge key={z} variant="outline" className="text-xs font-normal">{z}</Badge>)}
            {remaining > 0 && <Badge variant="outline" className="text-xs font-normal">+{remaining}</Badge>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
