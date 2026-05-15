import { useEffect, useState } from 'react';
import { useDebouncedValue } from '@/lib/use-debounced-value';

/**
 * Debounced search string + draft for the “import from platform library” modal.
 * Resets draft and library page index when the modal opens; resets page when committed search changes.
 */
export function useVisitpadImportLibrarySearch(
  importOpen: boolean,
  setLibPageIndex: (pageIndex: number) => void,
) {
  const [draft, setDraft] = useState('');
  const committed = useDebouncedValue(draft, 300);

  useEffect(() => {
    if (!importOpen) return;
    setDraft('');
    setLibPageIndex(0);
  }, [importOpen, setLibPageIndex]);

  useEffect(() => {
    setLibPageIndex(0);
  }, [committed, setLibPageIndex]);

  return {
    librarySearch: committed,
    librarySearchDraft: draft,
    setLibrarySearchDraft: setDraft,
  };
}
