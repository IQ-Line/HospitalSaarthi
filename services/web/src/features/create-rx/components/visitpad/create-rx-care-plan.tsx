import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { Textarea } from '@pulse/ui/textarea';
import { useCreateRxStore } from '../../create-rx.store';

export function CreateRxCarePlan() {
  const isReadOnly = useCreateRxStore((s) => s.isReadOnly);
  const carePlan = useCreateRxStore((s) => s.formData.carePlan);
  const patch = useCreateRxStore((s) => s.patchCarePlan);

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-base font-medium text-gray-700">Care Plan</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-sm text-gray-600">Advice</Label>
          <Textarea
            rows={3}
            placeholder="Medical advice..."
            value={carePlan.advice}
            onChange={(e) => patch({ advice: e.target.value })}
            readOnly={isReadOnly}
            className="border-[#CBD5E1] bg-white"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm text-gray-600">Referral Details</Label>
          <Textarea
            rows={3}
            placeholder="Specialist / Department"
            value={carePlan.referTo}
            onChange={(e) => patch({ referTo: e.target.value })}
            readOnly={isReadOnly}
            className="border-[#CBD5E1] bg-white"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-sm text-gray-600">Follow-up</Label>
        <div className="flex gap-3">
          <Input
            type="number"
            className="h-9 w-[100px] border-[#CBD5E1]"
            placeholder="#"
            value={carePlan.nextVisit}
            onChange={(e) => patch({ nextVisit: e.target.value })}
            readOnly={isReadOnly}
          />
          <Select
            value={carePlan.nextVisitUnit}
            onValueChange={(v) => patch({ nextVisitUnit: v })}
            disabled={isReadOnly}
          >
            <SelectTrigger className="h-9 w-[140px] border-[#CBD5E1]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hours">Hours</SelectItem>
              <SelectItem value="days">Days</SelectItem>
              <SelectItem value="weeks">Weeks</SelectItem>
              <SelectItem value="months">Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
