'use client';

import { useState, useEffect } from 'react';
import { useAuthContext } from '@/providers/auth-provider';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Copy, Gift, Users, Share2 } from 'lucide-react';

interface ReferralCode {
  id: string;
  code: string;
  uses_count: number;
  is_active: boolean;
  created_at: string;
}

interface ReferralReward {
  id: string;
  reward_amount: number;
  reward_type: string;
  status: string;
  created_at: string;
}

export default function ProveedorReferidosPage() {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [rewards, setRewards] = useState<ReferralReward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function loadData() {
      const supabase = createClient();

      // Get or create referral code
      const { data: codes } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .limit(1);

      if (codes && codes.length > 0) {
        setReferralCode(codes[0] as ReferralCode);
      } else {
        // Generate a new code
        const code = `VIVELO-${user!.id.slice(0, 6).toUpperCase()}`;
        const { data: newCode } = await supabase
          .from('referral_codes')
          .insert({ user_id: user!.id, code })
          .select()
          .single();
        if (newCode) setReferralCode(newCode as ReferralCode);
      }

      // Get rewards
      const { data: rewardData } = await supabase
        .from('referral_rewards')
        .select('*')
        .eq('referrer_id', user!.id)
        .order('created_at', { ascending: false });
      setRewards((rewardData || []) as ReferralReward[]);

      setLoading(false);
    }

    loadData();
  }, [user]);

  const handleCopyCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode.code);
    toast({ title: 'Codigo copiado', description: 'Tu codigo de referido ha sido copiado al portapapeles.' });
  };

  const handleShare = () => {
    if (!referralCode) return;
    const shareUrl = `https://solovivelo.com/register?ref=${referralCode.code}`;
    if (navigator.share) {
      navigator.share({
        title: 'Vivelo - Servicios para Eventos',
        text: `Usa mi codigo ${referralCode.code} y obtén un descuento en tu primer reserva!`,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Link copiado', description: 'El enlace de referido ha sido copiado.' });
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;
  }

  const totalEarned = rewards
    .filter(r => r.status === 'credited')
    .reduce((sum, r) => sum + r.reward_amount, 0);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Programa de Referidos</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-gold" />
            Tu Codigo de Referido
          </CardTitle>
          <CardDescription>
            Comparte tu codigo con otros proveedores o clientes y gana recompensas cuando reserven su primer servicio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {referralCode && (
            <>
              <div className="flex gap-2">
                <Input value={referralCode.code} readOnly className="font-mono text-lg font-bold text-center" />
                <Button variant="outline" size="icon" onClick={handleCopyCode}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-2xl font-bold">{referralCode.uses_count}</p>
                  <p className="text-xs text-muted-foreground">Referidos</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <Gift className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-2xl font-bold">${totalEarned.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Ganado</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Recompensas</CardTitle>
        </CardHeader>
        <CardContent>
          {rewards.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Aun no tienes recompensas. Comparte tu codigo para empezar a ganar!
            </p>
          ) : (
            <div className="space-y-3">
              {rewards.map(reward => (
                <div key={reward.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">${reward.reward_amount.toLocaleString()} MXN</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(reward.created_at).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                  <Badge variant={reward.status === 'credited' ? 'default' : 'secondary'}>
                    {reward.status === 'credited' ? 'Acreditado' : reward.status === 'pending' ? 'Pendiente' : 'Expirado'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
