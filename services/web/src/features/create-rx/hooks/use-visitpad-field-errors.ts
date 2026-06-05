import { useMemo } from 'react';
import { useCreateRxStore } from '../create-rx.store';
import {
  visitpadCellKey,
  type VisitpadTableSection,
} from '../lib/visitpad-validation';

export function useInvalidCellsForSection(section: VisitpadTableSection): ReadonlySet<string> {
  const errors = useCreateRxStore((s) => s.visitpadFieldErrors);
  return useMemo(
    () =>
      new Set(
        errors
          .filter((error) => error.section === section)
          .map((error) => visitpadCellKey(error.rowId, error.field)),
      ),
    [errors, section],
  );
}

export function useSectionHasErrors(section: VisitpadTableSection): boolean {
  const errors = useCreateRxStore((s) => s.visitpadFieldErrors);
  return errors.some((error) => error.section === section);
}
