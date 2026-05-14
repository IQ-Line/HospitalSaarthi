import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Input } from '@pulse/ui/input';

/**
 * Default debounce for server-backed catalog search (e.g. Visitpad tenant/platform lists).
 * Keeps request rate low while typing without feeling sluggish. Use `debounceMs={0}` for
 * client-only filtering (see master-data routes).
 */
export const SERVER_LIST_SEARCH_DEBOUNCE_MS = 200;

interface MasterDataTableToolbarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /**
   * Delay before `onChange` runs after typing stops. Use 0 to disable (e.g. purely client-side filters).
   * Default matches {@link SERVER_LIST_SEARCH_DEBOUNCE_MS} for server-backed lists.
   */
  debounceMs?: number;
}

export function MasterDataTableToolbar({
  value,
  onChange,
  placeholder = 'Search…',
  debounceMs = SERVER_LIST_SEARCH_DEBOUNCE_MS,
}: MasterDataTableToolbarProps) {
  const [draft, setDraft] = useState(value);
  const onChangeRef = useRef(onChange);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  onChangeRef.current = onChange;

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (debounceMs <= 0) {
      onChangeRef.current(draft);
      return;
    }
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = undefined;
      onChangeRef.current(draft);
    }, debounceMs);
    return () => clearTimeout(debounceTimerRef.current);
  }, [draft, debounceMs]);

  const flushPendingSearch = () => {
    if (debounceMs <= 0) return;
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = undefined;
    onChangeRef.current(draft);
  };

  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={flushPendingSearch}
        placeholder={placeholder}
        className="pl-8"
        aria-label="Search table"
      />
    </div>
  );
}
