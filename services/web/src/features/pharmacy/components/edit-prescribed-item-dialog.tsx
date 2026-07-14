import { useEffect, useState } from 'react';
import { Button } from '@pulse/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';

type EditPrescribedItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescribedItemName: string;
  prescribedQuantity: string;
  onSave: (values: { prescribed_item_name: string; prescribed_quantity: string }) => void;
};

export function EditPrescribedItemDialog({
  open,
  onOpenChange,
  prescribedItemName,
  prescribedQuantity,
  onSave,
}: EditPrescribedItemDialogProps) {
  const [itemName, setItemName] = useState(prescribedItemName);
  const [quantity, setQuantity] = useState(prescribedQuantity);

  useEffect(() => {
    if (!open) return;
    setItemName(prescribedItemName);
    setQuantity(prescribedQuantity);
  }, [open, prescribedItemName, prescribedQuantity]);

  const handleSave = () => {
    onSave({
      prescribed_item_name: itemName.trim(),
      prescribed_quantity: quantity.trim(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit prescribed item</DialogTitle>
          <DialogDescription>
            Update the prescribed medicine and quantity for this line. Issued stock selection is
            unchanged.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="prescribed-item-name">Prescribed item</Label>
            <Input
              id="prescribed-item-name"
              value={itemName}
              onChange={(event) => setItemName(event.target.value)}
              placeholder="Medicine name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prescribed-item-qty">Prescribed qty</Label>
            <Input
              id="prescribed-item-qty"
              value={quantity}
              inputMode="decimal"
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
