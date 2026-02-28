'use client';

import { useState, useEffect } from 'react';
import { useAuthContext } from '@/providers/auth-provider';
import { updateProfile, updateClientBilling } from '@/lib/supabase/queries';
import { uploadProfilePicture } from '@/lib/supabase/storage';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Camera, Save, Copy, Share2, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ClientePerfilPage() {
  const { user, isMockMode, updateUser } = useAuthContext();
  const { toast } = useToast();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [rfc, setRfc] = useState(user?.rfc || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [myReferralCode, setMyReferralCode] = useState('');

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

  if (!user) return null;

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

  const handleSave = async () => {
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
      });
      await updateClientBilling(user.id, rfc.trim() || null);
      updateUser({
        full_name: fullName.trim(),
        phone: digitsOnly,
        avatar_url: avatarUrl || null,
        rfc: rfc.trim() || null,
      });
      setMessage('Perfil guardado correctamente');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Mi Perfil</h1>

      {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>}
      {message && <div className="bg-green-50 text-green-700 text-sm p-3 rounded-md">{message}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Informacion Personal</CardTitle>
          <CardDescription>Actualiza tu nombre, telefono y foto de perfil</CardDescription>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos de Facturacion</CardTitle>
          <CardDescription>Opcional: agrega tu RFC para recibir facturas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-sm">
            <Label htmlFor="rfc">RFC</Label>
            <Input id="rfc" value={rfc} onChange={(e) => setRfc(e.target.value.toUpperCase())} placeholder="XAXX010101000" maxLength={13} />
            <p className="text-xs text-muted-foreground">13 caracteres para persona moral, 12 para persona fisica</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Guardar Cambios
      </Button>

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
              <Button variant="outline" size="icon" onClick={() => {
                navigator.clipboard.writeText(myReferralCode);
                toast({ title: 'Codigo copiado', description: 'Tu codigo de referido ha sido copiado al portapapeles.' });
              }}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => {
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
