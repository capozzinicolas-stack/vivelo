'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { CalendarCheck, UserPlus, Settings } from 'lucide-react';
import { WHATSAPP_JOURNEYS, TOUCHPOINT_CONFIG } from '@/lib/constants';
import { type ConversationChannel } from '@/lib/constants';

interface Touchpoint {
  eventType: string;
  label: string;
  description: string;
  recipient: 'provider' | 'client' | 'admin';
  trigger: string;
  channel: ConversationChannel;
  journey: string;
  phase: string;
  templateName: string | null;
  templateStatus: string | null;
  active: boolean;
  eventCount30d: number;
}

interface FlujosTabProps {
  touchpoints: Touchpoint[];
  loading: boolean;
}

const JOURNEY_ICONS: Record<string, React.ReactNode> = {
  CalendarCheck: <CalendarCheck className="h-5 w-5" />,
  UserPlus: <UserPlus className="h-5 w-5" />,
  Settings: <Settings className="h-5 w-5" />,
};

const RECIPIENT_CHIP_COLORS: Record<string, string> = {
  provider: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
  client: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
  admin: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
};

function getTouchpointData(eventType: string, touchpoints: Touchpoint[]) {
  return touchpoints.find((tp) => tp.eventType === eventType);
}

function getStaticTouchpoint(eventType: string) {
  return TOUCHPOINT_CONFIG.find((tp) => tp.eventType === eventType);
}

export function FlujosTab({ touchpoints, loading }: FlujosTabProps) {
  const [expandedChip, setExpandedChip] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  function getJourneyMessageCount(journeyId: string): number {
    const journey = WHATSAPP_JOURNEYS.find((j) => j.id === journeyId);
    if (!journey) return 0;
    let total = 0;
    for (const phase of journey.phases) {
      for (const eventType of phase.touchpoints) {
        const tp = getTouchpointData(eventType, touchpoints);
        if (tp) total += tp.eventCount30d;
      }
    }
    return total;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-4">
        Mapa visual de los journeys de WhatsApp. Click en un touchpoint para ver detalles.
      </p>

      <Accordion type="multiple" defaultValue={['reserva']}>
        {WHATSAPP_JOURNEYS.map((journey) => {
          const msgCount = getJourneyMessageCount(journey.id);

          return (
            <AccordionItem key={journey.id} value={journey.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  {JOURNEY_ICONS[journey.icon]}
                  <span className="font-semibold">{journey.label}</span>
                  <Badge variant="secondary" className="text-xs">
                    {msgCount} msgs 30d
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  {journey.phases.map((phase, phaseIdx) => (
                    <div key={phase.id} className="flex items-start gap-4">
                      {/* Phase connector */}
                      <div className="flex flex-col items-center pt-1">
                        <div className="w-3 h-3 rounded-full bg-primary border-2 border-primary/30 shrink-0" />
                        {phaseIdx < journey.phases.length - 1 && (
                          <div className="w-0.5 flex-1 bg-border min-h-[24px]" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 pb-2">
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          {phase.label}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {phase.touchpoints.map((eventType) => {
                            const staticTp = getStaticTouchpoint(eventType);
                            const liveTp = getTouchpointData(eventType, touchpoints);
                            if (!staticTp) return null;

                            const isExpanded = expandedChip === eventType;
                            const chipColor = RECIPIENT_CHIP_COLORS[staticTp.recipient] || RECIPIENT_CHIP_COLORS.admin;

                            return (
                              <div key={eventType} className="flex flex-col">
                                <button
                                  onClick={() => setExpandedChip(isExpanded ? null : eventType)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${chipColor} ${isExpanded ? 'ring-2 ring-primary/40' : ''}`}
                                >
                                  {staticTp.label}
                                  {liveTp && liveTp.eventCount30d > 0 && (
                                    <span className="text-[10px] opacity-70">
                                      ({liveTp.eventCount30d})
                                    </span>
                                  )}
                                </button>

                                {isExpanded && (
                                  <div className="mt-2 p-3 bg-muted/50 rounded-lg text-xs space-y-1 max-w-xs border">
                                    <p>
                                      <span className="font-medium">Disparador:</span>{' '}
                                      {staticTp.trigger}
                                    </p>
                                    {liveTp?.templateName && (
                                      <p>
                                        <span className="font-medium">Template:</span>{' '}
                                        <code className="bg-muted px-1 py-0.5 rounded">
                                          {liveTp.templateName}
                                        </code>
                                      </p>
                                    )}
                                    <p>
                                      <span className="font-medium">30 dias:</span>{' '}
                                      {liveTp?.eventCount30d ?? 0} mensajes
                                    </p>
                                    <p>
                                      <span className="font-medium">Estado:</span>{' '}
                                      {liveTp?.active ? (
                                        <span className="text-green-700">Activo</span>
                                      ) : (
                                        <span className="text-yellow-700">Sin template</span>
                                      )}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Legend */}
      <div className="flex items-center gap-4 pt-4 border-t text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-indigo-200" />
          Proveedor
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-200" />
          Cliente
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-gray-200" />
          Admin
        </div>
      </div>
    </div>
  );
}
