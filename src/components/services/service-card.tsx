import Link from 'next/link';
import { Star, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { categoryMap, subcategoryMap } from '@/data/categories';
import type { Service, ServiceSubcategory } from '@/types/database';

export function ServiceCard({ service }: { service: Service }) {
  const cat = categoryMap[service.category];
  const visibleZones = service.zones.slice(0, 2);
  const remaining = service.zones.length - 2;
  const coverImage = service.images?.[0];

  return (
    <Link href={`/servicios/${service.id}`}>
      <Card className="group overflow-hidden transition-shadow hover:shadow-lg cursor-pointer h-full">
        {coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImage} alt={service.title} className="h-48 w-full object-cover" />
        ) : (
          <div className={`h-48 w-full flex items-center justify-center ${cat ? cat.color.replace('text-', 'bg-').split(' ')[0] : 'bg-gray-200'}`}>
            {cat && (
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${cat.color}`}>
                <cat.icon className="h-8 w-8" />
              </div>
            )}
          </div>
        )}
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {cat && <Badge className={cat.color} variant="secondary">{cat.label}</Badge>}
            {service.subcategory && subcategoryMap[service.subcategory as ServiceSubcategory] && (
              <Badge variant="outline" className="text-xs">{subcategoryMap[service.subcategory as ServiceSubcategory].label}</Badge>
            )}
          </div>
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
          {service.provider && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              por <Link href={`/proveedores/${service.provider_id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-foreground hover:text-primary hover:underline">{service.provider.company_name || service.provider.full_name}</Link>
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {visibleZones.map((z) => <Badge key={z} variant="outline" className="text-xs font-normal">{z}</Badge>)}
            {remaining > 0 && <Badge variant="outline" className="text-xs font-normal">+{remaining}</Badge>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
