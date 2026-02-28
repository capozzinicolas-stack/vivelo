'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart, type CartItem } from '@/providers/cart-provider';
import { useAuthContext } from '@/providers/auth-provider';
import { useCatalog } from '@/providers/catalog-provider';
import { TIME_SLOTS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ShoppingCart, Trash2, Pencil, X, CalendarIcon, Users, Clock, ArrowLeft, ArrowRight, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';
function calcHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return Math.max(diff / 60, 0.5);
}

function CartItemCard({ item, onRemove, onUpdate }: { item: CartItem; onRemove: () => void; onUpdate: (updates: Partial<CartItem>) => void }) {
  const { categoryMap, getCategoryIcon } = useCatalog();
  const [editing, setEditing] = useState(false);
  const [editDate, setEditDate] = useState<Date | undefined>(new Date(item.event_date + 'T12:00:00'));
  const [editStartTime, setEditStartTime] = useState(item.start_time);
  const [editEndTime, setEditEndTime] = useState(item.end_time);
  const [editGuests, setEditGuests] = useState(item.guest_count);

  const cat = categoryMap[item.service_snapshot.category];
  const isPerPerson = item.service_snapshot.price_unit === 'por persona';
  const isPerHour = item.service_snapshot.price_unit === 'por hora';
  const hasBaseEventHours = item.service_snapshot.price_unit === 'por evento' && item.service_snapshot.base_event_hours;

  const handleSaveEdit = () => {
    if (!editDate) return;

    const actualEndTime = hasBaseEventHours
      ? (() => {
          const [h, m] = editStartTime.split(':').map(Number);
          const totalMin = h * 60 + m + (item.service_snapshot.base_event_hours! * 60);
          const eh = Math.floor(totalMin / 60);
          const em = Math.round(totalMin % 60);
          return `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;
        })()
      : editEndTime;

    const eventHours = hasBaseEventHours ? item.service_snapshot.base_event_hours! : calcHours(editStartTime, actualEndTime);

    let baseTotal = item.service_snapshot.base_price;
    if (isPerPerson) baseTotal = item.service_snapshot.base_price * editGuests;
    if (isPerHour) baseTotal = item.service_snapshot.base_price * eventHours;

    // Recalculate extras total (keep same extras, just recalc subtotals if needed)
    const extrasTotal = item.selected_extras.reduce((sum, ext) => sum + ext.subtotal, 0);

    onUpdate({
      event_date: format(editDate, 'yyyy-MM-dd'),
      start_time: editStartTime,
      end_time: actualEndTime,
      event_hours: eventHours,
      guest_count: editGuests,
      base_total: baseTotal,
      total: baseTotal + extrasTotal,
    });
    setEditing(false);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Image / Category placeholder */}
          <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
            {item.service_snapshot.image ? (
              <Image src={item.service_snapshot.image} alt={item.service_snapshot.title} width={80} height={80} className="object-cover w-full h-full" />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${cat?.color.split(' ')[0] || 'bg-gray-200'}`}>
                {cat && (() => { const CatIcon = getCategoryIcon(cat.slug); return <CatIcon className="h-8 w-8 text-muted-foreground/30" />; })()}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold truncate">{item.service_snapshot.title}</h3>
                <p className="text-xs text-muted-foreground">por {item.service_snapshot.provider_name}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(!editing)}>
                  {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onRemove}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {!editing ? (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <Badge variant="outline" className="gap-1"><CalendarIcon className="h-3 w-3" />{format(new Date(item.event_date + 'T12:00:00'), 'dd MMM yyyy', { locale: es })}</Badge>
                <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />{item.start_time} - {item.end_time}</Badge>
                <Badge variant="outline" className="gap-1"><Users className="h-3 w-3" />{item.guest_count} invitados</Badge>
              </div>
            ) : (
              <div className="mt-3 space-y-3 bg-muted/50 rounded-lg p-3">
                <div>
                  <Label className="text-xs">Fecha</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-start mt-1">
                        <CalendarIcon className="h-3 w-3 mr-2" />
                        {editDate ? format(editDate, 'PPP', { locale: es }) : 'Seleccionar'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={editDate} onSelect={setEditDate} disabled={(d) => d < new Date()} /></PopoverContent>
                  </Popover>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Inicio</Label>
                    <Select value={editStartTime} onValueChange={setEditStartTime}>
                      <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{TIME_SLOTS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {!hasBaseEventHours && (
                    <div>
                      <Label className="text-xs">Fin</Label>
                      <Select value={editEndTime} onValueChange={setEditEndTime}>
                        <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{TIME_SLOTS.filter(t => t.value > editStartTime).map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Invitados</Label>
                  <Input type="number" min={item.service_snapshot.min_guests} max={item.service_snapshot.max_guests} value={editGuests} onChange={(e) => setEditGuests(Number(e.target.value))} className="mt-1 h-8 text-xs" />
                </div>
                <Button size="sm" onClick={handleSaveEdit} className="w-full">Guardar cambios</Button>
              </div>
            )}

            {item.selected_extras.length > 0 && !editing && (
              <div className="mt-2 space-y-1">
                {item.selected_extras.map(ext => (
                  <div key={ext.extra_id} className="flex justify-between text-xs text-muted-foreground">
                    <span>{ext.name} x{ext.quantity}</span>
                    <span>${ext.subtotal.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-2 flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                Base: ${item.base_total.toLocaleString()}
                {item.extras_total > 0 && ` + Extras: $${item.extras_total.toLocaleString()}`}
              </span>
              <span className="font-bold text-lg">${item.total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CarritoPage() {
  const { items, removeItem, updateItem, cartTotal } = useCart();
  const { user } = useAuthContext();
  const router = useRouter();

  const handleCheckout = () => {
    if (!user) {
      router.push('/login?redirect=/checkout');
    } else {
      router.push('/checkout');
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-md mx-auto space-y-6">
          <div className="w-24 h-24 mx-auto bg-muted rounded-full flex items-center justify-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Tu carrito esta vacio</h1>
          <p className="text-muted-foreground">Explora nuestros servicios y agrega los que necesites para tu evento.</p>
          <Button asChild size="lg">
            <Link href="/servicios"><ShoppingCart className="h-4 w-4 mr-2" />Explorar Servicios</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Group items by provider
  const byProvider = items.reduce<Record<string, CartItem[]>>((acc, item) => {
    const key = item.service_snapshot.provider_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="mb-6"><Link href="/servicios"><ArrowLeft className="h-4 w-4 mr-2" />Seguir comprando</Link></Button>

      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <ShoppingCart className="h-6 w-6" />
        Tu Carrito ({items.length} {items.length === 1 ? 'servicio' : 'servicios'})
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-6">
          {Object.entries(byProvider).map(([providerId, providerItems]) => (
            <div key={providerId}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Proveedor: {providerItems[0].service_snapshot.provider_name}
              </h3>
              <div className="space-y-3">
                {providerItems.map(item => (
                  <CartItemCard
                    key={item.id}
                    item={item}
                    onRemove={() => removeItem(item.id)}
                    onUpdate={(updates) => updateItem(item.id, updates)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-lg">Resumen del pedido</h2>
              <div className="space-y-2 text-sm">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between">
                    <span className="truncate mr-2">{item.service_snapshot.title}</span>
                    <span className="shrink-0">${item.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${cartTotal.toLocaleString()}</span>
              </div>

              <Button className="w-full" size="lg" onClick={handleCheckout}>
                Proceder al Checkout
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              {!user && (
                <p className="text-xs text-muted-foreground text-center">
                  Necesitaras iniciar sesion o crear una cuenta para completar tu compra.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
