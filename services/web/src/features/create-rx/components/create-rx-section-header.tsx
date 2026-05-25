import { Plus } from 'lucide-react';
import { Button } from '@pulse/ui/button';

interface CreateRxSectionHeaderProps {
  title: string;
  addLabel?: string;
  onAdd?: () => void;
  readOnly?: boolean;
}

/** Reference FormTable / DiagnosisSection header — title left, teal Add right. */
export function CreateRxSectionHeader({
  title,
  addLabel,
  onAdd,
  readOnly = false,
}: CreateRxSectionHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h3 className="text-base font-medium text-gray-700">{title}</h3>
      {addLabel && onAdd && !readOnly ? (
        <Button
          type="button"
          size="sm"
          className="gap-1 bg-[#0d9488] hover:bg-[#0f766e] text-white"
          onClick={onAdd}
        >
          <Plus className="size-4" />
          {addLabel}
        </Button>
      ) : null}
    </div>
  );
}
