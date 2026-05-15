import type { NhaAbhaCardResponse } from "@hims/ts-sdk-abha/protocol/m1";

function isPdfBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

function inferFormat(contentType: string, bytes: Uint8Array): string {
  const ct = contentType.toLowerCase();
  if (ct.includes("pdf") || isPdfBytes(bytes)) return "pdf";
  if (ct.includes("png")) return "png";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpeg";
  return "pdf";
}

/**
 * NHA `GET /v3/profile/account/abha-card` often returns **202** with a raw PDF
 * or base64 string — not a JSON object. Postman shows the same endpoint as Cert's
 * sibling under "Session and cert API" but the card response is not `{ publicKey }`.
 */
export function parseNhaAbhaCardBody(
  raw: ArrayBuffer,
  contentType: string,
): NhaAbhaCardResponse {
  const bytes = new Uint8Array(raw);
  const ct = contentType.trim();

  if (ct.includes("application/json") || ct.includes("+json")) {
    const text = new TextDecoder().decode(bytes);
    try {
      const parsed = JSON.parse(text) as unknown;
      if (parsed && typeof parsed === "object") {
        return parsed as NhaAbhaCardResponse;
      }
    } catch {
      /* fall through */
    }
  }

  const trimmedText = new TextDecoder().decode(bytes).trim();
  if (trimmedText.startsWith("{")) {
    try {
      return JSON.parse(trimmedText) as NhaAbhaCardResponse;
    } catch {
      /* fall through */
    }
  }

  if (isPdfBytes(bytes)) {
    return {
      data: Buffer.from(bytes).toString("base64"),
      format: "pdf",
    };
  }

  if (/^[A-Za-z0-9+/=\s]+$/.test(trimmedText) && trimmedText.length > 64) {
    return {
      data: trimmedText.replace(/\s/g, ""),
      format: inferFormat(ct, bytes),
    };
  }

  return {
    data: Buffer.from(bytes).toString("base64"),
    format: inferFormat(ct, bytes),
  };
}
