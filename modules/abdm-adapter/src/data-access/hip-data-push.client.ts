import { createHash, randomUUID } from "node:crypto";
import { fetchWithTimeout } from "../lib/fetch-with-timeout.js";
import type { HipDataPushClient } from "../ports.js";
import {
  isM3LoopbackHiu,
  m3AdapterPublicBaseUrl,
  m3DataPushUrlAllowlist,
} from "../lib/m3-runtime-env.js";
import { abdmWarn } from "../lib/abdm-adapter-log.js";

export interface HttpHipDataPushClientConfig {
  loopbackHiu?: boolean;
  adapterBaseUrl?: string;
  allowlistHosts?: string[];
}

export class HttpHipDataPushClient implements HipDataPushClient {
  private readonly loopbackHiu: boolean;
  private readonly adapterBaseUrl: string;
  private readonly allowlistHosts: string[];

  constructor(cfg: HttpHipDataPushClientConfig = {}) {
    this.loopbackHiu = cfg.loopbackHiu ?? isM3LoopbackHiu();
    this.adapterBaseUrl = cfg.adapterBaseUrl ?? m3AdapterPublicBaseUrl();
    this.allowlistHosts = cfg.allowlistHosts ?? m3DataPushUrlAllowlist();
  }

  private resolvePushUrl(dataPushUrl: string): string {
    if (this.loopbackHiu) {
      try {
        const parsed = new URL(dataPushUrl);
        const path = `${parsed.pathname}${parsed.search}`;
        return `${this.adapterBaseUrl}${path}`;
      } catch {
        return dataPushUrl;
      }
    }
    return dataPushUrl;
  }

  private assertAllowListed(url: string): void {
    if (this.allowlistHosts.length === 0) return;
    const host = new URL(url).hostname.toLowerCase();
    if (!this.allowlistHosts.includes(host)) {
      throw new Error(`dataPushUrl host not in allowlist: ${host}`);
    }
  }

  async push(input: {
    dataPushUrl: string;
    body: Record<string, unknown>;
    requestId: string;
    iqTenantId?: string;
  }): Promise<void> {
    const targetUrl = this.resolvePushUrl(input.dataPushUrl);
    this.assertAllowListed(targetUrl);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "REQUEST-ID": input.requestId,
      TIMESTAMP: new Date().toISOString(),
    };
    if (input.iqTenantId) {
      headers["x-tenant-id"] = input.iqTenantId;
    }

    const res = await fetchWithTimeout(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(input.body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      abdmWarn("abdm.m3.hip_data_push.failed", {
        status: res.status,
        url: targetUrl.replace(/\/\/[^@]+@/, "//***@"),
      });
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

export function createHipDataPushClientFromEnv(): HttpHipDataPushClient {
  return new HttpHipDataPushClient();
}
