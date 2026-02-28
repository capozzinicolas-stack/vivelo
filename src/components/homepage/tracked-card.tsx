'use client';

import { useImpressionTracker } from '@/hooks/use-impression-tracker';
import type { PlacementType } from '@/types/database';

interface TrackedCardProps {
  placementType: PlacementType;
  placementId: string;
  serviceId?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function TrackedCard({ placementType, placementId, serviceId, children, className, onClick }: TrackedCardProps) {
  const { ref, trackClick } = useImpressionTracker({ placementType, placementId, serviceId });

  const handleClick = () => {
    trackClick();
    onClick?.();
  };

  return (
    <div ref={ref} className={className} onClick={handleClick}>
      {children}
    </div>
  );
}
