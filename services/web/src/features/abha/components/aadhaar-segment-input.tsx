import { useRef, type ChangeEvent, type KeyboardEvent, type ClipboardEvent } from 'react';
import { Input } from '@pulse/ui/input';
import { cn } from '@pulse/utils';

function digitsOnly(value: string, maxLen: number): string {
  return value.replace(/\D/g, '').slice(0, maxLen);
}

function maskSegment(value: string): string {
  if (!value) return '';
  return '•'.repeat(value.length);
}

export interface AadhaarSegmentInputProps {
  seg1: string;
  seg2: string;
  seg3: string;
  maskSeg1: boolean;
  maskSeg2: boolean;
  onSeg1Change: (value: string) => void;
  onSeg2Change: (value: string) => void;
  onSeg3Change: (value: string) => void;
  onMaskSeg1: (masked: boolean) => void;
  onMaskSeg2: (masked: boolean) => void;
  className?: string;
}

export function AadhaarSegmentInput({
  seg1,
  seg2,
  seg3,
  maskSeg1,
  maskSeg2,
  onSeg1Change,
  onSeg2Change,
  onSeg3Change,
  onMaskSeg1,
  onMaskSeg2,
  className,
}: AadhaarSegmentInputProps) {
  const ref1 = useRef<HTMLInputElement>(null);
  const ref2 = useRef<HTMLInputElement>(null);
  const ref3 = useRef<HTMLInputElement>(null);

  const focusSeg = (index: 1 | 2 | 3) => {
    const ref = index === 1 ? ref1 : index === 2 ? ref2 : ref3;
    ref.current?.focus();
    ref.current?.select();
  };

  const handleSegChange = (
    index: 1 | 2 | 3,
    raw: string,
    onChange: (v: string) => void,
    onUnmask?: () => void,
  ) => {
    onUnmask?.();
    const next = digitsOnly(raw, 4);
    onChange(next);
    if (next.length === 4) {
      if (index === 1) focusSeg(2);
      else if (index === 2) focusSeg(3);
    }
  };

  const handleKeyDown = (
    index: 1 | 2 | 3,
    value: string,
    e: KeyboardEvent<HTMLInputElement>,
    onUnmask?: () => void,
  ) => {
    if (e.key === 'Backspace' && value.length === 0) {
      if (index === 2) {
        onUnmask?.();
        focusSeg(1);
      } else if (index === 3) {
        onMaskSeg2(false);
        focusSeg(2);
      }
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = digitsOnly(e.clipboardData.getData('text'), 12);
    if (!pasted) return;
    onMaskSeg1(false);
    onMaskSeg2(false);
    onSeg1Change(pasted.slice(0, 4));
    onSeg2Change(pasted.slice(4, 8));
    onSeg3Change(pasted.slice(8, 12));
    if (pasted.length >= 9) focusSeg(3);
    else if (pasted.length >= 5) focusSeg(2);
    else focusSeg(1);
  };

  const segmentClass =
    'h-10 flex-1 min-w-0 text-center text-sm tabular-nums tracking-[0.2em] rounded-md';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Input
        ref={ref1}
        id="abha-aadhaar-seg1"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        value={maskSeg1 ? maskSegment(seg1) : seg1}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          handleSegChange(1, e.target.value, onSeg1Change, () => onMaskSeg1(false))
        }
        onKeyDown={(e) => handleKeyDown(1, seg1, e, () => onMaskSeg1(false))}
        onBlur={() => onMaskSeg1(seg1.length > 0)}
        onFocus={() => onMaskSeg1(false)}
        onPaste={handlePaste}
        className={segmentClass}
        placeholder="----"
        aria-label="Aadhaar first 4 digits"
      />
      <Input
        ref={ref2}
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        value={maskSeg2 ? maskSegment(seg2) : seg2}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          handleSegChange(2, e.target.value, onSeg2Change, () => onMaskSeg2(false))
        }
        onKeyDown={(e) => handleKeyDown(2, seg2, e, () => onMaskSeg2(false))}
        onBlur={() => onMaskSeg2(seg2.length > 0)}
        onFocus={() => onMaskSeg2(false)}
        onPaste={handlePaste}
        className={segmentClass}
        placeholder="----"
        aria-label="Aadhaar middle 4 digits"
      />
      <Input
        ref={ref3}
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        value={seg3}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          handleSegChange(3, e.target.value, onSeg3Change)
        }
        onKeyDown={(e) => handleKeyDown(3, seg3, e)}
        onPaste={handlePaste}
        className={segmentClass}
        placeholder="----"
        aria-label="Aadhaar last 4 digits"
      />
    </div>
  );
}
