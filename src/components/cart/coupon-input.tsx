'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tag, Loader2, X, Check } from 'lucide-react';
import { validateCouponClient } from '@/lib/supabase/queries';
import type { CartItem } from '@/providers/cart-provider';
import { useToast } from '@/hooks/use-toast';

interface CouponInputProps {
  item: CartItem;
  onApply: (updates: Partial<CartItem>) => void;
}

/**
 * Componente de input de cupon para un item del carrito.
 * Si el item ya tiene un cupon aplicado, muestra el badge con boton de remover.
 * Si no, muestra el boton colapsable "Tienes un cupon?" y el input.
 */
export function CouponInput({ item, onApply }: CouponInputProps) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const hasCoupon = !!item.coupon_code && !!item.campaign_id;

  const handleApply = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    try {
      const result = await validateCouponClient(item.service_id, trimmed);
      if (!result.valid) {
        toast({ title: 'Cupon invalido', description: result.error, variant: 'destructive' });
        return;
      }
      const discountPct = result.campaign.discount_pct;
      const discountAmount = Math.round(item.total * (discountPct / 100));
      const newTotal = item.total - discountAmount;
      onApply({
        campaign_id: result.campaign.id,
        discount_pct: discountPct,
        discount_amount: discountAmount,
        original_total: item.total,
        coupon_code: result.campaign.coupon_code || trimmed,
        total: newTotal,
      });
      toast({ title: 'Cupon aplicado', description: `Descuento de ${discountPct}% aplicado.` });
      setCode('');
      setExpanded(false);
    } catch (e) {
      toast({
        title: 'Error validando cupon',
        description: e instanceof Error ? e.message : 'Error desconocido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    const restored = item.original_total ?? item.total + (item.discount_amount ?? 0);
    onApply({
      campaign_id: undefined,
      discount_pct: undefined,
      discount_amount: undefined,
      original_total: undefined,
      coupon_code: undefined,
      total: restored,
    });
    toast({ title: 'Cupon removido' });
  };

  if (hasCoupon) {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-2">
        <Check className="h-4 w-4 text-green-600 shrink-0" />
        <div className="flex-1 min-w-0 text-xs">
          <span className="font-medium text-green-800">Cupon aplicado: </span>
          <code className="font-mono font-semibold">{item.coupon_code}</code>
          <span className="text-green-700">
            {' '}· {item.discount_pct}% OFF (-${(item.discount_amount || 0).toLocaleString()})
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-green-700 hover:text-red-600"
          onClick={handleRemove}
          aria-label="Quitar cupon"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mt-2 text-xs text-deep-purple hover:underline flex items-center gap-1"
      >
        <Tag className="h-3 w-3" />
        ¿Tienes un codigo de promocion?
      </button>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <Input
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase())}
        placeholder="CODIGO"
        className="h-8 text-xs font-mono"
        maxLength={32}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleApply();
          }
        }}
      />
      <Button size="sm" onClick={handleApply} disabled={loading || !code.trim()} className="h-8">
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Aplicar'}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 px-2"
        onClick={() => {
          setExpanded(false);
          setCode('');
        }}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/**
 * Badge de descuento aplicado. Para mostrar en la columna del total del item.
 */
export function DiscountBadge({ item }: { item: CartItem }) {
  if (!item.discount_amount || !item.discount_pct) return null;
  return (
    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
      -{item.discount_pct}%
    </Badge>
  );
}
