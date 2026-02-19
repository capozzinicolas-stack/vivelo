'use client';

import { COMMISSION_RATE, ZONES, CANCELLATION_POLICY } from '@/lib/constants';
import { categories } from '@/data/categories';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Percent, MapPin, Tag, FileText } from 'lucide-react';

export default function AdminConfiguracionPage() {
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
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Politica de Cancelacion</CardTitle>
            <CardDescription>Reglas de reembolso segun tiempo antes del evento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm">Reembolso completo</span>
                <span className="text-sm font-medium">{CANCELLATION_POLICY.FULL_REFUND_DAYS}+ dias antes</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm">Reembolso 70%</span>
                <span className="text-sm font-medium">{CANCELLATION_POLICY.PARTIAL_30_DAYS}-{CANCELLATION_POLICY.FULL_REFUND_DAYS} dias antes</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm">Reembolso 50%</span>
                <span className="text-sm font-medium">{CANCELLATION_POLICY.PARTIAL_50_DAYS}-{CANCELLATION_POLICY.PARTIAL_30_DAYS} dias antes</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-red-50">
                <span className="text-sm">Sin reembolso</span>
                <span className="text-sm font-medium">Menos de {CANCELLATION_POLICY.NO_REFUND_HOURS}h antes</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Zonas de Servicio</CardTitle>
            <CardDescription>{ZONES.length} zonas activas en México</CardDescription>
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
    </div>
  );
}
