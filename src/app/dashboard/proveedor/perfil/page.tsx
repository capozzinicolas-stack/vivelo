'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthContext } from '@/providers/auth-provider';
import { updateProfile, updateProviderBanking } from '@/lib/supabase/queries';
import { uploadProfilePicture, uploadDocument } from '@/lib/supabase/storage';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Camera, Save, Upload, CheckCircle, XCircle, Clock, AlertTriangle, Copy, Share2, Gift, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import DatosFiscalesSection from '@/components/dashboard/datos-fiscales-section';
import type { BankingStatus } from '@/types/database';

const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i;

const BANKING_STATUS_CONFIG: Record<BankingStatus, { label: string; color: string; icon: React.ElementType }> = {
  not_submitted: { label: 'No enviado', color: 'bg-gray-100 text-gray-800', icon: AlertTriangle },
  pending_review: { label: 'En revision', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  verified: { label: 'Verificado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Rechazado', color: 'bg-red-100 text-red-800', icon: XCircle },
};

function maskClabe(clabe: string): string {
  if (clabe.length <= 4) return clabe;
  return '*'.repeat(clabe.length - 4) + clabe.slice(-4);
}

export default function ProveedorPerfilPage() {
  const { user, isMockMode, updateUser } = useAuthContext();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const mustChange = searchParams.get('cambiar') === '1';

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [companyName, setCompanyName] = useState(user?.company_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');

  const [rfc, setRfc] = useState(user?.rfc || '');
  const [clabe, setClabe] = useState('');
  const [bankDocFile, setBankDocFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [savingBanking, setSavingBanking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [bankingMessage, setBankingMessage] = useState('');
  const [bankingError, setBankingError] = useState('');
  const [myReferralCode, setMyReferralCode] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (!user) return;
    async function loadReferralCode() {
      const supabase = createClient();
      const { data: codes } = await supabase
        .from('referral_codes')
        .select('code')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .limit(1);
      if (codes && codes.length > 0) {
        setMyReferralCode(codes[0].code);
      } else {
        const code = `VIVELO-${user!.id.slice(0, 6).toUpperCase()}`;
        const { data: newCode } = await supabase
          .from('referral_codes')
          .insert({ user_id: user!.id, code })
          .select('code')
          .single();
        if (newCode) setMyReferralCode(newCode.code);
      }
    }
    loadReferralCode();
  }, [user]);

  useEffect(() => {
    if (mustChange) {
      document.getElementById('current-password')?.focus();
    }
  }, [mustChange]);

  if (!user) return null;

  const bankingStatus = user.banking_status || 'not_submitted';
  const statusConfig = BANKING_STATUS_CONFIG[bankingStatus];
  const StatusIcon = statusConfig.icon;

  const initials = user.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      if (isMockMode) {
        setAvatarUrl(URL.createObjectURL(file));
      } else {
        const url = await uploadProfilePicture(user.id, file);
        setAvatarUrl(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error subiendo imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setError('');
    setMessage('');

    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length !== 10) {
      setError('El telefono debe tener exactamente 10 digitos');
      return;
    }

    if (!fullName.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    setSaving(true);
    try {
      await updateProfile(user.id, {
        full_name: fullName.trim(),
        phone: digitsOnly,
        avatar_url: avatarUrl || null,
        company_name: companyName.trim() || null,
        bio: bio.trim() || null,
      });
      updateUser({
        full_name: fullName.trim(),
        phone: digitsOnly,
        avatar_url: avatarUrl || null,
        company_name: companyName.trim() || null,
        bio: bio.trim() || null,
      });
      setMessage('Perfil guardado correctamente');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBanking = async () => {
    setBankingError('');
    setBankingMessage('');

    if (rfc.trim() && !RFC_REGEX.test(rfc.trim())) {
      setBankingError('RFC invalido (ej: XAXX010101000)');
      return;
    }

    const clabeDigits = clabe.replace(/\D/g, '');
    if (clabeDigits.length !== 18) {
      setBankingError('La CLABE debe tener exactamente 18 digitos');
      return;
    }

    setSavingBanking(true);
    try {
      let documentUrl = user.bank_document_url || undefined;
      if (bankDocFile) {
        if (isMockMode) {
          documentUrl = URL.createObjectURL(bankDocFile);
        } else {
          documentUrl = await uploadDocument(user.id, bankDocFile);
        }
      }

      if (rfc.trim()) {
        await updateProfile(user.id, { rfc: rfc.trim().toUpperCase() });
      }
      await updateProviderBanking(user.id, {
        clabe: clabeDigits,
        ...(documentUrl ? { bank_document_url: documentUrl } : {}),
      });
      updateUser({
        ...(rfc.trim() ? { rfc: rfc.trim().toUpperCase() } : {}),
        clabe: clabeDigits,
        bank_document_url: documentUrl || null,
        banking_status: 'pending_review',
        banking_rejection_reason: null,
      });
      setClabe('');
      setBankDocFile(null);
      setBankingMessage('Datos bancarios enviados. Estaran en revision.');
    } catch (err) {
      setBankingError(err instanceof Error ? err.message : 'Error guardando datos bancarios');
    } finally {
      setSavingBanking(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('La nueva contrasena debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contrasenas no coinciden');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('La nueva contrasena debe ser diferente a la actual');
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cambiar la contrasena');

      updateUser({ must_change_password: false });
      toast({ title: 'Contrasena actualizada exitosamente' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      if (mustChange) {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Error al cambiar la contrasena');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Mi Perfil</h1>

      {mustChange && (
        <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Debes cambiar tu contrasena temporal</p>
            <p className="text-sm text-amber-700 mt-1">Por seguridad, establece una contrasena personal antes de continuar.</p>
          </div>
        </div>
      )}

      {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>}
      {message && <div className="bg-green-50 text-green-700 text-sm p-3 rounded-md">{message}</div>}

      {/* Personal Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Informacion Personal</CardTitle>
          <CardDescription>Tu nombre, telefono y foto de perfil</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarUrl} alt={fullName} />
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 cursor-pointer bg-primary text-primary-foreground rounded-full p-1.5 hover:bg-primary/90 transition-colors">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
              </label>
            </div>
            <div>
              <p className="font-medium">{user.full_name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre Completo</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefono (10 digitos)</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="5512345678" maxLength={15} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName">Nombre de Empresa</Label>
            <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Mi Empresa S.A." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Descripcion / Bio</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Describe tu experiencia y servicios..." rows={3} />
          </div>

          <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar Perfil
          </Button>
        </CardContent>
      </Card>

      {/* Banking Card */}
      <Card id="datos-bancarios">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Datos Bancarios</CardTitle>
              <CardDescription>CLABE y documento bancario para recibir pagos</CardDescription>
            </div>
            <Badge className={`gap-1 ${statusConfig.color}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {bankingError && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{bankingError}</div>}
          {bankingMessage && <div className="bg-green-50 text-green-700 text-sm p-3 rounded-md">{bankingMessage}</div>}

          {bankingStatus === 'rejected' && user.banking_rejection_reason && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md">
              <strong>Motivo de rechazo:</strong> {user.banking_rejection_reason}
            </div>
          )}

          {/* RFC */}
          <div className="space-y-2">
            <Label htmlFor="rfc">RFC</Label>
            <Input
              id="rfc"
              value={rfc}
              onChange={(e) => setRfc(e.target.value.toUpperCase())}
              placeholder="XAXX010101000"
              maxLength={13}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">RFC con homonimia (12 o 13 caracteres)</p>
          </div>

          {/* Show current CLABE masked */}
          {user.clabe && (
            <div className="space-y-1">
              <Label className="text-muted-foreground">CLABE actual</Label>
              <p className="text-sm font-mono">{maskClabe(user.clabe)}</p>
            </div>
          )}

          {bankingStatus !== 'verified' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="clabe">CLABE Interbancaria (18 digitos)</Label>
                <Input
                  id="clabe"
                  value={clabe}
                  onChange={(e) => setClabe(e.target.value)}
                  placeholder="012345678901234567"
                  maxLength={20}
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankDoc">Documento Bancario (PDF, JPG o PNG)</Label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors text-sm">
                      <Upload className="h-4 w-4" />
                      {bankDocFile ? bankDocFile.name : 'Seleccionar archivo'}
                    </div>
                    <input
                      id="bankDoc"
                      type="file"
                      accept="application/pdf,image/jpeg,image/png"
                      className="hidden"
                      onChange={(e) => setBankDocFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">Estado de cuenta o constancia de CLABE (max 10MB)</p>
              </div>

              <Button onClick={handleSaveBanking} disabled={savingBanking} variant="outline" className="gap-2">
                {savingBanking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Enviar Datos Bancarios
              </Button>
            </>
          )}

          {bankingStatus === 'verified' && (
            <p className="text-sm text-green-700">Tus datos bancarios han sido verificados. Para actualizar tu CLABE, contacta a soporte.</p>
          )}
        </CardContent>
      </Card>

      {/* Datos Fiscales Section */}
      <DatosFiscalesSection />

      {/* Change Password Card */}
      <Card>
        <CardHeader>
          <CardTitle>Cambiar contrasena</CardTitle>
          <CardDescription>Ingresa tu contrasena actual y la nueva contrasena.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {passwordError && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {passwordError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="current-password">Contrasena actual</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrent ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva contrasena</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNew ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar nueva contrasena</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Cambiar contrasena'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {myReferralCode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-gold" />
              Tu Codigo de Referido
            </CardTitle>
            <CardDescription>Comparte tu codigo y gana recompensas cuando tus referidos reserven.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input value={myReferralCode} readOnly className="font-mono font-bold text-center" />
              <Button variant="outline" size="icon" aria-label="Copiar codigo" onClick={() => {
                navigator.clipboard.writeText(myReferralCode);
                toast({ title: 'Codigo copiado', description: 'Tu codigo de referido ha sido copiado al portapapeles.' });
              }}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" aria-label="Compartir codigo" onClick={() => {
                const shareUrl = `https://solovivelo.com/register?ref=${myReferralCode}`;
                if (navigator.share) {
                  navigator.share({ title: 'Vivelo', text: `Usa mi codigo ${myReferralCode} para un descuento!`, url: shareUrl });
                } else {
                  navigator.clipboard.writeText(shareUrl);
                  toast({ title: 'Link copiado', description: 'El enlace de referido ha sido copiado.' });
                }
              }}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
