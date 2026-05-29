import type { NhaEnrolByAadhaarResponse } from "@hims/ts-sdk-abha/protocol/m1";

/** NHA saves mobile on profile when primary matches Aadhaar-linked; otherwise `mobile` is null. */
export function isEnrolLinkedMobileSavedInNha(nha: NhaEnrolByAadhaarResponse): boolean {
  const profile = nha.ABHAProfile;
  if (!profile || typeof profile !== "object") {
    return false;
  }
  const mobile = (profile as Record<string, unknown>).mobile;
  if (mobile === null || mobile === undefined) {
    return false;
  }
  return typeof mobile === "string" && mobile.trim().length > 0;
}

export function resolveSkipEnrolMobileVerify(
  useAadhaarLinkedMobile: boolean | undefined,
  nha: NhaEnrolByAadhaarResponse,
): boolean {
  if (useAadhaarLinkedMobile === true) {
    return true;
  }
  if (useAadhaarLinkedMobile === false) {
    return false;
  }
  return isEnrolLinkedMobileSavedInNha(nha);
}
