'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PlacementType } from '@/types/database';

interface TrackingParams {
  placementType: PlacementType;
  placementId: string;
  serviceId?: string;
}

const trackedImpressions = new Set<string>();

export function useImpressionTracker({ placementType, placementId, serviceId }: TrackingParams) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !placementId) return;

    const key = `${placementType}:${placementId}`;
    if (trackedImpressions.has(key)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !trackedImpressions.has(key)) {
          trackedImpressions.add(key);
          trackEvent('impression', placementType, placementId, serviceId);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [placementType, placementId, serviceId]);

  const trackClick = useCallback(() => {
    trackEvent('click', placementType, placementId, serviceId);
  }, [placementType, placementId, serviceId]);

  return { ref, trackClick };
}

async function trackEvent(
  eventType: 'impression' | 'click',
  placementType: PlacementType,
  placementId: string,
  serviceId?: string,
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('marketing_events').insert({
      event_type: eventType,
      placement_type: placementType,
      placement_id: placementId,
      service_id: serviceId || null,
      user_id: user?.id || null,
      page_url: typeof window !== 'undefined' ? window.location.pathname : null,
    });
  } catch {
    // Non-blocking: don't let tracking errors break the UI
  }
}
