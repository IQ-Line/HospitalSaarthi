import { resolveRequestUrl } from '@/lib/api-client';

export type IndianPostOffice = {
  Name: string;
  Block: string;
  District: string;
  State: string;
};

type PostalPincodeApiResponse = Array<{
  Status?: string;
  PostOffice?: IndianPostOffice[];
}>;

export type IndianPincodeAddressFields = {
  locality: string;
  block: string;
  district: string;
  state: string;
};

const STATE_ALIASES: Record<string, string> = {
  orissa: 'odisha',
  pondicherry: 'puducherry',
  uttaranchal: 'uttarakhand',
  'nct of delhi': 'delhi',
  'dadra and nagar haveli': 'dadra and nagar haveli and daman and diu',
  'daman and diu': 'dadra and nagar haveli and daman and diu',
};

function normalizeStateKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s*&\s*/g, ' and ')
    .replace(/\s+/g, ' ');
}

export function matchIndianStateOption(
  apiState: string,
  options: ReadonlyArray<{ value: string; label: string }>,
): string {
  const rawKey = normalizeStateKey(apiState);
  const key = STATE_ALIASES[rawKey] ?? rawKey;

  for (const opt of options) {
    const valueKey = normalizeStateKey(opt.value);
    const labelKey = normalizeStateKey(opt.label);
    if (valueKey === key || labelKey === key) return opt.value;
  }

  return apiState.trim();
}

function isUsablePostalField(value: string | null | undefined): value is string {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 && trimmed.toUpperCase() !== 'NA';
}

export function mapPostOfficeToAddressFields(
  postOffice: IndianPostOffice,
  stateOptions: ReadonlyArray<{ value: string; label: string }>,
): IndianPincodeAddressFields {
  return {
    locality: isUsablePostalField(postOffice.Name) ? postOffice.Name.trim() : '',
    block: isUsablePostalField(postOffice.Block) ? postOffice.Block.trim() : '',
    district: isUsablePostalField(postOffice.District) ? postOffice.District.trim() : '',
    state: isUsablePostalField(postOffice.State)
      ? matchIndianStateOption(postOffice.State, stateOptions)
      : '',
  };
}

export async function fetchIndianPincodePostOffices(pincode: string): Promise<IndianPostOffice[]> {
  const normalized = pincode.replace(/\D/g, '').slice(0, 6);
  if (normalized.length !== 6) return [];

  const response = await fetch(resolveRequestUrl(`/api/public/postal/pincode/${normalized}`));
  if (!response.ok) {
    throw new Error(`Pincode lookup failed (${response.status})`);
  }

  const payload = (await response.json()) as PostalPincodeApiResponse;
  const block = payload[0];
  if (block?.Status !== 'Success' || !Array.isArray(block.PostOffice)) {
    return [];
  }

  return block.PostOffice;
}

export function sanitizeIndianPincodeInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 6);
}
