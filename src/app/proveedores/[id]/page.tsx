'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getProfileById, getServicesByProvider } from '@/lib/supabase/queries';
import { ServiceCard } from '@/components/services/service-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Star, Loader2, ShieldCheck } from 'lucide-react';
import type { Profile, Service } from '@/types/database';

export default function ProveedorPublicPage() {
  const { id } = useParams<{ id: string }>();
  const [provider, setProvider] = useState<Profile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getProfileById(id),
      getServicesByProvider(id),
    ]).then(([profile, svcs]) => {
      setProvider(profile);
      setServices(svcs.filter(s => s.status === 'active').map(s => ({ ...s, provider: profile || undefined })));
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="container mx-auto px-4 py-16 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>;
  }

  if (!provider) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Proveedor no encontrado</h1>
        <Button asChild><Link href="/servicios"><ArrowLeft className="h-4 w-4 mr-2" />Volver a servicios</Link></Button>
      </div>
    );
  }

  const initials = provider.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  const allZones = Array.from(new Set(services.flatMap(s => s.zones)));
  const avgRating = services.length
    ? Number((services.reduce((s, sv) => s + sv.avg_rating, 0) / services.length).toFixed(1))
    : 0;
  const totalReviews = services.reduce((s, sv) => s + sv.review_count, 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="mb-6"><Link href="/servicios"><ArrowLeft className="h-4 w-4 mr-2" />Volver a servicios</Link></Button>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Provider header */}
        <div className="flex items-start gap-6 flex-col sm:flex-row">
          <Avatar className="h-24 w-24 shrink-0">
            <AvatarImage src={provider.avatar_url || undefined} alt={provider.full_name} />
            <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-bold">{provider.company_name || provider.full_name}</h1>
              {provider.verified && (
                <Badge className="bg-green-100 text-green-800 gap-1"><ShieldCheck className="h-3 w-3" />Verificado</Badge>
              )}
            </div>
            {provider.company_name && (
              <p className="text-muted-foreground">{provider.full_name}</p>
            )}
            {provider.bio && <p className="text-muted-foreground leading-relaxed">{provider.bio}</p>}
            <div className="flex items-center gap-4 flex-wrap text-sm">
              {avgRating > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{avgRating}</span>
                  <span className="text-muted-foreground">({totalReviews} resenas)</span>
                </span>
              )}
              <span className="text-muted-foreground">{services.length} servicio{services.length !== 1 ? 's' : ''}</span>
            </div>
            {allZones.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {allZones.slice(0, 5).map((z) => <Badge key={z} variant="outline" className="text-xs"><MapPin className="h-3 w-3 mr-1" />{z}</Badge>)}
                {allZones.length > 5 && <Badge variant="outline" className="text-xs">+{allZones.length - 5} mas</Badge>}
              </div>
            )}
          </div>
        </div>

        {/* Services grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Servicios ofrecidos</h2>
          {services.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Este proveedor no tiene servicios activos</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((s) => <ServiceCard key={s.id} service={s} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
