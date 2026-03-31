'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuthContext } from '@/providers/auth-provider';
import { updateProfile, updateProviderBanking, updateMaxConcurrentServices, updateProviderBufferConfig, getCancellationPolicies, updateProviderDefaultPolicy } from '@/lib/supabase/queries';
import { uploadDocument, validateDocument } from '@/lib/supabase/storage';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Settings, Clock, FileText, Building2, Landmark, Upload, X, AlertTriangle } from 'lucide-react';
import GoogleCalendarSettings from '@/components/google-calendar/google-calendar-settings';
import type { CancellationPolicy } from '@/types/database';

const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i;

const bankingStatusConfig: Record<string, { label: string; className: string }> = {
  not_submitted: { label: 'Sin enviar', className: 'bg-gray-100 text-gray-800' },
  pending_review: { label: 'En revision', className: 'bg-yellow-100 text-yellow-800' },
  verified: { label: 'Verificado', className: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rechazado', className: 'bg-red-100 text-red-800' },
};

export default function ProveedorConfiguracionPage() {
  const { user, updateUser } = useAuthContext();
  const { toast } = useToast();

  // Company info state
  const [companyName, setCompanyName] = useState(user?.company_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [savingCompany, setSavingCompany] = useState(false);

  // Banking state
  const [rfc, setRfc] = useState(user?.rfc || '');
  const [clabe, setClabe] = useState(user?.clabe || '');
  const [bankDocumentUrl, setBankDocumentUrl] = useState(user?.bank_document_url || '');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [savingBanking, setSavingBanking] = useState(false);

  // Existing config state
  const [maxConcurrent, setMaxConcurrent] = useState(
    user?.max_concurrent_services?.toString() || '1'
  );
  const [applyBuffersToAll, setApplyBuffersToAll] = useState(user?.apply_buffers_to_all || false);
  const [globalBufferBefore, setGlobalBufferBefore] = useState(
    (user?.global_buffer_before_minutes || 0).toString()
  );
  const [globalBufferAfter, setGlobalBufferAfter] = useState(
    (user?.global_buffer_after_minutes || 0).toString()
  );
  const [saving, setSaving] = useState(false);
  const [cancellationPolicies, setCancellationPolicies] = useState<CancellationPolicy[]>([]);
  const [defaultPolicyId, setDefaultPolicyId] = useState(user?.default_cancellation_policy_id || '');
  const [savingPolicy, setSavingPolicy] = useState(false);

  useEffect(() => {
    getCancellationPolicies().then(setCancellationPolicies).catch(() => {});
  }, []);

  const handleSaveCompany = async () => {
    if (!user) return;
    if (!companyName.trim()) {
      toast({ title: 'El nombre de empresa es requerido', variant: 'destructive' });
      return;
    }
    if (!bio.trim()) {
      toast({ title: 'La descripcion es requerida', variant: 'destructive' });
      return;
    }
    setSavingCompany(true);
    try {
      await updateProfile(user.id, { company_name: companyName.trim(), bio: bio.trim() });
      updateUser({ company_name: companyName.trim(), bio: bio.trim() });
      toast({ title: 'Datos de empresa guardados' });
    } catch {
      toast({ title: 'Error', description: 'No se pudieron guardar los datos.', variant: 'destructive' });
    } finally {
      setSavingCompany(false);
    }
  };

  const handleDocUpload = async (file: File) => {
    if (!user) return;
    const error = validateDocument(file);
    if (error) {
      toast({ title: error, variant: 'destructive' });
      return;
    }
    setUploadingDoc(true);
    try {
      const url = await uploadDocument(user.id, file);
      setBankDocumentUrl(url);
      toast({ title: 'Documento subido' });
    } catch {
      toast({ title: 'Error subiendo documento', variant: 'destructive' });
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSaveBanking = async () => {
    if (!user) return;
    if (!rfc.trim() || !RFC_REGEX.test(rfc.trim())) {
      toast({ title: 'RFC invalido', description: 'Ingresa un RFC valido (ej: XAXX010101000).', variant: 'destructive' });
      return;
    }
    const clabeDigits = clabe.replace(/\s/g, '');
    if (!/^\d{18}$/.test(clabeDigits)) {
      toast({ title: 'CLABE invalida', description: 'La CLABE debe tener exactamente 18 digitos.', variant: 'destructive' });
      return;
    }
    if (!bankDocumentUrl) {
      toast({ title: 'Documento requerido', description: 'Sube tu caratula bancaria o estado de cuenta.', variant: 'destructive' });
      return;
    }
    setSavingBanking(true);
    try {
      await updateProfile(user.id, { rfc: rfc.trim().toUpperCase() });
      await updateProviderBanking(user.id, { clabe: clabeDigits, bank_document_url: bankDocumentUrl });
      updateUser({ rfc: rfc.trim().toUpperCase(), clabe: clabeDigits, bank_document_url: bankDocumentUrl, banking_status: 'pending_review', banking_rejection_reason: null });
      toast({ title: 'Datos bancarios enviados', description: 'Un administrador revisara tu informacion.' });
    } catch {
      toast({ title: 'Error', description: 'No se pudieron guardar los datos bancarios.', variant: 'destructive' });
    } finally {
      setSavingBanking(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const value = parseInt(maxConcurrent) || 1;
    if (value < 1) {
      toast({ title: 'El valor minimo es 1', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await updateMaxConcurrentServices(user.id, value);
      await updateProviderBufferConfig(user.id, {
        apply_buffers_to_all: applyBuffersToAll,
        global_buffer_before_minutes: parseInt(globalBufferBefore) || 0,
        global_buffer_after_minutes: parseInt(globalBufferAfter) || 0,
      });
      toast({ title: 'Configuracion guardada!' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar la configuracion.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDefaultPolicy = async () => {
    if (!user) return;
    setSavingPolicy(true);
    try {
      await updateProviderDefaultPolicy(user.id, defaultPolicyId || null);
      toast({ title: 'Politica por defecto guardada!' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar la politica.', variant: 'destructive' });
    } finally {
      setSavingPolicy(false);
    }
  };

  const selectedPolicy = cancellationPolicies.find(p => p.id === defaultPolicyId);
  const bankingBadge = bankingStatusConfig[user?.banking_status || 'not_submitted'];

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Configuracion</h1>

      {/* Datos de Empresa */}
      <Card id="datos-empresa">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Datos de tu Empresa
          </CardTitle>
          <CardDescription>
            Esta informacion se muestra a los clientes en tu perfil de proveedor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nombre de empresa *</Label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ej: Banquetes La Abuela"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Descripcion *</Label>
            <Textarea
              value={bio}
              onChange={(e) => { if (e.target.value.length <= 500) setBio(e.target.value); }}
              placeholder="Describe tu empresa y servicios..."
              className="mt-1"
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{bio.length}/500</p>
          </div>
          <Button onClick={handleSaveCompany} disabled={savingCompany} size="sm">
            {savingCompany ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : 'Guardar Datos de Empresa'}
          </Button>
        </CardContent>
      </Card>

      {/* Datos Bancarios */}
      <Card id="datos-bancarios">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Datos Bancarios
            <Badge className={bankingBadge.className}>{bankingBadge.label}</Badge>
          </CardTitle>
          <CardDescription>
            Necesarios para recibir pagos. Un administrador verificara tu informacion.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user?.banking_status === 'rejected' && user?.banking_rejection_reason && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">
                <span className="font-medium">Motivo de rechazo:</span> {user.banking_rejection_reason}
              </p>
            </div>
          )}
          <div>
            <Label>RFC *</Label>
            <Input
              value={rfc}
              onChange={(e) => setRfc(e.target.value.toUpperCase())}
              placeholder="XAXX010101000"
              className="mt-1 font-mono"
              maxLength={13}
            />
            <p className="text-xs text-muted-foreground mt-1">RFC con homonimia (12 o 13 caracteres)</p>
          </div>
          <div>
            <Label>CLABE Interbancaria *</Label>
            <Input
              value={clabe}
              onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); if (v.length <= 18) setClabe(v); }}
              placeholder="18 digitos"
              className="mt-1 font-mono"
              maxLength={18}
            />
            <p className="text-xs text-muted-foreground mt-1">{clabe.length}/18 digitos</p>
          </div>
          <div>
            <Label>Caratula bancaria o estado de cuenta *</Label>
            {bankDocumentUrl ? (
              <div className="mt-1 flex items-center gap-3 p-3 rounded-lg bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <span className="text-sm truncate flex-1">Documento subido</span>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setBankDocumentUrl('')} aria-label="Eliminar documento">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="mt-1 flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors p-3 border border-dashed rounded-lg">
                {uploadingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span>{uploadingDoc ? 'Subiendo...' : 'Subir documento (PDF, JPG o PNG, max 10MB)'}</span>
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { if (e.target.files?.[0]) handleDocUpload(e.target.files[0]); e.target.value = ''; }} disabled={uploadingDoc} />
              </label>
            )}
          </div>
          <Button onClick={handleSaveBanking} disabled={savingBanking} size="sm">
            {savingBanking ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando...</> : 'Enviar Datos Bancarios'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Servicios Concurrentes
          </CardTitle>
          <CardDescription>
            Define cuantos servicios puedes atender al mismo tiempo. El sistema bloqueara nuevas reservas si ya alcanzaste el maximo en un horario.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Maximo de servicios simultaneos</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={maxConcurrent}
              onChange={(e) => setMaxConcurrent(e.target.value)}
              className="mt-1 max-w-[200px]"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Si ofreces multiples servicios (ej: catering + meseros), puedes aumentar este numero.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Tiempos de Preparacion Globales
          </CardTitle>
          <CardDescription>
            Si esta activado, estos valores reemplazan los tiempos individuales de cada servicio en tu calendario.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="apply-all">Aplicar a todos mis servicios</Label>
            <Switch
              id="apply-all"
              checked={applyBuffersToAll}
              onCheckedChange={setApplyBuffersToAll}
            />
          </div>
          {applyBuffersToAll && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Minutos antes</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={globalBufferBefore}
                  onChange={(e) => setGlobalBufferBefore(e.target.value)}
                  placeholder="Ej: 60"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Minutos despues</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={globalBufferAfter}
                  onChange={(e) => setGlobalBufferAfter(e.target.value)}
                  placeholder="Ej: 30"
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {cancellationPolicies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Politica de Cancelacion por Defecto
            </CardTitle>
            <CardDescription>
              Esta politica se pre-seleccionara al crear nuevos servicios.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Politica</Label>
              <Select value={defaultPolicyId} onValueChange={setDefaultPolicyId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar politica" /></SelectTrigger>
                <SelectContent>
                  {cancellationPolicies.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPolicy && (
              <div className="space-y-1">
                {selectedPolicy.description && <p className="text-sm text-muted-foreground">{selectedPolicy.description}</p>}
                {selectedPolicy.rules
                  .sort((a, b) => b.min_hours - a.min_hours)
                  .map((r, i) => {
                    const minLabel = r.min_hours >= 24 ? `${Math.round(r.min_hours / 24)} dias` : `${r.min_hours}h`;
                    const desc = r.max_hours === null
                      ? `Mas de ${minLabel} antes`
                      : `${minLabel} - ${r.max_hours >= 24 ? `${Math.round(r.max_hours / 24)} dias` : `${r.max_hours}h`} antes`;
                    return (
                      <div key={i} className={`flex justify-between p-2 rounded text-sm ${r.refund_percent === 0 ? 'bg-red-50' : 'bg-muted'}`}>
                        <span>{desc}</span>
                        <span className="font-medium">{r.refund_percent}% reembolso</span>
                      </div>
                    );
                  })}
              </div>
            )}
            <Button onClick={handleSaveDefaultPolicy} disabled={savingPolicy} size="sm">
              {savingPolicy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : 'Guardar Politica'}
            </Button>
          </CardContent>
        </Card>
      )}

      {user && (
        <Suspense fallback={<Card><CardContent className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></CardContent></Card>}>
          <GoogleCalendarSettings
            providerId={user.id}
            isMockMode={process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') ?? true}
          />
        </Suspense>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
        {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : 'Guardar Configuracion'}
      </Button>
    </div>
  );
}
