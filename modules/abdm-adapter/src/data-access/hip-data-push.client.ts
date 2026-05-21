import { createHash, randomUUID } from "node:crypto";
import { fetchWithTimeout } from "../lib/fetch-with-timeout.js";
import type { HipDataPushClient } from "../ports.js";

export class HttpHipDataPushClient implements HipDataPushClient {
  async push(input: {
    dataPushUrl: string;
    body: Record<string, unknown>;
    requestId: string;
  }): Promise<void> {
    const res = await fetchWithTimeout(input.dataPushUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "REQUEST-ID": input.requestId,
        TIMESTAMP: new Date().toISOString(),
      },
      body: JSON.stringify(input.body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `HIU data push failed ${res.status}: ${text.slice(0, 200)}`,
      );
    }
  }
}

export function checksumForContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export function newPushRequestId(): string {
  return randomUUID();
}
