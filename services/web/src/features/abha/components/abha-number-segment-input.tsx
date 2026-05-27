import { useRef, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from 'react';
import { Input } from '@pulse/ui/input';
import { cn } from '@pulse/utils';

const SEGMENT_LENGTHS = [2, 4, 4, 4] as const;

function digitsOnly(value: string, maxLen: number): string {
  return value.replace(/\D/g, '').slice(0, maxLen);
}

export interface AbhaNumberSegmentInputProps {
  segments: [string, string, string, string];
  onChange: (segments: [string, string, string, string]) => void;
  className?: string;
}

export function AbhaNumberSegmentInput({
  segments,
  onChange,
  className,
}: AbhaNumberSegmentInputProps) {
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const updateSegment = (index: number, raw: string) => {
    const maxLen = SEGMENT_LENGTHS[index];
    const next = [...segments] as [string, string, string, string];
    next[index] = digitsOnly(raw, maxLen);
    onChange(next);
    if (next[index].length === maxLen && index < 3) {
      refs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && segments[index].length === 0 && index > 0) {
      refs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = digitsOnly(e.clipboardData.getData('text'), 14);
    if (!pasted) return;
    onChange([
      pasted.slice(0, 2),
      pasted.slice(2, 6),
      pasted.slice(6, 10),
      pasted.slice(10, 14),
    ]);
    if (pasted.length >= 11) refs[3].current?.focus();
    else if (pasted.length >= 7) refs[2].current?.focus();
    else if (pasted.length >= 3) refs[1].current?.focus();
  };

  const segmentClass =
    'h-11 min-w-0 flex-1 text-center text-base tabular-nums tracking-wider rounded-md bg-muted/60';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {segments.map((seg, index) => (
        <span key={index} className="contents">
          <Input
            ref={refs[index]}
            inputMode="numeric"
            autoComplete="off"
            maxLength={SEGMENT_LENGTHS[index]}
            value={seg}
            onChange={(e: ChangeEvent<HTMLInputElement>) => updateSegment(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className={cn(
              segmentClass,
              index === 0 ? 'w-[3.5rem] shrink-0' : 'w-[5rem] shrink-0',
            )}
            placeholder={index === 0 ? '--' : '----'}
            aria-label={`ABHA number segment ${index + 1}`}
          />
          {index < 3 ? (
            <span className="shrink-0 text-lg font-medium text-muted-foreground">-</span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

export function isAbhaNumberComplete(segments: [string, string, string, string]): boolean {
  return SEGMENT_LENGTHS.every((len, i) => segments[i].length === len);
}

export function abhaNumberFromSegments(segments: [string, string, string, string]): string {
  return segments.join('');
}

export function formatAbhaNumberDisplay(segments: [string, string, string, string]): string {
  return segments.join('-');
}
