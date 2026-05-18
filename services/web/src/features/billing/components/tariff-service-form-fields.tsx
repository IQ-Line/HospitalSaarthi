import type { Control } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { Switch } from '@pulse/ui/switch';
import { Textarea } from '@pulse/ui/textarea';
import type { TariffServiceCreateFormValues } from '../validation';

const TAX_TYPE_OPTIONS = ['EXEMPT', 'CGST_SGST', 'IGST'] as const;

interface TariffServiceFormFieldsProps {
  control: Control<TariffServiceCreateFormValues>;
  mode: 'create' | 'edit';
}

export function TariffServiceFormFields({ control, mode }: TariffServiceFormFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {mode === 'create' && (
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="service_code">Service code</Label>
          <Controller
            name="service_code"
            control={control}
            render={({ field }) => (
              <Input id="service_code" {...field} placeholder="e.g. CONS_GENERAL" />
            )}
          />
        </div>
      )}
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="service_name">Service name</Label>
        <Controller
          name="service_name"
          control={control}
          render={({ field }) => <Input id="service_name" {...field} />}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="base_price">Base price</Label>
        <Controller
          name="base_price"
          control={control}
          render={({ field }) => (
            <Input id="base_price" type="number" min={0} step="0.01" {...field} />
          )}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tax_percentage">Tax %</Label>
        <Controller
          name="tax_percentage"
          control={control}
          render={({ field }) => (
            <Input id="tax_percentage" type="number" min={0} max={100} step="0.01" {...field} />
          )}
        />
      </div>
      <div className="space-y-2">
        <Label>Tax type</Label>
        <Controller
          name="tax_type"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? '__none__'}
              onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tax type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                {TAX_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <Input id="category" value={field.value ?? ''} onChange={field.onChange} />
          )}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="department">Department</Label>
        <Controller
          name="department"
          control={control}
          render={({ field }) => (
            <Input id="department" value={field.value ?? ''} onChange={field.onChange} />
          )}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sub_category">Sub-category</Label>
        <Controller
          name="sub_category"
          control={control}
          render={({ field }) => (
            <Input id="sub_category" value={field.value ?? ''} onChange={field.onChange} />
          )}
        />
      </div>
      {mode === 'create' && (
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="provider_id">Provider ID (optional)</Label>
          <Controller
            name="provider_id"
            control={control}
            render={({ field }) => (
              <Input
                id="provider_id"
                value={field.value ?? ''}
                onChange={field.onChange}
                placeholder="UUID for doctor-specific price"
              />
            )}
          />
        </div>
      )}
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="description">Description</Label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Textarea
              id="description"
              value={field.value ?? ''}
              onChange={field.onChange}
              rows={2}
            />
          )}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="effective_from">Effective from</Label>
        <Controller
          name="effective_from"
          control={control}
          render={({ field }) => (
            <Input
              id="effective_from"
              type="datetime-local"
              value={field.value ?? ''}
              onChange={field.onChange}
            />
          )}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="effective_to">Effective to</Label>
        <Controller
          name="effective_to"
          control={control}
          render={({ field }) => (
            <Input
              id="effective_to"
              type="datetime-local"
              value={typeof field.value === 'string' ? field.value : ''}
              onChange={field.onChange}
            />
          )}
        />
      </div>
      <div className="flex items-center gap-2 sm:col-span-2">
        <Controller
          name="is_active"
          control={control}
          render={({ field }) => (
            <Switch checked={field.value} onCheckedChange={field.onChange} id="is_active" />
          )}
        />
        <Label htmlFor="is_active">Active (chargeable)</Label>
      </div>
    </div>
  );
}
