import { useMemo } from 'react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@pulse/ui/input-group';
import { Label } from '@pulse/ui/label';
import { cn } from '@pulse/utils';
import { useVisitpadVitalsCatalog } from '@/features/visitpad/api';
import {
  vitalPairGroupLabel,
  visitpadVitalsToFieldDefs,
} from '../lib/visitpad-vitals-fields';
import { isVitalValueOutOfRange } from '../lib/vital-range';
import { useCreateRxStore } from '../create-rx.store';
import type { VitalFieldDef } from '../types';

function VitalInput({
  field,
  value,
  onChange,
  readOnly,
  hideLabel,
}: {
  field: VitalFieldDef;
  value: string;
  onChange: (v: string) => void;
  readOnly: boolean;
  hideLabel?: boolean;
}) {
  const outOfRange =
    field.normalRange != null && isVitalValueOutOfRange(value, field.normalRange);

  const labelRow = hideLabel ? null : (
    <div className="flex items-baseline justify-between gap-2">
      <Label className="text-xs text-muted-foreground">{field.label}</Label>
      {field.rangeLabel ? (
        <span className="text-[11px] text-muted-foreground tabular-nums">{field.rangeLabel}</span>
      ) : null}
    </div>
  );

  if (readOnly) {
    const displayValue = value.trim() || '—';
    return (
      <div className="space-y-1.5">
        {labelRow}
        <div className="flex min-h-8 items-center gap-1.5">
          <span
            className={cn('text-sm text-gray-900 tabular-nums', outOfRange && 'text-destructive')}
          >
            {displayValue}
          </span>
          {field.unit ? (
            <span className="text-sm text-muted-foreground">{field.unit}</span>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {labelRow}
      <InputGroup className="h-8">
        <InputGroupInput
          type="text"
          inputMode="decimal"
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn('h-8 text-sm tabular-nums', outOfRange && 'text-destructive')}
        />
        {field.unit ? (
          <InputGroupAddon align="inline-end" className="px-2 text-xs">
            {field.unit}
          </InputGroupAddon>
        ) : null}
      </InputGroup>
    </div>
  );
}

function pairedRangeLabel(primary: VitalFieldDef, secondary: VitalFieldDef): string | undefined {
  const labels = [primary.rangeLabel, secondary.rangeLabel].filter(Boolean);
  if (labels.length === 0) return undefined;
  return labels.join(' / ');
}

export function VitalsGrid() {
  const { data: vitalsRes, isLoading } = useVisitpadVitalsCatalog();
  const vitals = useCreateRxStore((s) => s.formData.vitals);
  const isReadOnly = useCreateRxStore((s) => s.isReadOnly);
  const setVital = useCreateRxStore((s) => s.setVital);
  const patientAge = useCreateRxStore((s) => s.context?.patient.age);

  const vitalFields = useMemo(
    () => visitpadVitalsToFieldDefs(vitalsRes?.data, patientAge),
    [vitalsRes?.data, patientAge],
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
          const groupRangeLabel = pairedRangeLabel(primary, field);
          return (
            <div key={field.code} className="space-y-1.5 sm:col-span-2">
              <div className="flex items-baseline justify-between gap-2">
                <Label className="text-xs text-muted-foreground">
                  {vitalPairGroupLabel(primary, field)}
                </Label>
                {groupRangeLabel ? (
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {groupRangeLabel}
                  </span>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <VitalInput
                  field={primary}
                  value={vitals[primary.code] ?? ''}
                  onChange={(v) => setVital(primary.code, v)}
                  readOnly={isReadOnly}
                  hideLabel
                />
                <VitalInput
                  field={field}
                  value={vitals[field.code] ?? ''}
                  onChange={(v) => setVital(field.code, v)}
                  readOnly={isReadOnly}
                  hideLabel
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
