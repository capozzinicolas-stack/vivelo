import type { CancellationPolicy } from '@/types/database';
import { ShieldCheck } from 'lucide-react';

function formatHours(hours: number): string {
  if (hours >= 24) {
    const days = Math.round(hours / 24);
    return `${days} dia${days !== 1 ? 's' : ''}`;
  }
  return `${hours} hora${hours !== 1 ? 's' : ''}`;
}

function getRefundColor(percent: number): string {
  if (percent === 100) return 'bg-green-50 text-green-700 border-green-200';
  if (percent > 0) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  return 'bg-red-50 text-red-700 border-red-200';
}

export function CancellationPolicyDisplay({ policy }: { policy: CancellationPolicy }) {
  const sortedRules = [...policy.rules].sort((a, b) => b.min_hours - a.min_hours);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Politica de Cancelacion</h3>
        <span className="text-sm font-medium text-muted-foreground">({policy.name})</span>
      </div>

      {policy.description && (
        <p className="text-sm text-muted-foreground">{policy.description}</p>
      )}

      <div className="space-y-2">
        {sortedRules.map((rule, i) => {
          const desc = rule.max_hours === null
            ? `Mas de ${formatHours(rule.min_hours)} antes del evento`
            : rule.min_hours === 0
              ? `Menos de ${formatHours(rule.max_hours)} antes del evento`
              : `Entre ${formatHours(rule.min_hours)} y ${formatHours(rule.max_hours)} antes`;
          return (
            <div
              key={i}
              className={`flex items-center justify-between p-3 rounded-lg border text-sm ${getRefundColor(rule.refund_percent)}`}
            >
              <span>{desc}</span>
              <span className="font-semibold whitespace-nowrap ml-4">
                {rule.refund_percent === 0 ? 'Sin reembolso' : `${rule.refund_percent}% reembolso`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
