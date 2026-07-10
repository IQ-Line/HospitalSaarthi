import { createHash, randomUUID } from "node:crypto";
import { fetchWithTimeout } from "../lib/fetch-with-timeout.js";
import type { HipDataPushClient } from "../ports.js";
import {
  m3AdapterPublicBaseUrl,
  m3DataPushMinimalHeaders,
  m3DataPushUrlAllowlist,
} from "../lib/m3-runtime-env.js";
import { abdmWarn } from "../lib/abdm-adapter-log.js";

export interface HttpHipDataPushClientConfig {
  adapterBaseUrl?: string;
  allowlistHosts?: string[];
}

export class HttpHipDataPushClient implements HipDataPushClient {
  private readonly adapterBaseUrl: string;
  private readonly allowlistHosts: string[];

  constructor(cfg: HttpHipDataPushClientConfig = {}) {
    this.adapterBaseUrl = cfg.adapterBaseUrl ?? m3AdapterPublicBaseUrl();
    this.allowlistHosts = cfg.allowlistHosts ?? m3DataPushUrlAllowlist();
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
    const targetUrl = input.dataPushUrl;
    this.assertAllowListed(targetUrl);

    const minimalHeaders = m3DataPushMinimalHeaders(targetUrl, this.adapterBaseUrl);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (!minimalHeaders) {
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
        // eslint-disable-next-line sonarjs/slow-regex -- linear — single `[^@]+` quantifier with `@` excluded from the class, no nested quantifier; runs on a config targetUrl for log redaction, not ReDoS
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
  // eslint-disable-next-line sonarjs/hashing -- ABDM HIP data-push protocol checksum (integrity, not a security/auth context); algorithm is protocol-mandated, configurable via mode (literal/md5/sha256)
  return createHash("md5").update(plainUtf8, "utf8").digest("hex");
}

export function newPushRequestId(): string {
  return randomUUID();
}

export function createHipDataPushClientFromEnv(): HttpHipDataPushClient {
  return new HttpHipDataPushClient();
}
