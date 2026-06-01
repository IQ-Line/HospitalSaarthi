import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Label } from '@pulse/ui/label';
import { Textarea } from '@pulse/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { useVisitpadMasters } from '../../hooks/use-visitpad-masters';
import { useCreateRxStore } from '../../create-rx.store';
import type { AllergyRow } from '../../types';
import { FormTable, type FormTableColumn } from '../form-table';
import { LifestyleRadioGroup } from '../lifestyle-radio-group';
import { SectionCard } from '../section-card';

const SEVERITY_OPTIONS = [
  { label: 'Mild', value: 'mild' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Severe', value: 'severe' },
] as const;

const LIFESTYLE_OPTIONS = [
  { value: 'former', label: 'Former' },
  { value: 'current', label: 'Current' },
  { value: 'never', label: 'Never' },
] as const;

export function MedicalHistory() {
  const [showMore, setShowMore] = useState(false);
  const {
    isLoading: catalogLoading,
    allergenOptions,
    allergyReactionOptions,
    chronicIllnessOptions,
  } = useVisitpadMasters();
  const isReadOnly = useCreateRxStore((s) => s.isReadOnly);
  const mh = useCreateRxStore((s) => s.formData.medicalHistory);
  const allergies = useCreateRxStore((s) => s.formData.allergyDetails);
  const patchMh = useCreateRxStore((s) => s.patchMedicalHistory);
  const addAllergy = useCreateRxStore((s) => s.addAllergyRow);
  const removeAllergy = useCreateRxStore((s) => s.removeAllergyRow);
  const updateAllergy = useCreateRxStore((s) => s.updateAllergyRow);

  const allergyColumns = useMemo<FormTableColumn<AllergyRow>[]>(
    () => [
      {
        key: 'allergen',
        label: 'Allergies',
        type: 'select',
        placeholder: 'Select allergen',
        options: allergenOptions,
      },
      {
        key: 'reaction',
        label: 'Reactions',
        type: 'select',
        placeholder: 'Select reaction',
        options: allergyReactionOptions,
      },
      {
        key: 'severity',
        label: 'Severity',
        type: 'select',
        options: [...SEVERITY_OPTIONS],
      },
    ],
    [allergenOptions, allergyReactionOptions],
  );

  return (
    <div className="space-y-6 p-4">
      <SectionCard title="Chronic Illness & Lifestyle">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-sm text-gray-600">Chronic Illnesses</Label>
            <Select
              value={mh.chronicIllness || '__none__'}
              onValueChange={(v) => patchMh({ chronicIllness: v === '__none__' ? '' : v })}
              disabled={isReadOnly || catalogLoading}
            >
              <SelectTrigger className="border-[#CBD5E1]">
                <SelectValue
                  placeholder={catalogLoading ? 'Loading catalog…' : 'Select chronic illness'}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                {chronicIllnessOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-gray-600">Smoking Status</Label>
            <LifestyleRadioGroup
              name="smoking"
              value={mh.smokingStatus}
              options={[...LIFESTYLE_OPTIONS]}
              onChange={(v) => patchMh({ smokingStatus: v as typeof mh.smokingStatus })}
              disabled={isReadOnly}
            />
          </div>
          <div className="space-y-1.5 lg:col-span-1">
            <Label className="text-sm text-gray-600">
              History of Present Illness (Any Other Observations)
            </Label>
            <Textarea
              rows={3}
              placeholder="Early-morning breathlessness and recent dizziness"
              value={mh.historyOfPresentIllness}
              onChange={(e) => patchMh({ historyOfPresentIllness: e.target.value })}
              readOnly={isReadOnly}
              className="border-[#CBD5E1] bg-white"
            />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm text-gray-600">Diet Type</Label>
            <Select
              value={mh.dietType || '__none__'}
              onValueChange={(v) => patchMh({ dietType: v === '__none__' ? '' : v })}
              disabled={isReadOnly}
            >
              <SelectTrigger className="border-[#CBD5E1]">
                <SelectValue placeholder="Select diet type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                <SelectItem value="vegetarian">Vegetarian</SelectItem>
                <SelectItem value="non-vegetarian">Non-vegetarian</SelectItem>
                <SelectItem value="vegan">Vegan</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-gray-600">Alcohol Drinking</Label>
            <LifestyleRadioGroup
              name="alcohol"
              value={mh.alcoholStatus}
              options={[...LIFESTYLE_OPTIONS]}
              onChange={(v) => patchMh({ alcoholStatus: v as typeof mh.alcoholStatus })}
              disabled={isReadOnly}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <FormTable
          title="Allergy Details"
          addButtonLabel="Add Allergy"
          indexColumnLabel="Sl. No."
          columns={allergyColumns}
          rows={allergies}
          readOnly={isReadOnly}
          catalogLoading={catalogLoading}
          emptyMessage="No data found"
          onAdd={addAllergy}
          onRemove={removeAllergy}
          onUpdate={(i, field, value) => updateAllergy(i, field as keyof AllergyRow, value)}
        />
      </SectionCard>

      <button
        type="button"
        className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
        onClick={() => setShowMore((v) => !v)}
      >
        <ChevronDown className={`size-4 transition-transform ${showMore ? 'rotate-180' : ''}`} />
        {showMore ? 'Show Less' : 'Show More Details'}
      </button>
    </div>
  );
}
