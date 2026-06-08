import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { Input } from '@pulse/ui/input';
import { useVisitpadMedicines } from '@/features/visitpad/api';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import {
  activeMedicineSuggestions,
  formatMedicineSuggestionLabel,
  medicineDisplayNameFromCatalog,
  PHARMACY_MEDICINE_SEARCH_MIN_CHARS,
  PHARMACY_MEDICINE_SUGGESTIONS_PAGE,
} from '../lib/medicine-suggestions';

type PanelPosition = {
  top: number;
  left: number;
  width: number;
};

type PharmacyMedicineSearchInputProps = {
  value: string;
  medicineId?: string | null;
  onMedicineSelect: (medicine: { id: string; displayName: string; unitPrice: string | null }) => void;
  onClearSelection?: () => void;
  disabled?: boolean;
  placeholder?: string;
  error?: string;
};

function SuggestionPanelBody({
  isFetching,
  suggestions,
  activeIndex,
  onSelect,
}: {
  isFetching: boolean;
  suggestions: ReturnType<typeof activeMedicineSuggestions>;
  activeIndex: number;
  onSelect: (displayName: string, medicine: { id: string; price?: number | null }) => void;
}) {
  if (isFetching) {
    return (
      <p className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Searching medicines…
      </p>
    );
  }

  if (suggestions.length === 0) {
    return (
      <p className="px-3 py-2 text-sm text-muted-foreground">
        No catalog matches — choose a medicine from the master list.
      </p>
    );
  }

  return (
    <>
      {suggestions.map((medicine, index) => (
        <button
          key={medicine.id}
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          className={`block w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground ${
            index === activeIndex ? 'bg-accent text-accent-foreground' : ''
          }`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(medicineDisplayNameFromCatalog(medicine), medicine)}
        >
          <span className="font-medium">{formatMedicineSuggestionLabel(medicine)}</span>
          {medicine.generic_name ? (
            <span className="mt-0.5 block text-xs text-muted-foreground">{medicine.generic_name}</span>
          ) : null}
        </button>
      ))}
    </>
  );
}

export function PharmacyMedicineSearchInput({
  value,
  medicineId,
  onMedicineSelect,
  onClearSelection,
  disabled = false,
  placeholder = 'Search catalog medicines',
  error,
}: PharmacyMedicineSearchInputProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);

  const debouncedSearch = useDebouncedValue(query.trim(), 300);
  const searchReady = debouncedSearch.length >= PHARMACY_MEDICINE_SEARCH_MIN_CHARS;

  const { data, isFetching } = useVisitpadMedicines(
    searchReady ? debouncedSearch : undefined,
    undefined,
    PHARMACY_MEDICINE_SUGGESTIONS_PAGE,
    { enabled: open && searchReady && !disabled },
  );

  const suggestions = activeMedicineSuggestions(data?.data);
  const inputValue = focused ? query : value;
  const needsSelection = focused && query.trim().length > 0 && !medicineId;
  const showInvalid = Boolean(error) || needsSelection;

  const updatePanelPosition = useCallback(() => {
    const anchor = containerRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    setPanelPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    setActiveIndex(-1);
  }, [debouncedSearch, suggestions.length]);

  const showPanel = open && searchReady;

  useEffect(() => {
    if (!showPanel) {
      setPanelPosition(null);
      return;
    }

    updatePanelPosition();
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);
    return () => {
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [showPanel, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (containerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  const selectSuggestion = (
    displayName: string,
    medicine: { id: string; price?: number | null },
  ) => {
    const unitPrice =
      medicine.price != null && Number.isFinite(medicine.price) && medicine.price >= 0
        ? medicine.price.toFixed(4)
        : null;
    onMedicineSelect({ id: medicine.id, displayName, unitPrice });
    setQuery(displayName);
    setOpen(false);
    setFocused(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showPanel || suggestions.length === 0) {
      if (event.key === 'Escape') {
        setOpen(false);
        setFocused(false);
        setQuery('');
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        const medicine = suggestions[activeIndex];
        if (medicine) {
          selectSuggestion(medicineDisplayNameFromCatalog(medicine), medicine);
        }
      }
      return;
    }

    if (event.key === 'Escape') {
      setOpen(false);
      setFocused(false);
      setQuery('');
    }
  };

  const suggestionPanel =
    showPanel && panelPosition
      ? createPortal(
          <div
            ref={panelRef}
            id={listboxId}
            role="listbox"
            style={{
              position: 'fixed',
              top: panelPosition.top,
              left: panelPosition.left,
              width: panelPosition.width,
            }}
            className="z-[200] max-h-56 overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-md"
          >
            <SuggestionPanelBody
              isFetching={isFetching}
              suggestions={suggestions}
              activeIndex={activeIndex}
              onSelect={selectSuggestion}
            />
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={containerRef} className="min-w-[200px]">
      <Input
        value={inputValue}
        disabled={disabled}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={showPanel ? listboxId : undefined}
        aria-autocomplete="list"
        aria-invalid={showInvalid || undefined}
        className={showInvalid ? 'border-destructive focus-visible:ring-destructive/30' : undefined}
        onFocus={() => {
          setFocused(true);
          setQuery(value);
          setOpen(true);
          updatePanelPosition();
        }}
        onBlur={() => {
          setFocused(false);
          setOpen(false);
          setQuery('');
        }}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          if (medicineId) {
            onClearSelection?.();
          }
          setOpen(true);
          updatePanelPosition();
        }}
        onKeyDown={handleKeyDown}
      />
      {suggestionPanel}
    </div>
  );
}
