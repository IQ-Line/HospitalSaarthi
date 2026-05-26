import {
  STATE_DISTRICT_CODES,
  type StateDistrictCatalogEntry,
  type StateDistrictOption,
} from '@/features/frontdesk/data/state-district-codes';

export type { StateDistrictCatalogEntry, StateDistrictOption };

/** All states with nested districts (ABDM-style static catalog). */
export function listStateDistrictCatalog(): StateDistrictCatalogEntry[] {
  return STATE_DISTRICT_CODES;
}

/** District rows for a selected state code (numeric string or number). */
export function listDistrictsForStateCode(stateCode: string | number): StateDistrictOption[] {
  const code = typeof stateCode === 'number' ? stateCode : Number(stateCode);
  if (!Number.isFinite(code) || code <= 0) return [];
  return STATE_DISTRICT_CODES.find((entry) => entry.state_code === code)?.districts ?? [];
}
