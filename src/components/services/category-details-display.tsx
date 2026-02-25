'use client';

import { getFieldsForCategory, type CategoryFieldConfig } from '@/data/category-fields-config';
import type { ServiceCategory } from '@/types/database';
import { Badge } from '@/components/ui/badge';

interface CategoryDetailsDisplayProps {
  category: string;
  details: Record<string, unknown>;
}

export function CategoryDetailsDisplay({ category, details }: CategoryDetailsDisplayProps) {
  const fields = getFieldsForCategory(category as ServiceCategory);

  // Filter to only fields that have non-empty values
  const fieldsWithValues = fields.filter((field) => {
    const val = details[field.key];
    if (val === undefined || val === null || val === '') return false;
    if (Array.isArray(val) && val.length === 0) return false;
    return true;
  });

  if (fieldsWithValues.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Detalles del servicio</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fieldsWithValues.map((field) => (
          <DetailItem
            key={field.key}
            field={field}
            value={details[field.key]}
          />
        ))}
      </div>
    </div>
  );
}

function DetailItem({
  field,
  value,
}: {
  field: CategoryFieldConfig;
  value: unknown;
}) {
  return (
    <div className={field.type === 'text_long' ? 'md:col-span-2' : ''}>
      <p className="text-sm font-medium text-muted-foreground">{field.label}</p>
      <div className="mt-1">
        <DetailValue field={field} value={value} />
      </div>
    </div>
  );
}

function DetailValue({
  field,
  value,
}: {
  field: CategoryFieldConfig;
  value: unknown;
}) {
  switch (field.type) {
    case 'text_long':
    case 'text_short':
    case 'dropdown':
      return <p className="text-sm whitespace-pre-line">{String(value)}</p>;

    case 'number':
      return (
        <p className="text-sm">
          {String(value)}
          {field.unit && <span className="text-muted-foreground ml-1">{field.unit}</span>}
        </p>
      );

    case 'currency':
      return <p className="text-sm">${Number(value).toLocaleString()}</p>;

    case 'multi_select': {
      const items = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-wrap gap-1">
          {items.map((item) => (
            <Badge key={item} variant="secondary" className="text-xs">
              {item}
            </Badge>
          ))}
        </div>
      );
    }

    case 'switch':
      return <p className="text-sm">{value ? 'Si' : 'No'}</p>;

    case 'switch_number': {
      const val = value as { enabled: boolean; count: number } | null;
      if (!val) return <p className="text-sm">No</p>;
      return (
        <p className="text-sm">
          {val.enabled ? `Si (${val.count})` : 'No'}
        </p>
      );
    }

    default:
      return <p className="text-sm">{String(value)}</p>;
  }
}
