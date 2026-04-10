'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PROVIDER_PROMO_LIMITS } from '@/lib/constants';
import type { Campaign, Service } from '@/types/database';

export type EditingPromotion = Omit<Campaign, 'subscriptions'> & {
  subscriptions?: Array<{ id: string; service_id: string }>;
};

interface PromotionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: Service[];
  editing?: EditingPromotion | null; // null/undefined = create mode
  onSaved: () => void;
}

function generateCouponCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function PromotionFormDialog({ open, onOpenChange, services, editing, onSaved }: PromotionFormDialogProps) {
  const { toast } = useToast();
  const isEdit = !!editing;
  const usedCount = editing?.used_count ?? 0;
  const contentLocked = isEdit && usedCount > 0; // only status toggles allowed

  const [loading, setLoading] = useState(false);
  const [internalName, setInternalName] = useState('');
  const [externalName, setExternalName] = useState('');
  const [description, setDescription] = useState('');
  const [discountPct, setDiscountPct] = useState<number>(10);
  const [couponCode, setCouponCode] = useState('');
  const [startDate, setStartDate] = useState<string>(todayISO());
  const [endDate, setEndDate] = useState<string>(todayISO(14));
  const [usageLimit, setUsageLimit] = useState<string>('');
  const [maxUsesPerUser, setMaxUsesPerUser] = useState<string>('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setInternalName(editing.internal_name || '');
      setExternalName(editing.external_name || '');
      setDescription(editing.description || '');
      setDiscountPct(editing.discount_pct || 10);
      setCouponCode(editing.coupon_code || '');
      setStartDate((editing.start_date || '').slice(0, 10));
      setEndDate((editing.end_date || '').slice(0, 10));
      setUsageLimit(editing.usage_limit != null ? String(editing.usage_limit) : '');
      setMaxUsesPerUser(editing.max_uses_per_user != null ? String(editing.max_uses_per_user) : '');
      const subIds = (editing.subscriptions || []).map(s => s.service_id).filter(Boolean);
      setSelectedServiceIds(subIds);
    } else {
      setInternalName('');
      setExternalName('');
      setDescription('');
      setDiscountPct(10);
      setCouponCode(generateCouponCode());
      setStartDate(todayISO());
      setEndDate(todayISO(14));
      setUsageLimit('');
      setMaxUsesPerUser('');
      setSelectedServiceIds([]);
    }
    setCopied(false);
  }, [open, editing]);

  const activeServices = useMemo(() => services.filter(s => s.status === 'active'), [services]);

  const toggleService = (id: string) => {
    setSelectedServiceIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const shareUrl = useMemo(() => {
    if (!couponCode) return '';
    const firstService = services.find(s => s.id === selectedServiceIds[0]);
    if (!firstService) return '';
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://solovivelo.com';
    return `${base}/servicios/${firstService.slug || firstService.id}?coupon=${couponCode.toUpperCase()}`;
  }, [couponCode, selectedServiceIds, services]);

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'No se pudo copiar', variant: 'destructive' });
    }
  };

  const validate = (): string | null => {
    if (!contentLocked) {
      if (!internalName.trim()) return 'Nombre interno requerido';
      if (!externalName.trim()) return 'Nombre publico requerido';
      if (discountPct < PROVIDER_PROMO_LIMITS.MIN_DISCOUNT_PCT || discountPct > PROVIDER_PROMO_LIMITS.MAX_DISCOUNT_PCT) {
        return `El descuento debe estar entre ${PROVIDER_PROMO_LIMITS.MIN_DISCOUNT_PCT}% y ${PROVIDER_PROMO_LIMITS.MAX_DISCOUNT_PCT}%`;
      }
      if (selectedServiceIds.length === 0) return 'Selecciona al menos un servicio';
      if (!isEdit) {
        if (!PROVIDER_PROMO_LIMITS.COUPON_CODE_REGEX.test(couponCode)) {
          return 'Codigo de cupon invalido (solo mayusculas y numeros)';
        }
        if (
          couponCode.length < PROVIDER_PROMO_LIMITS.COUPON_CODE_MIN_LENGTH ||
          couponCode.length > PROVIDER_PROMO_LIMITS.COUPON_CODE_MAX_LENGTH
        ) {
          return `El codigo debe tener entre ${PROVIDER_PROMO_LIMITS.COUPON_CODE_MIN_LENGTH} y ${PROVIDER_PROMO_LIMITS.COUPON_CODE_MAX_LENGTH} caracteres`;
        }
        if (!startDate) return 'Fecha de inicio requerida';
      }
      if (!endDate) return 'Fecha de fin requerida';
      const s = new Date(isEdit ? (editing!.start_date || '') : startDate);
      const e = new Date(endDate);
      if (e <= s) return 'La fecha de fin debe ser posterior a la de inicio';
      const diffDays = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < PROVIDER_PROMO_LIMITS.MIN_DAYS_DURATION || diffDays > PROVIDER_PROMO_LIMITS.MAX_DAYS_DURATION) {
        return `La duracion debe ser entre ${PROVIDER_PROMO_LIMITS.MIN_DAYS_DURATION} y ${PROVIDER_PROMO_LIMITS.MAX_DAYS_DURATION} dias`;
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      toast({ title: err, variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      if (isEdit) {
        const payload: Record<string, unknown> = {};
        if (!contentLocked) {
          payload.external_name = externalName;
          payload.description = description || null;
          payload.discount_pct = discountPct;
          payload.end_date = endDate;
          payload.usage_limit = usageLimit ? parseInt(usageLimit, 10) : null;
          payload.max_uses_per_user = maxUsesPerUser ? parseInt(maxUsesPerUser, 10) : null;
          payload.service_ids = selectedServiceIds;
        }
        const res = await fetch(`/api/provider/promotions/${editing!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error actualizando promocion');
        toast({ title: 'Promocion actualizada' });
      } else {
        const payload = {
          internal_name: internalName,
          external_name: externalName,
          description: description || null,
          discount_pct: discountPct,
          start_date: startDate,
          end_date: endDate,
          coupon_code: couponCode.toUpperCase(),
          usage_limit: usageLimit ? parseInt(usageLimit, 10) : null,
          max_uses_per_user: maxUsesPerUser ? parseInt(maxUsesPerUser, 10) : null,
          service_ids: selectedServiceIds,
          status: 'active' as const,
        };
        const res = await fetch('/api/provider/promotions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error creando promocion');
        toast({ title: 'Promocion creada', description: 'Ya puedes compartir el link del cupon.' });
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error desconocido', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar promocion' : 'Crear promocion'}</DialogTitle>
          <DialogDescription>
            {contentLocked
              ? 'Esta promocion ya fue usada por clientes, solo puedes activarla o pausarla.'
              : 'Tu absorbes el 100% del descuento. Comparte el link del cupon en tus redes sociales.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="internal_name">Nombre interno (solo tu lo ves)</Label>
            <Input
              id="internal_name"
              value={internalName}
              onChange={e => setInternalName(e.target.value)}
              placeholder="Ej: Promo Primavera 2025"
              disabled={contentLocked || isEdit}
              maxLength={200}
            />
          </div>

          <div>
            <Label htmlFor="external_name">Nombre publico (visible al cliente)</Label>
            <Input
              id="external_name"
              value={externalName}
              onChange={e => setExternalName(e.target.value)}
              placeholder="Ej: Descuento especial de primavera"
              disabled={contentLocked}
              maxLength={200}
            />
          </div>

          <div>
            <Label htmlFor="description">Descripcion (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalles de la promocion"
              disabled={contentLocked}
              rows={2}
              maxLength={1000}
            />
          </div>

          <div>
            <Label>Descuento: {discountPct}%</Label>
            <Slider
              value={[discountPct]}
              onValueChange={([v]) => setDiscountPct(v)}
              min={PROVIDER_PROMO_LIMITS.MIN_DISCOUNT_PCT}
              max={PROVIDER_PROMO_LIMITS.MAX_DISCOUNT_PCT}
              step={1}
              disabled={contentLocked}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Rango: {PROVIDER_PROMO_LIMITS.MIN_DISCOUNT_PCT}% - {PROVIDER_PROMO_LIMITS.MAX_DISCOUNT_PCT}%
            </p>
          </div>

          <div>
            <Label htmlFor="coupon_code">Codigo de cupon</Label>
            <div className="flex gap-2">
              <Input
                id="coupon_code"
                value={couponCode}
                onChange={e => setCouponCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="MI-CODIGO"
                disabled={isEdit}
                maxLength={PROVIDER_PROMO_LIMITS.COUPON_CODE_MAX_LENGTH}
                className="font-mono"
              />
              {!isEdit && (
                <Button type="button" variant="outline" onClick={() => setCouponCode(generateCouponCode())}>
                  <Sparkles className="h-4 w-4 mr-1" />
                  Generar
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isEdit
                ? 'El codigo no se puede cambiar despues de crear la promocion.'
                : `${PROVIDER_PROMO_LIMITS.COUPON_CODE_MIN_LENGTH}-${PROVIDER_PROMO_LIMITS.COUPON_CODE_MAX_LENGTH} caracteres, solo mayusculas y numeros.`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="start_date">Fecha inicio</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                disabled={isEdit}
              />
            </div>
            <div>
              <Label htmlFor="end_date">Fecha fin</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                disabled={contentLocked}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="usage_limit">Limite total de usos (opcional)</Label>
              <Input
                id="usage_limit"
                type="number"
                min={1}
                value={usageLimit}
                onChange={e => setUsageLimit(e.target.value)}
                placeholder="Ej: 100"
                disabled={contentLocked}
              />
            </div>
            <div>
              <Label htmlFor="max_uses_per_user">Max. usos por cliente (opcional)</Label>
              <Input
                id="max_uses_per_user"
                type="number"
                min={1}
                value={maxUsesPerUser}
                onChange={e => setMaxUsesPerUser(e.target.value)}
                placeholder="Ej: 1"
                disabled={contentLocked}
              />
            </div>
          </div>

          <div>
            <Label>Servicios cubiertos</Label>
            <div className="mt-2 border rounded-md divide-y max-h-56 overflow-y-auto">
              {activeServices.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">No tienes servicios activos.</p>
              )}
              {activeServices.map(s => (
                <label key={s.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50">
                  <Checkbox
                    checked={selectedServiceIds.includes(s.id)}
                    onCheckedChange={() => toggleService(s.id)}
                    disabled={contentLocked}
                  />
                  <span className="text-sm flex-1 truncate">{s.title}</span>
                  <Badge variant="outline" className="text-xs">{s.category}</Badge>
                </label>
              ))}
            </div>
          </div>

          {shareUrl && (
            <div className="rounded-md bg-muted p-3 space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Link compartible (preview)</Label>
              <div className="flex items-center gap-2">
                <code className="text-xs break-all flex-1">{shareUrl}</code>
                <Button size="sm" variant="ghost" type="button" onClick={copyShareUrl} aria-label="Copiar link">
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? 'Guardar cambios' : 'Crear promocion'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
