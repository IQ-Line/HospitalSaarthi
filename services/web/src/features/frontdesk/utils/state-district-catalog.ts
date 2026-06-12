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

function normalizePlaceName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Resolve catalog state code from NHA `stateName` (case-insensitive). */
export function findStateCodeByName(stateName: string): string | undefined {
  const target = normalizePlaceName(stateName);
  if (!target) return undefined;
  const entry = STATE_DISTRICT_CODES.find((row) => normalizePlaceName(row.state) === target);
  return entry ? String(entry.state_code) : undefined;
}

/** Resolve catalog district code from NHA `districtName` within a state code. */
export function findDistrictCodeByName(
  stateCode: string,
  districtName: string,
): string | undefined {
  const target = normalizePlaceName(districtName);
  if (!target) return undefined;
  const district = listDistrictsForStateCode(stateCode).find(
    (row) => normalizePlaceName(row.name) === target,
  );
  return district ? String(district.code) : undefined;
}

/**
 * Resolve LGD catalog district code for a state from NHA fields.
 * Prefers name (reliable vs LGD) then validates numeric code against the catalog.
 */
export function resolveCatalogDistrictCode(
  stateCode: string,
  districtCode?: string,
  districtName?: string,
): string | undefined {
  const code = stateCode.trim();
  if (!code) return undefined;

  const districts = listDistrictsForStateCode(code);
  if (districts.length === 0) return undefined;

  const byName = districtName?.trim()
    ? findDistrictCodeByName(code, districtName)
    : undefined;
  if (byName) return byName;

  const raw = districtCode?.trim();
  if (!raw) return undefined;
  const normalized = String(Number(raw));
  if (normalized === 'NaN') return undefined;
  const byCode = districts.find((row) => String(row.code) === normalized);
  return byCode ? String(byCode.code) : undefined;
}
