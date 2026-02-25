'use client';

import { useState } from 'react';
import { getFieldsForCategory, type CategoryFieldConfig } from '@/data/category-fields-config';
import { categoryMap } from '@/data/categories';
import type { ServiceCategory } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CategoryFieldsFormProps {
  category: string;
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
}

export function CategoryFieldsForm({ category, values, onChange }: CategoryFieldsFormProps) {
  const fields = getFieldsForCategory(category as ServiceCategory);
  const catInfo = categoryMap[category as ServiceCategory];
  const catLabel = catInfo?.label || category;

  const setValue = (key: string, value: unknown) => {
    onChange({ ...values, [key]: value });
  };

  if (fields.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalles de {catLabel}</CardTitle>
        <p className="text-sm text-muted-foreground">Informacion adicional para que los clientes conozcan mejor tu servicio.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {fields.map((field) => (
          <FieldRenderer
            key={field.key}
            field={field}
            value={values[field.key]}
            onChange={(v) => setValue(field.key, v)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: CategoryFieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (field.type) {
    case 'text_long':
      return (
        <div>
          <Label>{field.label}</Label>
          <Textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1"
            rows={3}
          />
          <p className="text-xs text-muted-foreground mt-1">{field.instruction}</p>
        </div>
      );

    case 'text_short':
      return (
        <div>
          <Label>{field.label}</Label>
          <Input
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">{field.instruction}</p>
        </div>
      );

    case 'number':
      return (
        <div>
          <Label>{field.label}</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              type="number"
              value={value !== undefined && value !== null ? String(value) : ''}
              onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
              className="max-w-[200px]"
            />
            {field.unit && <span className="text-sm text-muted-foreground">{field.unit}</span>}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{field.instruction}</p>
        </div>
      );

    case 'currency':
      return (
        <div>
          <Label>{field.label}</Label>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">$</span>
            <Input
              type="number"
              value={value !== undefined && value !== null ? String(value) : ''}
              onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
              className="max-w-[200px]"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{field.instruction}</p>
        </div>
      );

    case 'multi_select':
      return <MultiSelectField field={field} value={value} onChange={onChange} />;

    case 'dropdown':
      return <DropdownField field={field} value={value} onChange={onChange} />;

    case 'switch':
      return (
        <div className="flex items-center justify-between">
          <div>
            <Label>{field.label}</Label>
            <p className="text-xs text-muted-foreground">{field.instruction}</p>
          </div>
          <Switch
            checked={!!value}
            onCheckedChange={(checked) => onChange(checked)}
          />
        </div>
      );

    case 'switch_number':
      return <SwitchNumberField field={field} value={value} onChange={onChange} />;

    default:
      return null;
  }
}

function MultiSelectField({
  field,
  value,
  onChange,
}: {
  field: CategoryFieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const selected = Array.isArray(value) ? (value as string[]) : [];
  const [otherValue, setOtherValue] = useState('');
  const options = field.options || [];

  const toggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const addOther = () => {
    if (otherValue.trim() && !selected.includes(otherValue.trim())) {
      onChange([...selected, otherValue.trim()]);
      setOtherValue('');
    }
  };

  // Custom values are those not in the predefined options (excluding "Otro")
  const predefinedOptions = options.filter((o) => o !== 'Otro');
  const hasOtroOption = options.includes('Otro');

  return (
    <div>
      <Label>{field.label}</Label>
      <p className="text-xs text-muted-foreground mt-1 mb-2">{field.instruction}</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {predefinedOptions.map((option) => (
          <label key={option} className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={selected.includes(option)}
              onCheckedChange={() => toggle(option)}
            />
            <span className="text-sm">{option}</span>
          </label>
        ))}
      </div>
      {hasOtroOption && (
        <div className="flex items-center gap-2 mt-2">
          <Input
            placeholder="Otro (escribe y presiona Enter)"
            value={otherValue}
            onChange={(e) => setOtherValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addOther();
              }
            }}
            className="max-w-[300px]"
          />
        </div>
      )}
      {/* Show custom values as removable tags */}
      {selected.filter((s) => !predefinedOptions.includes(s)).length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selected
            .filter((s) => !predefinedOptions.includes(s))
            .map((custom) => (
              <span
                key={custom}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs"
              >
                {custom}
                <button
                  type="button"
                  onClick={() => toggle(custom)}
                  className="hover:text-destructive"
                >
                  x
                </button>
              </span>
            ))}
        </div>
      )}
    </div>
  );
}

function DropdownField({
  field,
  value,
  onChange,
}: {
  field: CategoryFieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherValue, setOtherValue] = useState('');
  const options = field.options || [];
  const predefinedOptions = options.filter((o) => o !== 'Otro');
  const hasOtroOption = options.includes('Otro');
  const currentValue = (value as string) || '';
  const isCustomValue = currentValue && !predefinedOptions.includes(currentValue);

  return (
    <div>
      <Label>{field.label}</Label>
      <Select
        value={isCustomValue ? '__otro__' : currentValue}
        onValueChange={(v) => {
          if (v === '__otro__') {
            setShowOtherInput(true);
          } else {
            setShowOtherInput(false);
            onChange(v);
          }
        }}
      >
        <SelectTrigger className="mt-1">
          <SelectValue placeholder="Seleccionar..." />
        </SelectTrigger>
        <SelectContent>
          {predefinedOptions.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
          {hasOtroOption && (
            <SelectItem value="__otro__">Otro</SelectItem>
          )}
        </SelectContent>
      </Select>
      {(showOtherInput || isCustomValue) && (
        <Input
          placeholder="Especifica..."
          value={isCustomValue ? currentValue : otherValue}
          onChange={(e) => {
            setOtherValue(e.target.value);
            onChange(e.target.value);
          }}
          className="mt-2"
        />
      )}
      <p className="text-xs text-muted-foreground mt-1">{field.instruction}</p>
    </div>
  );
}

function SwitchNumberField({
  field,
  value,
  onChange,
}: {
  field: CategoryFieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const val = value as { enabled: boolean; count: number } | null;
  const enabled = val?.enabled ?? false;
  const count = val?.count ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Label>{field.switchLabel || field.label}</Label>
          <p className="text-xs text-muted-foreground">{field.instruction}</p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(checked) =>
            onChange({ enabled: checked, count: checked ? count : 0 })
          }
        />
      </div>
      {enabled && (
        <div className="mt-2">
          <Label className="text-sm">{field.numberLabel || 'Cantidad'}</Label>
          <Input
            type="number"
            value={count || ''}
            onChange={(e) =>
              onChange({ enabled: true, count: Number(e.target.value) || 0 })
            }
            className="mt-1 max-w-[200px]"
          />
        </div>
      )}
    </div>
  );
}
