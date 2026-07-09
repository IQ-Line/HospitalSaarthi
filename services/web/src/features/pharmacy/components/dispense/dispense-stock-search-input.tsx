import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { Input } from '@pulse/ui/input';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { searchStockItemsMock } from '../../api/pharmacy-ui-mock';

type DispenseStockSearchInputProps = {
  value: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
  onSelect: (item: {
    id: string;
    code: string;
    name: string;
    available: number;
    batch: string;
    mrp: string;
  }) => void;
};

export function DispenseStockSearchInput({
  value,
  disabled = false,
  onValueChange,
  onSelect,
}: DispenseStockSearchInputProps) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 0 });
  const debounced = useDebouncedValue(value, 200);
  const [suggestions, setSuggestions] = useState<
    Awaited<ReturnType<typeof searchStockItemsMock>>
  >([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!debounced.trim() || debounced.trim().length < 1) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    searchStockItemsMock(debounced).then((items) => {
      if (!cancelled) {
        setSuggestions(items);
        setLoading(false);
        setActiveIndex(0);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const updatePanelPosition = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPanelPos({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePanelPosition();
    window.addEventListener('scroll', updatePanelPosition, true);
    window.addEventListener('resize', updatePanelPosition);
    return () => {
      window.removeEventListener('scroll', updatePanelPosition, true);
      window.removeEventListener('resize', updatePanelPosition);
    };
  }, [open, updatePanelPosition]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = suggestions[activeIndex];
      if (item) {
        onSelect({
          id: item.id,
          code: item.code,
          name: item.name,
          available: item.available,
          batch: item.batch,
          mrp: item.mrp,
        });
        setOpen(false);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const panel =
    open && (loading || suggestions.length > 0) ? (
      <div
        id={listboxId}
        role="listbox"
        className="z-50 max-h-56 overflow-auto rounded-md border bg-popover p-1 shadow-md"
        style={{
          position: 'absolute',
          top: panelPos.top,
          left: panelPos.left,
          width: panelPos.width,
        }}
      >
        {loading ? (
          <p className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Searching stock…
          </p>
        ) : (
          suggestions.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className="flex w-full flex-col rounded-sm px-3 py-2 text-left text-sm hover:bg-muted data-[active=true]:bg-muted"
              data-active={index === activeIndex}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect({
                  id: item.id,
                  code: item.code,
                  name: item.name,
                  available: item.available,
                  batch: item.batch,
                  mrp: item.mrp,
                });
                setOpen(false);
              }}
            >
              <span className="font-medium">{item.name}</span>
              <span className="text-xs text-muted-foreground">
                {item.code} · Avail {item.available} · ₹{item.mrp}
              </span>
            </button>
          ))
        )}
      </div>
    ) : null;

  return (
    <>
      <Input
        ref={inputRef}
        value={value}
        disabled={disabled}
        placeholder="Search stock item…"
        className="h-9"
        aria-autocomplete="list"
        aria-controls={listboxId}
        onFocus={() => {
          updatePanelPosition();
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        onChange={(e) => {
          onValueChange(e.target.value);
          setOpen(true);
        }}
      />
      {typeof document !== 'undefined' ? createPortal(panel, document.body) : null}
    </>
  );
}
