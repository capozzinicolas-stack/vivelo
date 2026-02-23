'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';
import type { Extra } from '@/types/database';

export interface SelectedExtraItem { extra_id: string; quantity: number; }

interface Props {
  extras: Extra[];
  selectedExtras: SelectedExtraItem[];
  onSelectionChange: (sel: SelectedExtraItem[]) => void;
  guests: number;
  eventHours: number;
}

// Extras quantity rules:
// - Extra starts at 0 (not selected). Only when the client toggles it on:
//   - If depends_on_guests: min quantity = event guest count, initial quantity = guest count
//   - If depends_on_hours: min quantity = event hours, initial quantity = event hours
//   - Otherwise: min quantity = 1, initial quantity = 1
// - Max quantity is always extra.max_quantity (defined by the provider)
// - Subtotal = extra.price × extra quantity (service quantity NEVER multiplies extras)

function getMinQty(extra: Extra, guests: number, eventHours: number): number {
  if (extra.depends_on_guests) return Math.max(1, guests);
  if (extra.depends_on_hours) return Math.max(1, Math.ceil(eventHours));
  return 1;
}

export function ExtrasSelector({ extras, selectedExtras, onSelectionChange, guests, eventHours }: Props) {
  const getSelected = (id: string) => selectedExtras.find((s) => s.extra_id === id);

  const toggle = (extra: Extra) => {
    if (getSelected(extra.id)) {
      onSelectionChange(selectedExtras.filter((s) => s.extra_id !== extra.id));
    } else {
      const minQty = getMinQty(extra, guests, eventHours);
      const initialQty = Math.min(minQty, extra.max_quantity);
      onSelectionChange([...selectedExtras, { extra_id: extra.id, quantity: initialQty }]);
    }
  };

  const updateQty = (id: string, delta: number) => {
    const extra = extras.find((e) => e.id === id);
    if (!extra) return;
    const minQty = getMinQty(extra, guests, eventHours);
    onSelectionChange(selectedExtras.map((s) =>
      s.extra_id !== id ? s : { ...s, quantity: Math.max(minQty, Math.min(extra.max_quantity, s.quantity + delta)) }
    ));
  };

  if (!extras.length) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg">Extras disponibles</h3>
      {extras.map((extra) => {
        const sel = getSelected(extra.id);
        const checked = !!sel;
        const qty = sel?.quantity ?? 0;
        const minQty = getMinQty(extra, guests, eventHours);

        return (
          <div key={extra.id} className={`rounded-lg border p-4 transition-colors ${checked ? 'border-primary bg-primary/5' : ''}`}>
            <div className="flex items-start gap-3">
              <Checkbox checked={checked} onCheckedChange={() => toggle(extra)} className="mt-0.5" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{extra.name}</span>
                    <Badge variant="outline" className="text-xs">{extra.price_type === 'fixed' ? 'Precio fijo' : extra.price_type === 'per_hour' ? 'Por hora' : 'Por persona'}</Badge>
                  </div>
                  <span className="font-semibold">${extra.price.toLocaleString()}</span>
                </div>
                {extra.description && <p className="text-sm text-muted-foreground">{extra.description}</p>}
                {checked && (
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Cantidad:</span>
                      <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(extra.id, -1)} disabled={qty <= minQty}><Minus className="h-3 w-3" /></Button>
                      <span className="w-8 text-center text-sm font-medium">{qty}</span>
                      <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(extra.id, 1)} disabled={qty >= extra.max_quantity}><Plus className="h-3 w-3" /></Button>
                      <span className="text-xs text-muted-foreground">
                        ({minQty > 1 ? `min ${minQty} · ` : ''}max {extra.max_quantity})
                      </span>
                    </div>
                    <span className="text-sm font-medium">Subtotal: ${(extra.price * qty).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
