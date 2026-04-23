'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuthContext } from '@/providers/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { REGIMENES_FISCALES, REGIMENES_PERSONA_FISICA, REGIMENES_PERSONA_MORAL, BANCOS_MEXICO, USOS_CFDI, validateRFC, validateCLABE } from '@/lib/fiscal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, Upload, AlertTriangle, CheckCircle2, Clock, XCircle, Receipt } from 'lucide-react';
import type { ProviderFiscalData, PersonaType, RegimenFiscal, DireccionFiscal } from '@/types/database';

const fiscalStatusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  incomplete: { label: 'Incompleto', className: 'bg-gray-100 text-gray-800', icon: Clock },
  pending_review: { label: 'En revision', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
  approved: { label: 'Aprobado', className: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  rejected: { label: 'Rechazado', className: 'bg-red-100 text-red-800', icon: XCircle },
};

const ESTADOS_MEXICO = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas',
  'Chihuahua', 'Ciudad de Mexico', 'Coahuila', 'Colima', 'Durango', 'Estado de Mexico',
  'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacan', 'Morelos', 'Nayarit',
  'Nuevo Leon', 'Oaxaca', 'Puebla', 'Queretaro', 'Quintana Roo', 'San Luis Potosi',
  'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatan', 'Zacatecas',
];

export default function DatosFiscalesSection() {
  const { user } = useAuthContext();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fiscalData, setFiscalData] = useState<ProviderFiscalData | null>(null);

  // Form state
  const [rfc, setRfc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [tipoPersona, setTipoPersona] = useState<PersonaType>('fisica');
  const [regimenFiscal, setRegimenFiscal] = useState<RegimenFiscal | ''>('');
  const [usoCfdi, setUsoCfdi] = useState('G03');
  const [clabe, setClabe] = useState('');
  const [banco, setBanco] = useState('');

  // Direccion fiscal
  const [calle, setCalle] = useState('');
  const [numExterior, setNumExterior] = useState('');
  const [numInterior, setNumInterior] = useState('');
  const [colonia, setColonia] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [estado, setEstado] = useState('');

  // Documents
  const [uploadingConstancia, setUploadingConstancia] = useState(false);
  const [uploadingEstadoCuenta, setUploadingEstadoCuenta] = useState(false);

  // Regimenes disponibles segun tipo de persona
  const regimenesDisponibles = useMemo(() => {
    const codes = tipoPersona === 'fisica' ? REGIMENES_PERSONA_FISICA : REGIMENES_PERSONA_MORAL;
    return codes.map(code => ({ code, label: `${code} - ${REGIMENES_FISCALES[code]}` }));
  }, [tipoPersona]);

  // Fetch existing data
  useEffect(() => {
    async function fetchFiscal() {
      try {
        const res = await fetch('/api/provider/fiscal');
        if (!res.ok) throw new Error();
        const { data } = await res.json();
        if (data) {
          setFiscalData(data);
          setRfc(data.rfc || '');
          setRazonSocial(data.razon_social || '');
          setTipoPersona(data.tipo_persona || 'fisica');
          setRegimenFiscal(data.regimen_fiscal || '');
          setUsoCfdi(data.uso_cfdi || 'G03');
          setClabe(data.clabe || '');
          setBanco(data.banco || '');
          const dir = data.direccion_fiscal as DireccionFiscal | null;
          if (dir) {
            setCalle(dir.calle || '');
            setNumExterior(dir.numero_exterior || '');
            setNumInterior(dir.numero_interior || '');
            setColonia(dir.colonia || '');
            setCodigoPostal(dir.codigo_postal || '');
            setMunicipio(dir.municipio || '');
            setEstado(dir.estado || '');
          }
        }
      } catch {
        // No fiscal data yet — that's OK
      } finally {
        setLoading(false);
      }
    }
    fetchFiscal();
  }, []);

  // Reset regimen when tipo_persona changes (if current selection is invalid)
  useEffect(() => {
    if (!regimenFiscal) return;
    const validCodes = tipoPersona === 'fisica' ? REGIMENES_PERSONA_FISICA : REGIMENES_PERSONA_MORAL;
    if (!validCodes.includes(regimenFiscal as RegimenFiscal)) {
      setRegimenFiscal('');
    }
  }, [tipoPersona, regimenFiscal]);

  const isApproved = fiscalData?.fiscal_status === 'approved';

  const handleSave = async () => {
    if (!user) return;

    // Validaciones
    if (!rfc.trim()) { toast({ title: 'RFC es requerido', variant: 'destructive' }); return; }
    const rfcResult = validateRFC(rfc.trim(), tipoPersona);
    if (!rfcResult.valid) { toast({ title: rfcResult.error!, variant: 'destructive' }); return; }

    if (!razonSocial.trim()) { toast({ title: 'Razon social es requerida', variant: 'destructive' }); return; }
    if (!regimenFiscal) { toast({ title: 'Selecciona un regimen fiscal', variant: 'destructive' }); return; }

    // Direccion fiscal
    if (!calle.trim() || !numExterior.trim() || !colonia.trim() || !codigoPostal.trim() || !municipio.trim() || !estado.trim()) {
      toast({ title: 'Completa todos los campos de direccion fiscal', variant: 'destructive' });
      return;
    }
    if (!/^\d{5}$/.test(codigoPostal.trim())) {
      toast({ title: 'Codigo postal debe tener 5 digitos', variant: 'destructive' });
      return;
    }

    // CLABE opcional pero si se llena, debe ser valida
    if (clabe.trim()) {
      const clabeResult = validateCLABE(clabe.trim());
      if (!clabeResult.valid) { toast({ title: clabeResult.error!, variant: 'destructive' }); return; }
    }

    setSaving(true);
    try {
      const body = {
        rfc: rfc.trim().toUpperCase(),
        razon_social: razonSocial.trim(),
        tipo_persona: tipoPersona,
        regimen_fiscal: regimenFiscal,
        uso_cfdi: usoCfdi,
        clabe: clabe.trim() || null,
        banco: banco || null,
        direccion_fiscal: {
          calle: calle.trim(),
          numero_exterior: numExterior.trim(),
          numero_interior: numInterior.trim() || undefined,
          colonia: colonia.trim(),
          codigo_postal: codigoPostal.trim(),
          municipio: municipio.trim(),
          estado: estado.trim(),
          pais: 'Mexico',
        },
      };

      const res = await fetch('/api/provider/fiscal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar');
      }

      const { data } = await res.json();
      setFiscalData(data);
      toast({ title: 'Datos fiscales guardados', description: 'Un administrador revisara tu informacion.' });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'No se pudieron guardar los datos.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDocUpload = async (docType: 'constancia' | 'estado_cuenta', file: File) => {
    const setUploading = docType === 'constancia' ? setUploadingConstancia : setUploadingEstadoCuenta;

    // Validate file type and size
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: 'Tipo de archivo no soportado', description: 'Usa PDF, JPG o PNG.', variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Archivo muy grande', description: 'Maximo 10MB.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', docType);

      const res = await fetch('/api/provider/fiscal/documents', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al subir documento');
      }

      // Refresh fiscal data
      const fiscalRes = await fetch('/api/provider/fiscal');
      if (fiscalRes.ok) {
        const { data } = await fiscalRes.json();
        if (data) setFiscalData(data);
      }

      toast({ title: 'Documento subido exitosamente' });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'No se pudo subir el documento.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statusInfo = fiscalStatusConfig[fiscalData?.fiscal_status || 'incomplete'];
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Datos Fiscales</h2>
        <Badge className={statusInfo.className}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {statusInfo.label}
        </Badge>
      </div>

      {isApproved && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
          <p className="text-sm text-green-700">
            Tus datos fiscales han sido aprobados. Para hacer cambios, contacta a soporte.
          </p>
        </div>
      )}

      {fiscalData?.fiscal_status === 'rejected' && fiscalData.admin_notes && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">
            <span className="font-medium">Motivo de rechazo:</span> {fiscalData.admin_notes}
          </p>
        </div>
      )}

      {/* Datos basicos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Informacion Fiscal
          </CardTitle>
          <CardDescription>
            Datos requeridos para la facturacion y retenciones de impuestos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Tipo de persona *</Label>
              <Select value={tipoPersona} onValueChange={(v) => setTipoPersona(v as PersonaType)} disabled={isApproved}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fisica">Persona Fisica</SelectItem>
                  <SelectItem value="moral">Persona Moral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>RFC *</Label>
              <Input
                value={rfc}
                onChange={(e) => setRfc(e.target.value.toUpperCase())}
                placeholder={tipoPersona === 'fisica' ? 'XAXX010101000' : 'XXX010101000'}
                className="mt-1 font-mono"
                maxLength={tipoPersona === 'fisica' ? 13 : 12}
                disabled={isApproved}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {tipoPersona === 'fisica' ? '13 caracteres' : '12 caracteres'} con homoclave
              </p>
            </div>
          </div>

          <div>
            <Label>Razon Social *</Label>
            <Input
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              placeholder="Nombre o denominacion social tal como aparece en tu constancia"
              className="mt-1"
              disabled={isApproved}
            />
          </div>

          <div>
            <Label>Regimen Fiscal *</Label>
            <Select value={regimenFiscal} onValueChange={(v) => setRegimenFiscal(v as RegimenFiscal)} disabled={isApproved}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecciona tu regimen" /></SelectTrigger>
              <SelectContent>
                {regimenesDisponibles.map(r => (
                  <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Uso de CFDI</Label>
            <Select value={usoCfdi} onValueChange={setUsoCfdi} disabled={isApproved}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(USOS_CFDI).map(([code, label]) => (
                  <SelectItem key={code} value={code}>{code} - {label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Direccion Fiscal */}
      <Card>
        <CardHeader>
          <CardTitle>Direccion Fiscal</CardTitle>
          <CardDescription>
            Domicilio tal como aparece en tu constancia de situacion fiscal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Calle *</Label>
              <Input value={calle} onChange={(e) => setCalle(e.target.value)} placeholder="Av. Reforma" className="mt-1" disabled={isApproved} />
            </div>
            <div>
              <Label>Numero Exterior *</Label>
              <Input value={numExterior} onChange={(e) => setNumExterior(e.target.value)} placeholder="123" className="mt-1" disabled={isApproved} />
            </div>
            <div>
              <Label>Numero Interior</Label>
              <Input value={numInterior} onChange={(e) => setNumInterior(e.target.value)} placeholder="Depto 4B" className="mt-1" disabled={isApproved} />
            </div>
            <div>
              <Label>Colonia *</Label>
              <Input value={colonia} onChange={(e) => setColonia(e.target.value)} placeholder="Juarez" className="mt-1" disabled={isApproved} />
            </div>
            <div>
              <Label>Codigo Postal *</Label>
              <Input
                value={codigoPostal}
                onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); if (v.length <= 5) setCodigoPostal(v); }}
                placeholder="06600"
                className="mt-1 font-mono"
                maxLength={5}
                disabled={isApproved}
              />
            </div>
            <div>
              <Label>Municipio / Alcaldia *</Label>
              <Input value={municipio} onChange={(e) => setMunicipio(e.target.value)} placeholder="Cuauhtemoc" className="mt-1" disabled={isApproved} />
            </div>
            <div>
              <Label>Estado *</Label>
              <Select value={estado} onValueChange={setEstado} disabled={isApproved}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecciona estado" /></SelectTrigger>
                <SelectContent>
                  {ESTADOS_MEXICO.map(e => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Datos Bancarios Fiscales */}
      <Card>
        <CardHeader>
          <CardTitle>Datos Bancarios para Pagos</CardTitle>
          <CardDescription>
            Cuenta donde recibiras tus pagos. Debe estar a nombre de la razon social.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Banco</Label>
              <Select value={banco} onValueChange={setBanco} disabled={isApproved}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecciona banco" /></SelectTrigger>
                <SelectContent>
                  {BANCOS_MEXICO.map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>CLABE Interbancaria</Label>
              <Input
                value={clabe}
                onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); if (v.length <= 18) setClabe(v); }}
                placeholder="18 digitos"
                className="mt-1 font-mono"
                maxLength={18}
                disabled={isApproved}
              />
              <p className="text-xs text-muted-foreground mt-1">{clabe.length}/18 digitos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentos
          </CardTitle>
          <CardDescription>
            Sube tu constancia de situacion fiscal y caratula bancaria o estado de cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Constancia de Situacion Fiscal */}
          <div>
            <Label>Constancia de Situacion Fiscal</Label>
            {fiscalData?.constancia_url ? (
              <div className="mt-1 flex items-center gap-3 p-3 rounded-lg bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <span className="text-sm flex-1">Constancia subida</span>
                {!isApproved && (
                  <label className="cursor-pointer text-xs text-deep-purple hover:underline">
                    Reemplazar
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { if (e.target.files?.[0]) handleDocUpload('constancia', e.target.files[0]); e.target.value = ''; }} disabled={uploadingConstancia} />
                  </label>
                )}
              </div>
            ) : (
              <label className={`mt-1 flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors p-3 border border-dashed rounded-lg ${isApproved ? 'opacity-50 pointer-events-none' : ''}`}>
                {uploadingConstancia ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span>{uploadingConstancia ? 'Subiendo...' : 'Subir constancia (PDF, JPG o PNG, max 10MB)'}</span>
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { if (e.target.files?.[0]) handleDocUpload('constancia', e.target.files[0]); e.target.value = ''; }} disabled={uploadingConstancia || isApproved} />
              </label>
            )}
          </div>

          {/* Estado de Cuenta / Caratula Bancaria */}
          <div>
            <Label>Caratula Bancaria o Estado de Cuenta</Label>
            {fiscalData?.estado_cuenta_url ? (
              <div className="mt-1 flex items-center gap-3 p-3 rounded-lg bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <span className="text-sm flex-1">Documento bancario subido</span>
                {!isApproved && (
                  <label className="cursor-pointer text-xs text-deep-purple hover:underline">
                    Reemplazar
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { if (e.target.files?.[0]) handleDocUpload('estado_cuenta', e.target.files[0]); e.target.value = ''; }} disabled={uploadingEstadoCuenta} />
                  </label>
                )}
              </div>
            ) : (
              <label className={`mt-1 flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors p-3 border border-dashed rounded-lg ${isApproved ? 'opacity-50 pointer-events-none' : ''}`}>
                {uploadingEstadoCuenta ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span>{uploadingEstadoCuenta ? 'Subiendo...' : 'Subir documento (PDF, JPG o PNG, max 10MB)'}</span>
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { if (e.target.files?.[0]) handleDocUpload('estado_cuenta', e.target.files[0]); e.target.value = ''; }} disabled={uploadingEstadoCuenta || isApproved} />
              </label>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      {!isApproved && (
        <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : 'Guardar Datos Fiscales'}
        </Button>
      )}
    </div>
  );
}
