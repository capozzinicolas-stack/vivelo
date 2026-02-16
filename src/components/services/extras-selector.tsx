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
}

export function ExtrasSelector({ extras, selectedExtras, onSelectionChange }: Props) {
  const getSelected = (id: string) => selectedExtras.find((s) => s.extra_id === id);

  const toggle = (extra: Extra) => {
    if (getSelected(extra.id)) {
      onSelectionChange(selectedExtras.filter((s) => s.extra_id !== extra.id));
    } else {
      onSelectionChange([...selectedExtras, { extra_id: extra.id, quantity: 1 }]);
    }
  };

  const updateQty = (id: string, delta: number) => {
    const extra = extras.find((e) => e.id === id);
    if (!extra) return;
    onSelectionChange(selectedExtras.map((s) => s.extra_id !== id ? s : { ...s, quantity: Math.max(1, Math.min(extra.max_quantity, s.quantity + delta)) }));
  };

  if (!extras.length) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg">Extras disponibles</h3>
      {extras.map((extra) => {
        const sel = getSelected(extra.id);
        const checked = !!sel;
        const qty = sel?.quantity ?? 1;
        return (
          <div key={extra.id} className={`rounded-lg border p-4 transition-colors ${checked ? 'border-primary bg-primary/5' : ''}`}>
            <div className="flex items-start gap-3">
              <Checkbox checked={checked} onCheckedChange={() => toggle(extra)} className="mt-0.5" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{extra.name}</span>
                    <Badge variant="outline" className="text-xs">{extra.price_type === 'fixed' ? 'Precio fijo' : 'Por persona'}</Badge>
                  </div>
                  <span className="font-semibold">${extra.price.toLocaleString()}</span>
                </div>
                {extra.description && <p className="text-sm text-muted-foreground">{extra.description}</p>}
                {checked && extra.max_quantity > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Cantidad:</span>
                      <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(extra.id, -1)} disabled={qty <= 1}><Minus className="h-3 w-3" /></Button>
                      <span className="w-8 text-center text-sm font-medium">{qty}</span>
                      <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(extra.id, 1)} disabled={qty >= extra.max_quantity}><Plus className="h-3 w-3" /></Button>
                      <span className="text-xs text-muted-foreground">(max {extra.max_quantity})</span>
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
