import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';
import { Button } from '@pulse/ui/button';

interface ConsultationStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  onEndConsultation: () => void;
  ending?: boolean;
}

export function ConsultationStatusModal({
  open,
  onOpenChange,
  onContinue,
  onEndConsultation,
  ending = false,
}: ConsultationStatusModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-semibold">
            Consultation Status
          </DialogTitle>
        </DialogHeader>
        <p className="text-center text-sm text-gray-700">
          Would you like to end consultation and close the visit or continue with the consultation?
        </p>
        <div className="rounded-md border-l-4 border-orange-400 bg-orange-50 px-4 py-3 text-sm text-gray-700">
          <span className="font-semibold text-orange-700">Note:</span> Ending the consultation
          will generate reports and navigate away from this screen.
        </div>
        <DialogFooter className="gap-2 sm:justify-center">
          <Button
            type="button"
            variant="outline"
            className="min-w-[160px] border-gray-300"
            onClick={onContinue}
            disabled={ending}
          >
            Continue Consultation
          </Button>
          <Button
            type="button"
            className="min-w-[160px] bg-[#0d9488] text-white hover:bg-[#0f766e]"
            onClick={onEndConsultation}
            disabled={ending}
          >
            {ending ? 'Ending…' : 'End Consultation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
