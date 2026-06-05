import { useMemo } from 'react';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import { useVisitpadVitalsCatalog } from '@/features/visitpad/api';
import {
  vitalPairGroupLabel,
  visitpadVitalsToFieldDefs,
} from '../lib/visitpad-vitals-fields';
import { useCreateRxStore } from '../create-rx.store';
import type { VitalFieldDef } from '../types';

function VitalInput({
  field,
  value,
  onChange,
  readOnly,
}: {
  field: VitalFieldDef;
  value: string;
  onChange: (v: string) => void;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{field.label}</Label>
      <div className="flex">
        <Input
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          className="h-9 rounded-r-none"
        />
        {field.unit ? (
          <span className="inline-flex items-center rounded-r-md border border-l-0 bg-muted px-2 text-xs text-muted-foreground whitespace-nowrap">
            {field.unit}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function VitalsGrid() {
  const { data: vitalsRes, isLoading } = useVisitpadVitalsCatalog();
  const vitals = useCreateRxStore((s) => s.formData.vitals);
  const isReadOnly = useCreateRxStore((s) => s.isReadOnly);
  const setVital = useCreateRxStore((s) => s.setVital);

  const vitalFields = useMemo(
    () => visitpadVitalsToFieldDefs(vitalsRes?.data),
    [vitalsRes?.data],
  );

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading vitals from Visitpad masters…</p>
    );
  }

  if (vitalFields.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No vitals configured. Add active vitals under Visitpad → Vitals.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {vitalFields.map((field) => {
        const isPairPrimary = vitalFields.some((f) => f.pairedWith === field.code);
        if (isPairPrimary) return null;

        if (field.pairedWith) {
          const primary = vitalFields.find((f) => f.code === field.pairedWith);
          if (!primary) return null;
          return (
            <div key={field.code} className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">
                {vitalPairGroupLabel(primary, field)}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <VitalInput
                  field={primary}
                  value={vitals[primary.code] ?? ''}
                  onChange={(v) => setVital(primary.code, v)}
                  readOnly={isReadOnly}
                />
                <VitalInput
                  field={field}
                  value={vitals[field.code] ?? ''}
                  onChange={(v) => setVital(field.code, v)}
                  readOnly={isReadOnly}
                />
              </div>
            </div>
          );
        }

        return (
          <VitalInput
            key={field.code}
            field={field}
            value={vitals[field.code] ?? ''}
            onChange={(v) => setVital(field.code, v)}
            readOnly={isReadOnly}
          />
        );
      })}
    </div>
  );
}
