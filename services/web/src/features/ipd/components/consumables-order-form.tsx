import { useState } from 'react';
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

type ConsumablesOrderFormProps = {
  admissionId: string;
  onSuccess?: () => void;
};

export function ConsumablesOrderForm({ admissionId, onSuccess }: ConsumablesOrderFormProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const patch = (values: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...values }));
  };

  const placeMutation = useMutation({
    mutationFn: () => {
      const quantity = Number(form.quantity);
      return createInpatientOrder(admissionId, {
        order_category: 'consumable',
        item_name: form.itemName.trim(),
        priority: form.priority,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        description: form.description.trim() || null,
        special_instructions: form.specialInstructions.trim() || null,
      });
    },
    onSuccess: () => {
      setForm(DEFAULT_FORM());
      void queryClient.invalidateQueries({
        queryKey: [...ipdQueryKeys.admissions(), 'orders', admissionId],
      });
      toast.success('Consumables order placed');
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to place order');
    },
  });

  const handlePlaceOrder = () => {
    if (!form.itemName.trim()) {
      toast.error('Item name is required');
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
