import { useState } from 'react';
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
import { formatEnumLabel } from '../lib/display';
import {
  ORDER_PRIORITIES,
  ORDER_PRIORITY_SLA,
  type OrderPriority,
} from '../lib/order-form-constants';

export type SimpleCategoryOrderFormConfig = {
  nameLabel: string;
  namePlaceholder: string;
  successMessage: string;
};

type SimpleCategoryOrderFormProps = {
  config: SimpleCategoryOrderFormConfig;
};

type FormState = {
  priority: OrderPriority;
  name: string;
  description: string;
  specialInstructions: string;
};

const DEFAULT_FORM = (): FormState => ({
  priority: 'routine',
  name: '',
  description: '',
  specialInstructions: '',
});

export function SimpleCategoryOrderForm({ config }: SimpleCategoryOrderFormProps) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const patch = (values: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...values }));
  };

  const handlePlaceOrder = () => {
    if (!form.name.trim()) {
      toast.error(`${config.nameLabel} is required`);
      return;
    }
    toast.success(config.successMessage);
    setForm(DEFAULT_FORM());
  };

  return (
    <FormSection title="Order Details">
      <div className="space-y-4">
        <FormField>
          <FormFieldLabel>Priority</FormFieldLabel>
          <Select
            value={form.priority}
            onValueChange={(v) => patch({ priority: v as OrderPriority })}
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

        <FormField>
          <FormFieldLabel required>{config.nameLabel}</FormFieldLabel>
          <Input
            placeholder={config.namePlaceholder}
            value={form.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
        </FormField>

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
          <Button type="button" className="gap-1.5" onClick={handlePlaceOrder}>
            <Send className="size-4" />
            Place Order
          </Button>
        </div>
      </div>
    </FormSection>
  );
}

export const PROCEDURE_ORDER_FORM_CONFIG: SimpleCategoryOrderFormConfig = {
  nameLabel: 'Procedure Name',
  namePlaceholder: 'e.g. Central line insertion',
  successMessage: 'Procedure order placed',
};
