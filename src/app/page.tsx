'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { categories, categoryMap } from '@/data/categories';
import { mockServices } from '@/data/mock-services';
import { Search, Calendar, PartyPopper, Star, MapPin, ArrowRight } from 'lucide-react';

const featured = mockServices.slice(0, 4);

const steps = [
  { icon: Search, title: 'Busca servicios', desc: 'Explora cientos de proveedores verificados por categoria, zona y presupuesto.' },
  { icon: Calendar, title: 'Reserva al instante', desc: 'Selecciona fecha, extras y confirma tu reserva con pago seguro.' },
  { icon: PartyPopper, title: 'Celebra tu evento', desc: 'Disfruta de un evento increible con los mejores proveedores de PR.' },
];

const placeholderColors: Record<string, string> = {
  FOOD_DRINKS: 'bg-orange-200', AUDIO: 'bg-blue-200', DECORATION: 'bg-pink-200',
  PHOTO_VIDEO: 'bg-purple-200', STAFF: 'bg-green-200', FURNITURE: 'bg-amber-200',
};

export default function Home() {
  return (
    <div>
      <section className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">Encuentra los mejores servicios para tu evento</h1>
          <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">La plataforma #1 en Puerto Rico para conectar con proveedores de eventos. Catering, audio, decoracion, fotografia y mucho mas.</p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/servicios" className="gap-2">Explorar Servicios <ArrowRight className="h-5 w-5" /></Link>
          </Button>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-10">Categorias de Servicios</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <Link key={cat.value} href={`/servicios?categoria=${cat.value}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="p-6 text-center space-y-3">
                  <div className={`mx-auto w-14 h-14 rounded-xl flex items-center justify-center ${cat.color}`}>
                    <cat.icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-semibold text-sm">{cat.label}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{cat.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-bold">Servicios Destacados</h2>
            <Button variant="outline" asChild><Link href="/servicios">Ver todos</Link></Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((svc) => {
              const cat = categoryMap[svc.category];
              return (
                <Link key={svc.id} href={`/servicios/${svc.id}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full overflow-hidden">
                    <div className={`${placeholderColors[svc.category] || 'bg-gray-200'} h-40 flex items-center justify-center`}>
                      {cat && <cat.icon className="h-10 w-10 text-muted-foreground/50" />}
                    </div>
                    <CardContent className="p-4 space-y-2">
                      <Badge className={cat?.color} variant="secondary">{cat?.label}</Badge>
                      <h3 className="font-semibold line-clamp-1">{svc.title}</h3>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{svc.avg_rating}</span>
                        <span className="text-xs text-muted-foreground">({svc.review_count})</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold">${svc.base_price.toLocaleString()}</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{svc.zones[0]}</div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-10">Como Funciona</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <Card key={i} className="text-center">
              <CardContent className="p-8 space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center">
                  <step.icon className="h-8 w-8 text-violet-600" />
                </div>
                <div className="text-sm font-bold text-violet-600">Paso {i + 1}</div>
                <h3 className="text-xl font-bold">{step.title}</h3>
                <p className="text-muted-foreground">{step.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Eres proveedor de servicios?</h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">Unete a Vivelo y conecta con miles de clientes buscando servicios para sus eventos en Puerto Rico.</p>
          <Button size="lg" variant="secondary" asChild><Link href="/register">Registrate como Proveedor</Link></Button>
        </div>
      </section>
    </div>
  );
}
