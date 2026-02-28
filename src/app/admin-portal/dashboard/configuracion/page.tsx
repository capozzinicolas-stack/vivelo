'use client';

import { useState, useEffect, useCallback } from 'react';
import { COMMISSION_RATE } from '@/lib/constants';
import { getCancellationPolicies, createCancellationPolicy, updateCancellationPolicy, deleteCancellationPolicy, getProvidersWithCommission } from '@/lib/supabase/queries';
import { useCatalog } from '@/providers/catalog-provider';
import { getIcon, availableIcons } from '@/lib/icon-registry';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Percent, MapPin, Tag, FileText, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import type { CancellationPolicy, CancellationRule, CatalogCategory, CatalogSubcategory, CatalogZone } from '@/types/database';

const COLOR_PRESETS = [
  { value: 'bg-orange-100 text-orange-600', label: 'Naranja' },
  { value: 'bg-blue-100 text-blue-600', label: 'Azul' },
  { value: 'bg-pink-100 text-pink-600', label: 'Rosa' },
  { value: 'bg-purple-100 text-purple-600', label: 'Morado' },
  { value: 'bg-green-100 text-green-600', label: 'Verde' },
  { value: 'bg-amber-100 text-amber-600', label: 'Ambar' },
  { value: 'bg-red-100 text-red-600', label: 'Rojo' },
  { value: 'bg-teal-100 text-teal-600', label: 'Teal' },
  { value: 'bg-gray-100 text-gray-600', label: 'Gris' },
];

function formatRuleSummary(rules: CancellationRule[]): string {
  return rules
    .sort((a, b) => b.min_hours - a.min_hours)
    .map(r => {
      const minLabel = r.min_hours >= 24 ? `${Math.round(r.min_hours / 24)}d` : `${r.min_hours}h`;
      if (r.max_hours === null) return `>${minLabel} → ${r.refund_percent}%`;
      const maxLabel = r.max_hours >= 24 ? `${Math.round(r.max_hours / 24)}d` : `${r.max_hours}h`;
      return `${minLabel}-${maxLabel} → ${r.refund_percent}%`;
    })
    .join(', ');
}

interface RuleInput {
  min_hours: string;
  max_hours: string;
  refund_percent: string;
}

export default function AdminConfiguracionPage() {
  const { toast } = useToast();
  const { categories, subcategories, zones, refresh: refreshCatalog } = useCatalog();
  const [policies, setPolicies] = useState<CancellationPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [commissionStats, setCommissionStats] = useState<{ avg: number; min: number; max: number; count: number }>({ avg: COMMISSION_RATE, min: COMMISSION_RATE, max: COMMISSION_RATE, count: 0 });

  // Cancellation policy dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<CancellationPolicy | null>(null);
  const [policyName, setPolicyName] = useState('');
  const [policyDescription, setPolicyDescription] = useState('');
  const [policyRules, setPolicyRules] = useState<RuleInput[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CancellationPolicy | null>(null);

  // Catalog dialogs
  const [catalogDialog, setCatalogDialog] = useState<{ type: 'category' | 'subcategory' | 'zone'; editing: boolean } | null>(null);
  const [catalogSaving, setCatalogSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState<{ type: 'category' | 'subcategory' | 'zone'; slug: string; label: string } | null>(null);

  // Category form
  const [catSlug, setCatSlug] = useState('');
  const [catLabel, setCatLabel] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catIcon, setCatIcon] = useState('Tag');
  const [catColor, setCatColor] = useState('bg-gray-100 text-gray-600');
  const [catSkuPrefix, setCatSkuPrefix] = useState('');
  const [catSortOrder, setCatSortOrder] = useState('0');
  const [catIsActive, setCatIsActive] = useState(true);
  const [editingCatSlug, setEditingCatSlug] = useState('');

  // Subcategory form
  const [subSlug, setSubSlug] = useState('');
  const [subLabel, setSubLabel] = useState('');
  const [subCategorySlug, setSubCategorySlug] = useState('');
  const [subSortOrder, setSubSortOrder] = useState('0');
  const [subIsActive, setSubIsActive] = useState(true);
  const [editingSubSlug, setEditingSubSlug] = useState('');

  // Zone form
  const [zoneSlug, setZoneSlug] = useState('');
  const [zoneLabel, setZoneLabel] = useState('');
  const [zoneSortOrder, setZoneSortOrder] = useState('0');
  const [zoneIsActive, setZoneIsActive] = useState(true);
  const [editingZoneSlug, setEditingZoneSlug] = useState('');

  const loadPolicies = useCallback(async () => {
    try {
      const [data, providers] = await Promise.all([getCancellationPolicies(), getProvidersWithCommission()]);
      setPolicies(data);
      if (providers.length > 0) {
        const rates = providers.map(p => p.commission_rate ?? COMMISSION_RATE);
        const totalSvc = providers.reduce((s, p) => s + p.service_count, 0);
        const weightedAvg = totalSvc > 0
          ? providers.reduce((s, p) => s + (p.commission_rate ?? COMMISSION_RATE) * p.service_count, 0) / totalSvc
          : rates.reduce((s, r) => s + r, 0) / rates.length;
        setCommissionStats({ avg: weightedAvg, min: Math.min(...rates), max: Math.max(...rates), count: providers.length });
      }
    } catch {
      toast({ title: 'Error cargando configuracion', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadPolicies(); }, [loadPolicies]);

  // ─── Cancellation Policy handlers ─────────────────────────

  const openCreatePolicy = () => {
    setEditingPolicy(null);
    setPolicyName('');
    setPolicyDescription('');
    setPolicyRules([{ min_hours: '', max_hours: '', refund_percent: '' }]);
    setDialogOpen(true);
  };

  const openEditPolicy = (policy: CancellationPolicy) => {
    setEditingPolicy(policy);
    setPolicyName(policy.name);
    setPolicyDescription(policy.description || '');
    setPolicyRules(policy.rules.map(r => ({
      min_hours: r.min_hours.toString(),
      max_hours: r.max_hours !== null ? r.max_hours.toString() : '',
      refund_percent: r.refund_percent.toString(),
    })));
    setDialogOpen(true);
  };

  const addRule = () => setPolicyRules([...policyRules, { min_hours: '', max_hours: '', refund_percent: '' }]);
  const removeRule = (i: number) => setPolicyRules(policyRules.filter((_, idx) => idx !== i));
  const updateRule = (i: number, field: keyof RuleInput, value: string) => {
    const updated = [...policyRules];
    updated[i] = { ...updated[i], [field]: value };
    setPolicyRules(updated);
  };

  const handleSavePolicy = async () => {
    if (!policyName.trim()) { toast({ title: 'El nombre es requerido', variant: 'destructive' }); return; }
    const validRules = policyRules.filter(r => r.min_hours !== '' && r.refund_percent !== '');
    if (validRules.length === 0) { toast({ title: 'Agrega al menos una regla', variant: 'destructive' }); return; }
    const rules: CancellationRule[] = validRules.map(r => ({
      min_hours: parseFloat(r.min_hours),
      max_hours: r.max_hours ? parseFloat(r.max_hours) : null,
      refund_percent: parseInt(r.refund_percent),
    }));
    setSaving(true);
    try {
      if (editingPolicy) {
        await updateCancellationPolicy(editingPolicy.id, { name: policyName, description: policyDescription, rules });
        setPolicies(prev => prev.map(p => p.id === editingPolicy.id ? { ...p, name: policyName, description: policyDescription, rules } : p));
        toast({ title: 'Politica actualizada!' });
      } else {
        const created = await createCancellationPolicy({ name: policyName, description: policyDescription, rules });
        setPolicies(prev => [...prev, created]);
        toast({ title: 'Politica creada!' });
      }
      setDialogOpen(false);
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error desconocido', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDeletePolicy = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCancellationPolicy(deleteTarget.id);
      setPolicies(prev => prev.filter(p => p.id !== deleteTarget.id));
      toast({ title: 'Politica eliminada' });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error desconocido', variant: 'destructive' });
    } finally { setDeleteTarget(null); }
  };

  // ─── Catalog CRUD handlers ────────────────────────────────

  const openCreateCatalog = (type: 'category' | 'subcategory' | 'zone') => {
    setCatalogDialog({ type, editing: false });
    if (type === 'category') {
      setCatSlug(''); setCatLabel(''); setCatDescription(''); setCatIcon('Tag');
      setCatColor('bg-gray-100 text-gray-600'); setCatSkuPrefix(''); setCatSortOrder('0'); setCatIsActive(true);
    } else if (type === 'subcategory') {
      setSubSlug(''); setSubLabel(''); setSubCategorySlug(categories[0]?.slug || '');
      setSubSortOrder('0'); setSubIsActive(true);
    } else {
      setZoneSlug(''); setZoneLabel(''); setZoneSortOrder('0'); setZoneIsActive(true);
    }
  };

  const openEditCategory = (cat: CatalogCategory) => {
    setCatalogDialog({ type: 'category', editing: true });
    setEditingCatSlug(cat.slug); setCatSlug(cat.slug); setCatLabel(cat.label);
    setCatDescription(cat.description); setCatIcon(cat.icon); setCatColor(cat.color);
    setCatSkuPrefix(cat.sku_prefix); setCatSortOrder(cat.sort_order.toString()); setCatIsActive(cat.is_active);
  };

  const openEditSubcategory = (sub: CatalogSubcategory) => {
    setCatalogDialog({ type: 'subcategory', editing: true });
    setEditingSubSlug(sub.slug); setSubSlug(sub.slug); setSubLabel(sub.label);
    setSubCategorySlug(sub.category_slug); setSubSortOrder(sub.sort_order.toString()); setSubIsActive(sub.is_active);
  };

  const openEditZone = (zone: CatalogZone) => {
    setCatalogDialog({ type: 'zone', editing: true });
    setEditingZoneSlug(zone.slug); setZoneSlug(zone.slug); setZoneLabel(zone.label);
    setZoneSortOrder(zone.sort_order.toString()); setZoneIsActive(zone.is_active);
  };

  const handleSaveCatalog = async () => {
    if (!catalogDialog) return;
    setCatalogSaving(true);
    try {
      const { type, editing } = catalogDialog;
      if (type === 'category') {
        if (!catLabel.trim() || !catSkuPrefix.trim()) {
          toast({ title: 'Label y SKU prefix son requeridos', variant: 'destructive' }); setCatalogSaving(false); return;
        }
        if (editing) {
          const res = await fetch(`/api/admin/catalog/${editingCatSlug}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'category', data: { label: catLabel, description: catDescription, icon: catIcon, color: catColor, sku_prefix: catSkuPrefix, sort_order: parseInt(catSortOrder) || 0, is_active: catIsActive } }),
          });
          if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        } else {
          if (!catSlug.trim()) { toast({ title: 'Slug es requerido', variant: 'destructive' }); setCatalogSaving(false); return; }
          const res = await fetch('/api/admin/catalog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'category', data: { slug: catSlug, label: catLabel, description: catDescription, icon: catIcon, color: catColor, sku_prefix: catSkuPrefix, sort_order: parseInt(catSortOrder) || 0, is_active: catIsActive } }),
          });
          if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        }
      } else if (type === 'subcategory') {
        if (!subLabel.trim() || !subCategorySlug) {
          toast({ title: 'Label y categoria padre son requeridos', variant: 'destructive' }); setCatalogSaving(false); return;
        }
        if (editing) {
          const res = await fetch(`/api/admin/catalog/${editingSubSlug}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'subcategory', data: { label: subLabel, category_slug: subCategorySlug, sort_order: parseInt(subSortOrder) || 0, is_active: subIsActive } }),
          });
          if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        } else {
          if (!subSlug.trim()) { toast({ title: 'Slug es requerido', variant: 'destructive' }); setCatalogSaving(false); return; }
          const res = await fetch('/api/admin/catalog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'subcategory', data: { slug: subSlug, label: subLabel, category_slug: subCategorySlug, sort_order: parseInt(subSortOrder) || 0, is_active: subIsActive } }),
          });
          if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        }
      } else {
        if (!zoneLabel.trim()) { toast({ title: 'Label es requerido', variant: 'destructive' }); setCatalogSaving(false); return; }
        if (editing) {
          const res = await fetch(`/api/admin/catalog/${editingZoneSlug}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'zone', data: { label: zoneLabel, sort_order: parseInt(zoneSortOrder) || 0, is_active: zoneIsActive } }),
          });
          if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        } else {
          if (!zoneSlug.trim()) { toast({ title: 'Slug es requerido', variant: 'destructive' }); setCatalogSaving(false); return; }
          const res = await fetch('/api/admin/catalog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'zone', data: { slug: zoneSlug, label: zoneLabel, sort_order: parseInt(zoneSortOrder) || 0, is_active: zoneIsActive } }),
          });
          if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        }
      }
      toast({ title: editing ? 'Actualizado!' : 'Creado!' });
      setCatalogDialog(null);
      await refreshCatalog();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error desconocido', variant: 'destructive' });
    } finally { setCatalogSaving(false); }
  };

  const handleDeleteCatalog = async () => {
    if (!deleteItem) return;
    try {
      const res = await fetch(`/api/admin/catalog/${deleteItem.slug}?type=${deleteItem.type}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast({ title: 'Eliminado!' });
      setDeleteItem(null);
      await refreshCatalog();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error desconocido', variant: 'destructive' });
      setDeleteItem(null);
    }
  };

  const handleToggleActive = async (type: 'category' | 'subcategory' | 'zone', slug: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/catalog/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data: { is_active: !currentActive } }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      await refreshCatalog();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error desconocido', variant: 'destructive' });
    }
  };

  const activeCategories = categories.filter(c => c.is_active);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Configuracion de la Plataforma</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Percent className="h-5 w-5" /> Comisiones</CardTitle>
            <CardDescription>Tasas de comision por proveedor — gestionables desde Proveedores</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
              <span className="text-sm font-medium">Promedio ponderado</span>
              <span className="text-2xl font-bold text-primary">{(commissionStats.avg * 100).toFixed(1)}%</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Minima</p>
                <p className="text-lg font-semibold">{(commissionStats.min * 100).toFixed(1)}%</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Base (default)</p>
                <p className="text-lg font-semibold">{(COMMISSION_RATE * 100).toFixed(0)}%</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Maxima</p>
                <p className="text-lg font-semibold">{(commissionStats.max * 100).toFixed(1)}%</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{commissionStats.count} proveedores activos. Gestiona tasas individuales en <a href="/dashboard/proveedores" className="text-primary underline">Proveedores</a>.</p>
          </CardContent>
        </Card>
      </div>

      {/* Catalog Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Tag className="h-5 w-5" /> Catalogo Dinamico</CardTitle>
          <CardDescription>Gestiona categorias, subcategorias y zonas de servicio</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="categories">
            <TabsList className="mb-4">
              <TabsTrigger value="categories">Categorias ({categories.length})</TabsTrigger>
              <TabsTrigger value="subcategories">Subcategorias ({subcategories.length})</TabsTrigger>
              <TabsTrigger value="zones">Zonas ({zones.length})</TabsTrigger>
            </TabsList>

            {/* Categories Tab */}
            <TabsContent value="categories">
              <div className="flex justify-end mb-4">
                <Button onClick={() => openCreateCatalog('category')} size="sm"><Plus className="h-4 w-4 mr-1" />Agregar Categoria</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[120px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map(cat => {
                    const Icon = getIcon(cat.icon);
                    return (
                      <TableRow key={cat.slug}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge className={cat.color}><Icon className="h-3 w-3 mr-1" />{cat.label}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{cat.description}</p>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{cat.slug}</TableCell>
                        <TableCell className="font-mono text-xs">{cat.sku_prefix}</TableCell>
                        <TableCell>
                          <Switch checked={cat.is_active} onCheckedChange={() => handleToggleActive('category', cat.slug, cat.is_active)} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditCategory(cat)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteItem({ type: 'category', slug: cat.slug, label: cat.label })}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Subcategories Tab */}
            <TabsContent value="subcategories">
              <div className="flex justify-end mb-4">
                <Button onClick={() => openCreateCatalog('subcategory')} size="sm"><Plus className="h-4 w-4 mr-1" />Agregar Subcategoria</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[120px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subcategories.map(sub => {
                    const parentCat = categories.find(c => c.slug === sub.category_slug);
                    return (
                      <TableRow key={sub.slug}>
                        <TableCell className="font-medium">{sub.label}</TableCell>
                        <TableCell className="font-mono text-xs">{sub.slug}</TableCell>
                        <TableCell>
                          {parentCat && <Badge variant="outline" className="text-xs">{parentCat.label}</Badge>}
                        </TableCell>
                        <TableCell>
                          <Switch checked={sub.is_active} onCheckedChange={() => handleToggleActive('subcategory', sub.slug, sub.is_active)} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditSubcategory(sub)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteItem({ type: 'subcategory', slug: sub.slug, label: sub.label })}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Zones Tab */}
            <TabsContent value="zones">
              <div className="flex justify-end mb-4">
                <Button onClick={() => openCreateCatalog('zone')} size="sm"><Plus className="h-4 w-4 mr-1" />Agregar Zona</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Orden</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[120px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zones.map(zone => (
                    <TableRow key={zone.slug}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{zone.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{zone.slug}</TableCell>
                      <TableCell>{zone.sort_order}</TableCell>
                      <TableCell>
                        <Switch checked={zone.is_active} onCheckedChange={() => handleToggleActive('zone', zone.slug, zone.is_active)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditZone(zone)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteItem({ type: 'zone', slug: zone.slug, label: zone.label })}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Cancellation Policies CRUD */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Politicas de Cancelacion</CardTitle>
            <CardDescription>Reglas de reembolso que los proveedores pueden asignar a sus servicios</CardDescription>
          </div>
          <Button onClick={openCreatePolicy} size="sm"><Plus className="h-4 w-4 mr-1" />Crear Politica</Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : policies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No hay politicas. Crea la primera.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Reglas</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{p.name}</span>
                        {p.is_default && <Badge variant="secondary" className="ml-2 text-xs">Default</Badge>}
                      </div>
                      {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{formatRuleSummary(p.rules)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditPolicy(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(p)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Catalog Create/Edit Dialog */}
      <Dialog open={!!catalogDialog} onOpenChange={(open) => !open && setCatalogDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {catalogDialog?.editing ? 'Editar' : 'Crear'}{' '}
              {catalogDialog?.type === 'category' ? 'Categoria' : catalogDialog?.type === 'subcategory' ? 'Subcategoria' : 'Zona'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {catalogDialog?.type === 'category' && (
              <>
                {!catalogDialog.editing && (
                  <div>
                    <Label>Slug *</Label>
                    <Input value={catSlug} onChange={e => setCatSlug(e.target.value.toUpperCase())} placeholder="Ej: FOOD_DRINKS" className="mt-1 font-mono" />
                    <p className="text-xs text-muted-foreground mt-1">UPPER_SNAKE_CASE, no editable despues</p>
                  </div>
                )}
                <div>
                  <Label>Nombre *</Label>
                  <Input value={catLabel} onChange={e => setCatLabel(e.target.value)} placeholder="Ej: Alimentos y Bebidas" className="mt-1" />
                </div>
                <div>
                  <Label>Descripcion</Label>
                  <Textarea value={catDescription} onChange={e => setCatDescription(e.target.value)} placeholder="Descripcion de la categoria..." className="mt-1" rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Icono</Label>
                    <Select value={catIcon} onValueChange={setCatIcon}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableIcons.map(name => {
                          const Ico = getIcon(name);
                          return (
                            <SelectItem key={name} value={name}>
                              <div className="flex items-center gap-2"><Ico className="h-4 w-4" />{name}</div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Color</Label>
                    <Select value={catColor} onValueChange={setCatColor}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLOR_PRESETS.map(c => (
                          <SelectItem key={c.value} value={c.value}>
                            <div className="flex items-center gap-2">
                              <span className={`inline-block w-4 h-4 rounded ${c.value.split(' ')[0]}`}></span>
                              {c.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>SKU Prefix *</Label>
                    <Input value={catSkuPrefix} onChange={e => setCatSkuPrefix(e.target.value.toUpperCase().slice(0, 2))} placeholder="FD" className="mt-1 font-mono" maxLength={2} />
                  </div>
                  <div>
                    <Label>Orden</Label>
                    <Input type="number" value={catSortOrder} onChange={e => setCatSortOrder(e.target.value)} className="mt-1" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={catIsActive} onCheckedChange={setCatIsActive} />
                  <Label>Activa</Label>
                </div>
              </>
            )}

            {catalogDialog?.type === 'subcategory' && (
              <>
                {!catalogDialog.editing && (
                  <div>
                    <Label>Slug *</Label>
                    <Input value={subSlug} onChange={e => setSubSlug(e.target.value.toUpperCase())} placeholder="Ej: TAQUIZA" className="mt-1 font-mono" />
                  </div>
                )}
                <div>
                  <Label>Nombre *</Label>
                  <Input value={subLabel} onChange={e => setSubLabel(e.target.value)} placeholder="Ej: Taquiza" className="mt-1" />
                </div>
                <div>
                  <Label>Categoria padre *</Label>
                  <Select value={subCategorySlug} onValueChange={setSubCategorySlug}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {activeCategories.map(c => (
                        <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Orden</Label>
                  <Input type="number" value={subSortOrder} onChange={e => setSubSortOrder(e.target.value)} className="mt-1" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={subIsActive} onCheckedChange={setSubIsActive} />
                  <Label>Activa</Label>
                </div>
              </>
            )}

            {catalogDialog?.type === 'zone' && (
              <>
                {!catalogDialog.editing && (
                  <div>
                    <Label>Slug *</Label>
                    <Input value={zoneSlug} onChange={e => setZoneSlug(e.target.value.toLowerCase())} placeholder="Ej: ciudad-de-mexico" className="mt-1 font-mono" />
                    <p className="text-xs text-muted-foreground mt-1">kebab-case, no editable despues</p>
                  </div>
                )}
                <div>
                  <Label>Nombre *</Label>
                  <Input value={zoneLabel} onChange={e => setZoneLabel(e.target.value)} placeholder="Ej: Ciudad de Mexico" className="mt-1" />
                </div>
                <div>
                  <Label>Orden</Label>
                  <Input type="number" value={zoneSortOrder} onChange={e => setZoneSortOrder(e.target.value)} className="mt-1" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={zoneIsActive} onCheckedChange={setZoneIsActive} />
                  <Label>Activa</Label>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatalogDialog(null)}>Cancelar</Button>
            <Button onClick={handleSaveCatalog} disabled={catalogSaving}>
              {catalogSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : catalogDialog?.editing ? 'Guardar Cambios' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancellation Policy Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPolicy ? 'Editar Politica' : 'Crear Politica de Cancelacion'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre *</Label>
              <Input value={policyName} onChange={e => setPolicyName(e.target.value)} placeholder="Ej: Flexible" className="mt-1" />
            </div>
            <div>
              <Label>Descripcion</Label>
              <Textarea value={policyDescription} onChange={e => setPolicyDescription(e.target.value)} placeholder="Describe la politica..." className="mt-1" rows={2} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Reglas de Reembolso</Label>
                <Button type="button" variant="outline" size="sm" onClick={addRule}><Plus className="h-3 w-3 mr-1" />Regla</Button>
              </div>
              <div className="space-y-3">
                {policyRules.map((rule, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 border rounded-lg">
                    <div className="flex-1 space-y-2">
                      <p className="text-xs text-muted-foreground">Si faltan mas de X horas → Y% reembolso</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Min horas *</Label>
                          <Input type="number" min="0" value={rule.min_hours} onChange={e => updateRule(i, 'min_hours', e.target.value)} placeholder="0" />
                        </div>
                        <div>
                          <Label className="text-xs">Max horas</Label>
                          <Input type="number" min="0" value={rule.max_hours} onChange={e => updateRule(i, 'max_hours', e.target.value)} placeholder="Sin limite" />
                        </div>
                        <div>
                          <Label className="text-xs">Reembolso % *</Label>
                          <Input type="number" min="0" max="100" value={rule.refund_percent} onChange={e => updateRule(i, 'refund_percent', e.target.value)} placeholder="100" />
                        </div>
                      </div>
                    </div>
                    {policyRules.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeRule(i)} className="self-end">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSavePolicy} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : editingPolicy ? 'Guardar Cambios' : 'Crear Politica'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Cancellation Policy Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar politica &ldquo;{deleteTarget?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>Esta accion no se puede deshacer. Los servicios que usen esta politica quedaran sin politica asignada.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePolicy} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Catalog Item Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar &ldquo;{deleteItem?.label}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              Si tiene servicios activos vinculados, la eliminacion sera rechazada. Considera desactivar el item en su lugar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCatalog} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
