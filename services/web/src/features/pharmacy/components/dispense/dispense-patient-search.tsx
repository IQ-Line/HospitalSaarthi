import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@pulse/ui/input';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { searchDispensePatientsMock } from '../../api/pharmacy-ui-mock';
import type { DispensePatientSearchResult } from '../../types/dispense-ui.types';

type DispensePatientSearchProps = {
  value: string;
  onValueChange: (value: string) => void;
  onPatientSelect: (patient: DispensePatientSearchResult) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function DispensePatientSearch({
  value,
  onValueChange,
  onPatientSelect,
  disabled = false,
  placeholder = 'Search patient, UHID, MRN, phone, or…',
}: DispensePatientSearchProps) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 0 });
  const debounced = useDebouncedValue(value, 250);
  const [results, setResults] = useState<DispensePatientSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    searchDispensePatientsMock(debounced)
      .then((items) => {
        if (!cancelled) {
          setResults(items);
          setLoading(false);
          setActiveIndex(0);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el || !open) return;
    const rect = el.getBoundingClientRect();
    setPanelPos({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: Math.max(rect.width, 320),
    });
  }, [open, value]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const patient = results[activeIndex];
      if (patient) {
        onPatientSelect(patient);
        setOpen(false);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  let panelBody: ReactNode;
  if (loading) {
    panelBody = (
      <p className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Searching patients…
      </p>
    );
  } else if (results.length === 0) {
    panelBody = <p className="px-3 py-2 text-sm text-muted-foreground">No patient found.</p>;
  } else {
    panelBody = results.map((patient, index) => (
      <button
        key={patient.id}
        type="button"
        role="option"
        aria-selected={index === activeIndex}
        className="flex w-full flex-col rounded-sm px-3 py-2 text-left text-sm hover:bg-muted data-[active=true]:bg-muted"
        data-active={index === activeIndex}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          onPatientSelect(patient);
          setOpen(false);
        }}
      >
        <span className="font-medium">
          {patient.first_name} {patient.last_name}
        </span>
        <span className="text-xs text-muted-foreground">
          {patient.uhid} · {patient.mrn}
          {patient.phone ? ` · ${patient.phone}` : ''}
        </span>
      </button>
    ));
  }

  const panel =
    open && (loading || results.length > 0 || debounced.trim()) ? (
      <div
        id={listboxId}
        role="listbox"
        className="z-50 max-h-64 overflow-auto rounded-md border bg-popover p-1 shadow-md"
        style={{
          position: 'absolute',
          top: panelPos.top,
          left: panelPos.left,
          width: panelPos.width,
        }}
      >
        {panelBody}
      </div>
    ) : null;

  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        className="h-9 pl-9"
        aria-autocomplete="list"
        aria-controls={listboxId}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        onChange={(e) => {
          onValueChange(e.target.value);
          setOpen(true);
        }}
      />
      {typeof document !== 'undefined' ? createPortal(panel, document.body) : null}
    </div>
  );
}
