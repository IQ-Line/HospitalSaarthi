import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { Textarea } from '@pulse/ui/textarea';
import { FormField, FormFieldLabel, FormSection } from '@/components/form-chrome';
import { createInpatientOrder } from '../api/orders';
import { ipdQueryKeys } from '../api/query-keys';
import { formatEnumLabel } from '../lib/display';
import {
  ORDER_PRIORITIES,
  ORDER_PRIORITY_SLA,
  type OrderPriority,
} from '../lib/order-form-constants';

const ROUTES = ['oral', 'iv', 'im', 'sc', 'topical', 'inhalation', 'sublingual'] as const;

const FREQUENCIES = [
  { value: 'od', label: 'OD (Once daily)', perDay: 1 },
  { value: 'bd', label: 'BD (Twice daily)', perDay: 2 },
  { value: 'tds', label: 'TDS (Three times daily)', perDay: 3 },
  { value: 'qid', label: 'QID (Four times daily)', perDay: 4 },
  { value: 'q6h', label: 'Q6H', perDay: 4 },
  { value: 'q8h', label: 'Q8H', perDay: 3 },
  { value: 'q12h', label: 'Q12H', perDay: 2 },
  { value: 'prn', label: 'PRN', perDay: 0 },
] as const;

const ORDER_PATTERNS = ['scheduled', 'prn', 'stat_dose', 'continuous'] as const;

type MedicationOrderFormState = {
  priority: OrderPriority;
  medicationName: string;
  dose: string;
  route: string;
  frequency: string;
  orderPattern: (typeof ORDER_PATTERNS)[number];
  durationDays: string;
  totalQuantity: string;
  description: string;
  specialInstructions: string;
};

const DEFAULT_FORM = (): MedicationOrderFormState => ({
  priority: 'routine',
  medicationName: '',
  dose: '',
  route: '',
  frequency: '',
  orderPattern: 'scheduled',
  durationDays: '',
  totalQuantity: '',
  description: '',
  specialInstructions: '',
});

type MedicationOrderFormProps = {
  admissionId: string;
  onSuccess?: () => void;
};

function buildDosageInstruction(form: MedicationOrderFormState): string | null {
  const parts = [
    form.dose.trim(),
    form.route.trim() ? formatEnumLabel(form.route) : '',
    formatEnumLabel(form.orderPattern),
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

export function MedicationOrderForm({ admissionId, onSuccess }: MedicationOrderFormProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<MedicationOrderFormState>(DEFAULT_FORM);
  const [quantityOverridden, setQuantityOverridden] = useState(false);

  const patch = (patchValues: Partial<MedicationOrderFormState>) => {
    setForm((prev) => ({ ...prev, ...patchValues }));
  };

  useEffect(() => {
    if (quantityOverridden) return;
    const duration = Number(form.durationDays);
    const freq = FREQUENCIES.find((f) => f.value === form.frequency);
    const suggested =
      !freq || freq.perDay === 0 || !Number.isFinite(duration) || duration <= 0
        ? ''
        : String(Math.round(duration * freq.perDay));
    setForm((prev) => (prev.totalQuantity === suggested ? prev : { ...prev, totalQuantity: suggested }));
  }, [form.durationDays, form.frequency, quantityOverridden]);

  const placeMutation = useMutation({
    mutationFn: () => {
      const duration = Number(form.durationDays);
      const quantity = Number(form.totalQuantity);
      return createInpatientOrder(admissionId, {
        order_category: 'medication',
        item_name: form.medicationName.trim(),
        priority: form.priority,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        dosage_instruction: buildDosageInstruction(form),
        frequency: form.frequency || null,
        duration_days: Number.isFinite(duration) && duration > 0 ? duration : null,
        description: form.description.trim() || null,
        special_instructions: form.specialInstructions.trim() || null,
      });
    },
    onSuccess: () => {
      setForm(DEFAULT_FORM());
      setQuantityOverridden(false);
      void queryClient.invalidateQueries({
        queryKey: [...ipdQueryKeys.admissions(), 'orders', admissionId],
      });
      toast.success('Medication order placed');
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to place order');
    },
  });

  const handlePlaceOrder = () => {
    if (!form.medicationName.trim()) {
      toast.error('Medication name is required');
      return;
    }
    placeMutation.mutate();
  };

  return (
    <FormSection title="Order Details">
      <div className="space-y-4">
        <FormField>
          <FormFieldLabel>Priority</FormFieldLabel>
          <Select
            value={form.priority}
            onValueChange={(v) => patch({ priority: v as MedicationOrderFormState['priority'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDER_PRIORITIES.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {formatEnumLabel(priority)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">SLA: {ORDER_PRIORITY_SLA[form.priority]}</p>
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField>
            <FormFieldLabel required>Medication Name</FormFieldLabel>
            <Input
              placeholder="Search drug master..."
              value={form.medicationName}
              onChange={(e) => patch({ medicationName: e.target.value })}
            />
          </FormField>
          <FormField>
            <FormFieldLabel>Dose</FormFieldLabel>
            <Input
              placeholder="e.g. 500mg"
              value={form.dose}
              onChange={(e) => patch({ dose: e.target.value })}
            />
          </FormField>
          <FormField>
            <FormFieldLabel>Route</FormFieldLabel>
            <Select value={form.route || undefined} onValueChange={(v) => patch({ route: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select route" />
              </SelectTrigger>
              <SelectContent>
                {ROUTES.map((route) => (
                  <SelectItem key={route} value={route}>
                    {formatEnumLabel(route)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField>
            <FormFieldLabel>Frequency</FormFieldLabel>
            <Select
              value={form.frequency || undefined}
              onValueChange={(v) => patch({ frequency: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((freq) => (
                  <SelectItem key={freq.value} value={freq.value}>
                    {freq.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField>
            <FormFieldLabel>Order Pattern</FormFieldLabel>
            <Select
              value={form.orderPattern}
              onValueChange={(v) =>
                patch({ orderPattern: v as MedicationOrderFormState['orderPattern'] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDER_PATTERNS.map((pattern) => (
                  <SelectItem key={pattern} value={pattern}>
                    {formatEnumLabel(pattern)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField>
            <FormFieldLabel>Duration (days)</FormFieldLabel>
            <Input
              type="number"
              min={1}
              placeholder="e.g. 5"
              value={form.durationDays}
              onChange={(e) => patch({ durationDays: e.target.value })}
            />
          </FormField>
          <FormField>
            <FormFieldLabel>Total Quantity</FormFieldLabel>
            <Input
              placeholder="auto from frequency × duration"
              value={form.totalQuantity}
              onChange={(e) => {
                setQuantityOverridden(true);
                patch({ totalQuantity: e.target.value });
              }}
            />
            <p className="text-xs text-muted-foreground">
              Total tablets/units dispensed by pharmacy. Auto-suggested from frequency × duration;
              edit to override.
            </p>
          </FormField>
        </div>

        <FormField>
          <FormFieldLabel>Description</FormFieldLabel>
          <Input
            placeholder="Brief order description"
            value={form.description}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </FormField>

        <FormField>
          <FormFieldLabel>Special Instructions</FormFieldLabel>
          <Textarea
            placeholder="Any special instructions..."
            rows={3}
            value={form.specialInstructions}
            onChange={(e) => patch({ specialInstructions: e.target.value })}
          />
        </FormField>

        <div className="flex justify-end border-t pt-4">
          <Button
            type="button"
            className="gap-1.5"
            disabled={placeMutation.isPending}
            onClick={handlePlaceOrder}
          >
            <Send className="size-4" />
            Place Order
          </Button>
        </div>
      </div>
    </FormSection>
  );
}
