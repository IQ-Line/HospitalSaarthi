import { createHash } from "node:crypto";
import {
  HIP_PUSH_CHECKSUM_LITERAL,
  resolveHipPushChecksumMode,
} from "./hip-push-envelope.js";

export function checksumForHipPushEntry(input: {
  encryptedContent: string;
  plaintextJson?: string;
}): string {
  const mode = resolveHipPushChecksumMode();
  if (mode === "literal") {
    return HIP_PUSH_CHECKSUM_LITERAL;
  }
  if (mode === "md5" && input.plaintextJson) {
    return createHash("md5").update(input.plaintextJson, "utf8").digest("hex");
  }
  return createHash("sha256").update(input.encryptedContent).digest("hex");
}
