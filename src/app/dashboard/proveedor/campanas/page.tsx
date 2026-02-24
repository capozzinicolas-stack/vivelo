'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { CalendarDays, Percent, Trash2 } from 'lucide-react';
import type { Campaign, CampaignSubscription, Service } from '@/types/database';
import { CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_COLORS } from '@/lib/constants';
import { useAuthContext } from '@/providers/auth-provider';
import {
  getActiveCampaignsWithServices,
  getProviderCampaignSubscriptions,
  getServicesByProvider,
  subscribeToCampaign,
  unsubscribeFromCampaign,
} from '@/lib/supabase/queries';

export default function ProviderCampanasPage() {
  const { user } = useAuthContext();
  const [campaigns, setCampaigns] = useState<(Campaign & { subscriptions: CampaignSubscription[] })[]>([]);
  const [mySubscriptions, setMySubscriptions] = useState<CampaignSubscription[]>([]);
  const [myServices, setMyServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const loadData = useCallback(async function loadData() {
    setLoading(true);
    try {
      const [c, subs, services] = await Promise.all([
        getActiveCampaignsWithServices(),
        getProviderCampaignSubscriptions(user!.id),
        getServicesByProvider(user!.id),
      ]);
      setCampaigns(c);
      setMySubscriptions(subs);
      setMyServices(services.filter(s => s.status === 'active'));
    } catch (err) {
      console.error('Error loading campaigns:', err);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id, loadData]);

  async function handleToggleSubscription(campaignId: string, serviceId: string, isSubscribed: boolean, subscriptionId?: string) {
    setSubscribing(`${campaignId}-${serviceId}`);
    try {
      if (isSubscribed && subscriptionId) {
        await unsubscribeFromCampaign(subscriptionId);
      } else {
        await subscribeToCampaign(campaignId, serviceId, user!.id);
      }
      await loadData();
    } catch (err) {
      console.error('Error toggling subscription:', err);
    }
    setSubscribing(null);
  }

  async function handleUnsubscribe(subscriptionId: string) {
    try {
      await unsubscribeFromCampaign(subscriptionId);
      await loadData();
    } catch (err) {
      console.error('Error unsubscribing:', err);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Campanas</h1>

      <div>
        <h2 className="text-lg font-semibold mb-4">Campanas Disponibles</h2>
        {campaigns.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground">No hay campanas activas en este momento.</CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {campaigns.map(campaign => (
              <Card key={campaign.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{campaign.external_name}</CardTitle>
                      {campaign.description && <CardDescription className="mt-1">{campaign.description}</CardDescription>}
                    </div>
                    <Badge className={CAMPAIGN_STATUS_COLORS[campaign.status]}>{CAMPAIGN_STATUS_LABELS[campaign.status]}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-6 text-sm">
                    <div className="flex items-center gap-1">
                      <Percent className="h-4 w-4 text-muted-foreground" />
                      <span>{campaign.discount_pct}% descuento</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(campaign.start_date).toLocaleDateString('es-MX')} - {new Date(campaign.end_date).toLocaleDateString('es-MX')}</span>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-2">Inscribir mis servicios:</p>
                    <div className="space-y-2">
                      {myServices.map(service => {
                        const sub = mySubscriptions.find(s => s.campaign_id === campaign.id && s.service_id === service.id);
                        const isSubscribed = !!sub;
                        const isLoading = subscribing === `${campaign.id}-${service.id}`;
                        return (
                          <div key={service.id} className="flex items-center gap-3">
                            <Checkbox
                              checked={isSubscribed}
                              disabled={isLoading}
                              onCheckedChange={() => handleToggleSubscription(campaign.id, service.id, isSubscribed, sub?.id)}
                            />
                            <span className="text-sm">{service.title}</span>
                            {isSubscribed && <Badge variant="secondary" className="text-xs">Inscrito</Badge>}
                          </div>
                        );
                      })}
                      {myServices.length === 0 && (
                        <p className="text-sm text-muted-foreground">No tienes servicios activos para inscribir.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Mis Inscripciones</h2>
        {mySubscriptions.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground">No tienes servicios inscritos a ninguna campana.</CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {mySubscriptions.map(sub => (
              <Card key={sub.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{sub.service?.title ?? sub.service_id}</p>
                    <p className="text-sm text-muted-foreground">
                      Campana: {sub.campaign?.external_name ?? sub.campaign_id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Inscrito el {new Date(sub.created_at).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleUnsubscribe(sub.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
