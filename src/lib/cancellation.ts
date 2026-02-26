import type { CancellationPolicy, CancellationRule } from '@/types/database';

export interface RefundCalculation {
  refund_percent: number;
  refund_amount: number;
}

/**
 * Calculate the refund amount based on a cancellation policy, the event date, and the total paid.
 * Walks the rules sorted by min_hours DESC and returns the first match.
 */
export function calculateRefund(
  policy: CancellationPolicy | { rules: CancellationRule[] },
  eventDate: string,
  totalAmount: number,
): RefundCalculation {
  const hoursUntilEvent = (new Date(eventDate).getTime() - Date.now()) / (1000 * 60 * 60);

  // Sort rules by min_hours descending so the most generous window is checked first
  const sortedRules = [...policy.rules].sort((a, b) => b.min_hours - a.min_hours);

  for (const rule of sortedRules) {
    if (hoursUntilEvent >= rule.min_hours) {
      const refund_percent = rule.refund_percent;
      const refund_amount = Math.round(totalAmount * refund_percent) / 100;
      return { refund_percent, refund_amount };
    }
  }

  // Fallback: no refund (event is too close or already past)
  return { refund_percent: 0, refund_amount: 0 };
}
