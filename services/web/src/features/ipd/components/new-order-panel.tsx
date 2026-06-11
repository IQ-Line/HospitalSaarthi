import { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  Droplet,
  Dumbbell,
  FlaskConical,
  Package,
  Pill,
  ScanLine,
  Scissors,
  Stethoscope,
  UtensilsCrossed,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { cn } from '@pulse/utils';
import {
  admissionStatusBadgeClass,
  admissionStatusLabel,
} from '../lib/display';
import type { AdmissionDetail } from '../types';
import { ConsumablesOrderForm } from './consumables-order-form';
import { MedicationOrderForm } from './medication-order-form';
import {
  PROCEDURE_ORDER_FORM_CONFIG,
  SimpleCategoryOrderForm,
} from './simple-category-order-form';

export type OrderCategoryId =
  | 'medication'
  | 'laboratory'
  | 'radiology'
  | 'blood'
  | 'procedure'
  | 'consultation'
  | 'diet'
  | 'physiotherapy'
  | 'nursing_task'
  | 'consumables';

const ORDER_CATEGORIES: {
  id: OrderCategoryId;
  label: string;
  icon: typeof Pill;
}[] = [
  { id: 'medication', label: 'Medication', icon: Pill },
  { id: 'laboratory', label: 'Laboratory', icon: FlaskConical },
  { id: 'radiology', label: 'Radiology', icon: ScanLine },
  { id: 'blood', label: 'Blood', icon: Droplet },
  { id: 'procedure', label: 'Procedure', icon: Scissors },
  { id: 'consultation', label: 'Consultation', icon: Stethoscope },
  { id: 'diet', label: 'Diet', icon: UtensilsCrossed },
  { id: 'physiotherapy', label: 'Physiotherapy', icon: Dumbbell },
  { id: 'nursing_task', label: 'Nursing Task', icon: ClipboardList },
  { id: 'consumables', label: 'Consumables', icon: Package },
];

type NewOrderPanelProps = {
  admission: AdmissionDetail;
  onBack: () => void;
};

const IMPLEMENTED_CATEGORIES = new Set<OrderCategoryId>([
  'medication',
  'procedure',
  'consumables',
]);

export function NewOrderPanel({ admission, onBack }: NewOrderPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<OrderCategoryId | null>(null);

  const handleCategoryClick = (categoryId: OrderCategoryId, label: string) => {
    setSelectedCategory(categoryId);
    if (!IMPLEMENTED_CATEGORIES.has(categoryId)) {
      toast.info(`${label} order form coming soon`, { description: categoryId });
    }
  };

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-3 md:px-6">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">New Order</h1>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => toast.info('Order sets coming soon')}
          >
            <BookOpen className="size-4" />
            Order Sets
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onBack}>
            <ArrowLeft className="size-3.5" />
            Back
          </Button>
        </div>
      </div>

      <div className="border-b bg-card px-4 py-4 md:px-6">
        <p className="text-base font-semibold">{admission.patientName}</p>
        <Badge
          variant="secondary"
          className={cn(
            'mt-1.5 rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            admissionStatusBadgeClass(admission.status),
          )}
        >
          {admissionStatusLabel(admission.status)}
        </Badge>
      </div>

      <div className="flex-1 space-y-4 bg-muted/30 px-4 py-4 md:px-6">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {ORDER_CATEGORIES.map(({ id, label, icon: Icon }) => {
            const selected = selectedCategory === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleCategoryClick(id, label)}
                className={cn(
                  'flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-lg border bg-card p-6 shadow-sm transition-colors',
                  selected
                    ? 'border-primary ring-1 ring-primary/30'
                    : 'hover:border-primary/40 hover:bg-primary/5',
                )}
              >
                <Icon
                  className={cn('size-8', selected ? 'text-primary' : 'text-muted-foreground')}
                  strokeWidth={1.5}
                />
                <span className={cn('text-sm font-medium', selected && 'text-primary')}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {selectedCategory === 'medication' ? <MedicationOrderForm /> : null}
        {selectedCategory === 'procedure' ? (
          <SimpleCategoryOrderForm config={PROCEDURE_ORDER_FORM_CONFIG} />
        ) : null}
        {selectedCategory === 'consumables' ? <ConsumablesOrderForm /> : null}
      </div>
    </div>
  );
}
