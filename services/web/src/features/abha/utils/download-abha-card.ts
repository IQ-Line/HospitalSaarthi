import type { ProfileAbhaCardResponse } from '@/features/abha/types';

function extractBase64Payload(card: Record<string, unknown>): string | null {
  const candidates = [card.data, card.card, card.content, card.pdf];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim().length > 64) {
      return value.replace(/\s/g, '');
    }
  }
  return null;
}

function inferMime(card: Record<string, unknown>): string {
  const format = typeof card.format === 'string' ? card.format.toLowerCase() : '';
  if (format.includes('png')) return 'image/png';
  if (format.includes('jpeg') || format.includes('jpg')) return 'image/jpeg';
  return 'application/pdf';
}

/** Trigger browser download from GET /m1/profile/abha-card response. */
export function downloadAbhaCardFile(res: ProfileAbhaCardResponse): void {
  const base64 = extractBase64Payload(res.card);
  if (!base64) {
    throw new Error('ABHA card data not found in response');
  }
  const mime = inferMime(res.card);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = mime === 'application/pdf' ? 'abha-card.pdf' : 'abha-card';
  anchor.click();
  URL.revokeObjectURL(url);
}
