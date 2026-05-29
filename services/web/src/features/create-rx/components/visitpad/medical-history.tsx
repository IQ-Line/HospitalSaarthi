import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import { Textarea } from '@pulse/ui/textarea';
import { useCreateRxStore } from '../../create-rx.store';
import type { AllergyRow } from '../../types';
import { CreateRxFormTable, type FormTableColumn } from '../form-table';
import { LifestyleRadioGroup } from '../lifestyle-radio-group';
import { SectionCard } from '../section-card';

const ALLERGY_COLUMNS: FormTableColumn<AllergyRow>[] = [
  { key: 'allergen', label: 'Allergies', placeholder: 'Allergen' },
  { key: 'reaction', label: 'Reactions', placeholder: 'Reaction' },
  {
    key: 'severity',
    label: 'Severity',
    type: 'select',
    options: [
      { label: 'Mild', value: 'mild' },
      { label: 'Moderate', value: 'moderate' },
      { label: 'Severe', value: 'severe' },
    ],
  },
];

const LIFESTYLE_OPTIONS = [
  { value: 'former', label: 'Former' },
  { value: 'current', label: 'Current' },
  { value: 'never', label: 'Never' },
] as const;

export function CreateRxMedicalHistory() {
  const [showMore, setShowMore] = useState(false);
  const isReadOnly = useCreateRxStore((s) => s.isReadOnly);
  const mh = useCreateRxStore((s) => s.formData.medicalHistory);
  const allergies = useCreateRxStore((s) => s.formData.allergyDetails);
  const patchMh = useCreateRxStore((s) => s.patchMedicalHistory);
  const addAllergy = useCreateRxStore((s) => s.addAllergyRow);
  const removeAllergy = useCreateRxStore((s) => s.removeAllergyRow);
  const updateAllergy = useCreateRxStore((s) => s.updateAllergyRow);

  return (
    <div className="space-y-6 p-4">
      <SectionCard title="Chronic Illness & Lifestyle">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-sm text-gray-600">Chronic Illnesses</Label>
            <Input
              placeholder="Select or type chronic illness..."
              value={mh.chronicIllness}
              onChange={(e) => patchMh({ chronicIllness: e.target.value })}
              readOnly={isReadOnly}
              className="border-[#CBD5E1]"
            />
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
            <Input
              placeholder="Select or type diet..."
              value={mh.dietType}
              onChange={(e) => patchMh({ dietType: e.target.value })}
              readOnly={isReadOnly}
              className="border-[#CBD5E1]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-gray-600">Alcohol Drinking</Label>
            <LifestyleRadioGroup
              name="alcohol"
              value={mh.alcoholDrinking}
              options={[...LIFESTYLE_OPTIONS]}
              onChange={(v) => patchMh({ alcoholDrinking: v as typeof mh.alcoholDrinking })}
              disabled={isReadOnly}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <CreateRxFormTable
          title="Allergy Details"
          addButtonLabel="Add Allergy"
          indexColumnLabel="Sl. No."
          columns={ALLERGY_COLUMNS}
          rows={allergies}
          readOnly={isReadOnly}
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
