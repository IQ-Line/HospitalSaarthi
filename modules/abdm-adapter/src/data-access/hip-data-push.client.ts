import { createHash, randomUUID } from "node:crypto";
import { fetchWithTimeout } from "../lib/fetch-with-timeout.js";
import type { HipDataPushClient } from "../ports.js";
import {
  isM3LoopbackHiu,
  m3AdapterPublicBaseUrl,
  m3DataPushUrlAllowlist,
} from "../lib/m3-runtime-env.js";
import { abdmWarn } from "../lib/abdm-adapter-log.js";
import { isPhrSandboxDataPushUrl } from "../lib/is-phr-sandbox-push.js";

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
    xHipId?: string;
    xCmId?: string;
  }): Promise<void> {
    const targetUrl = this.resolvePushUrl(input.dataPushUrl);
    this.assertAllowListed(targetUrl);

    const phrTransfer = isPhrSandboxDataPushUrl(targetUrl);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (!phrTransfer) {
      headers["REQUEST-ID"] = input.requestId;
      headers.TIMESTAMP = new Date().toISOString();
      if (input.iqTenantId) {
        headers["x-tenant-id"] = input.iqTenantId;
      }
      if (input.xHipId) {
        headers["X-HIP-ID"] = input.xHipId;
      }
      if (input.xCmId) {
        headers["X-CM-ID"] = input.xCmId;
      }
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
        bodyPreview: text.slice(0, 500),
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

/** ABDM HIP push: MD5 hex of UTF-8 plaintext FHIR JSON. */
export function checksumMd5Plaintext(plainUtf8: string): string {
  return createHash("md5").update(plainUtf8, "utf8").digest("hex");
}

export function newPushRequestId(): string {
  return randomUUID();
}

export function createHipDataPushClientFromEnv(): HttpHipDataPushClient {
  return new HttpHipDataPushClient();
}
