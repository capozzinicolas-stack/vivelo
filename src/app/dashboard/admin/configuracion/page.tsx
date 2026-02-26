'use client';

import { useState, useEffect, useCallback } from 'react';
import { COMMISSION_RATE, ZONES } from '@/lib/constants';
import { categories } from '@/data/categories';
import { getCancellationPolicies, createCancellationPolicy, updateCancellationPolicy, deleteCancellationPolicy } from '@/lib/supabase/queries';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Percent, MapPin, Tag, FileText, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import type { CancellationPolicy, CancellationRule } from '@/types/database';

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
  const [policies, setPolicies] = useState<CancellationPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<CancellationPolicy | null>(null);
  const [policyName, setPolicyName] = useState('');
  const [policyDescription, setPolicyDescription] = useState('');
  const [policyRules, setPolicyRules] = useState<RuleInput[]>([]);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<CancellationPolicy | null>(null);

  const loadPolicies = useCallback(async () => {
    try {
      const data = await getCancellationPolicies();
      setPolicies(data);
    } catch {
      toast({ title: 'Error cargando politicas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadPolicies(); }, [loadPolicies]);

  const openCreate = () => {
    setEditingPolicy(null);
    setPolicyName('');
    setPolicyDescription('');
    setPolicyRules([{ min_hours: '', max_hours: '', refund_percent: '' }]);
    setDialogOpen(true);
  };

  const openEdit = (policy: CancellationPolicy) => {
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

  const addRule = () => {
    setPolicyRules([...policyRules, { min_hours: '', max_hours: '', refund_percent: '' }]);
  };

  const removeRule = (i: number) => {
    setPolicyRules(policyRules.filter((_, idx) => idx !== i));
  };

  const updateRule = (i: number, field: keyof RuleInput, value: string) => {
    const updated = [...policyRules];
    updated[i] = { ...updated[i], [field]: value };
    setPolicyRules(updated);
  };

  const handleSave = async () => {
    if (!policyName.trim()) {
      toast({ title: 'El nombre es requerido', variant: 'destructive' });
      return;
    }
    const validRules = policyRules.filter(r => r.min_hours !== '' && r.refund_percent !== '');
    if (validRules.length === 0) {
      toast({ title: 'Agrega al menos una regla', variant: 'destructive' });
      return;
    }

    const rules: CancellationRule[] = validRules.map(r => ({
      min_hours: parseFloat(r.min_hours),
      max_hours: r.max_hours ? parseFloat(r.max_hours) : null,
      refund_percent: parseInt(r.refund_percent),
    }));

    setSaving(true);
    try {
      if (editingPolicy) {
        await updateCancellationPolicy(editingPolicy.id, {
          name: policyName,
          description: policyDescription,
          rules,
        });
        setPolicies(prev => prev.map(p => p.id === editingPolicy.id ? { ...p, name: policyName, description: policyDescription, rules } : p));
        toast({ title: 'Politica actualizada!' });
      } else {
        const created = await createCancellationPolicy({
          name: policyName,
          description: policyDescription,
          rules,
        });
        setPolicies(prev => [...prev, created]);
        toast({ title: 'Politica creada!' });
      }
      setDialogOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCancellationPolicy(deleteTarget.id);
      setPolicies(prev => prev.filter(p => p.id !== deleteTarget.id));
      toast({ title: 'Politica eliminada' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Configuracion de la Plataforma</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Percent className="h-5 w-5" /> Comisiones</CardTitle>
            <CardDescription>Tasa de comision que Vivelo cobra por cada transaccion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
              <span className="text-sm font-medium">Tasa actual</span>
              <span className="text-2xl font-bold text-primary">{(COMMISSION_RATE * 100).toFixed(0)}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Para cambiar la tasa, edita COMMISSION_RATE en src/lib/constants.ts y redeploy.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Zonas de Servicio</CardTitle>
            <CardDescription>{ZONES.length} zonas activas en Mexico</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ZONES.map(z => (
                <Badge key={z} variant="outline">{z}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Tag className="h-5 w-5" /> Categorias de Servicio</CardTitle>
            <CardDescription>{categories.length} categorias disponibles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categories.map(c => (
                <div key={c.value} className="flex items-center gap-3 p-2 rounded-lg">
                  <Badge className={c.color}><c.icon className="h-3 w-3 mr-1" />{c.label}</Badge>
                  <span className="text-xs text-muted-foreground">{c.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cancellation Policies CRUD */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Politicas de Cancelacion</CardTitle>
            <CardDescription>Reglas de reembolso que los proveedores pueden asignar a sus servicios</CardDescription>
          </div>
          <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" />Crear Politica</Button>
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
                        <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
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

      {/* Create/Edit Dialog */}
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
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : editingPolicy ? 'Guardar Cambios' : 'Crear Politica'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar politica &ldquo;{deleteTarget?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Los servicios que usen esta politica quedaran sin politica asignada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
