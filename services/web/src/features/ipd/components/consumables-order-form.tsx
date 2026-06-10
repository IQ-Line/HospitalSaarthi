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

type FormState = {
  priority: OrderPriority;
  itemName: string;
  quantity: string;
  description: string;
  specialInstructions: string;
};

const DEFAULT_FORM = (): FormState => ({
  priority: 'routine',
  itemName: '',
  quantity: '',
  description: '',
  specialInstructions: '',
});

export function ConsumablesOrderForm() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const patch = (values: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...values }));
  };

  const handlePlaceOrder = () => {
    if (!form.itemName.trim()) {
      toast.error('Item name is required');
      return;
    }
    toast.success('Consumables order placed');
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

        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <FormField>
            <FormFieldLabel required>Item Name</FormFieldLabel>
            <Input
              placeholder="e.g. IV cannula, catheter"
              value={form.itemName}
              onChange={(e) => patch({ itemName: e.target.value })}
            />
          </FormField>
          <FormField>
            <FormFieldLabel>Quantity</FormFieldLabel>
            <Input
              type="number"
              min={1}
              placeholder="Quantity"
              value={form.quantity}
              onChange={(e) => patch({ quantity: e.target.value })}
            />
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
          <Button type="button" className="gap-1.5" onClick={handlePlaceOrder}>
            <Send className="size-4" />
            Place Order
          </Button>
        </div>
      </div>
    </FormSection>
  );
}
