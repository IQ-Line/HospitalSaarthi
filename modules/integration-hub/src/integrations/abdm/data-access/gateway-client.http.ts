import { randomUUID } from "node:crypto";
import type { NhaPublicCertificateResponse } from "@hims/ts-sdk-abha/protocol/common/index.js";
import type {
  AbdmGatewayRouteTarget,
  GatewayClient,
  SecretsClient,
} from "../ports.js";
import {
  AbdmGatewayError,
  gatewayUnavailable,
  parseNhaErrorBody,
} from "../lib/gateway-errors.js";
import { fetchWithTimeout } from "../lib/fetch-with-timeout.js";
import { parseNhaAbhaCardBody } from "../lib/parse-nha-abha-card-body.js";
import { stripTrailingSlashes } from "../lib/http-url.js";
import type { GatewayGetResponseParser } from "../ports.js";

function joinUrl(base: string, path: string): string {
  const b = stripTrailingSlashes(base);
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

function isoTimestamp(): string {
  return new Date().toISOString();
}

export interface NhaGatewaySessionRequestBody {
  clientId: string;
  clientSecret: string;
  grantType: "client_credentials";
}

export interface NhaGatewaySessionResponseBody {
  accessToken: string;
  expiresIn?: number;
  refreshExpiresIn?: number;
  refreshToken?: string;
  tokenType?: string;
}

export interface HttpGatewayClientConfig {
  gatewayBaseUrl: string;
  abhaApiBaseUrl: string;
  xCmId: string;
  secrets: SecretsClient;
  clientIdRef?: string;
  clientSecretRef?: string;
  /** Subtracted from `expiresIn` (seconds). Default 90. */
  safetyBufferSeconds?: number;
  /** Public certificate cache TTL (seconds). Default 3600. */
  certificateCacheTtlSeconds?: number;
}

/**
 * HTTP `GatewayClient`: v3 client_credentials session + authenticated ABHA API calls.
 */
export class HttpGatewayClient implements GatewayClient {
  private readonly gatewayBaseUrl: string;
  private readonly abhaApiBaseUrl: string;
  private readonly xCmId: string;
  private readonly secrets: SecretsClient;
  private readonly clientIdRef: string;
  private readonly clientSecretRef: string;
  private readonly safetyBufferMs: number;
  private readonly certTtlMs: number;

  private cachedBearer: { token: string; validUntilMs: number } | null = null;
  private refreshInFlight: Promise<string> | null = null;

  private certCache: {
    publicKey: string;
    encryptionAlgorithm: string;
    validUntilMs: number;
  } | null = null;

  constructor(cfg: HttpGatewayClientConfig) {
    this.gatewayBaseUrl = stripTrailingSlashes(cfg.gatewayBaseUrl);
    this.abhaApiBaseUrl = stripTrailingSlashes(cfg.abhaApiBaseUrl);
    this.xCmId = cfg.xCmId;
    this.secrets = cfg.secrets;
    this.clientIdRef = cfg.clientIdRef ?? "env:ABDM_SANDBOX_CLIENT_ID";
    this.clientSecretRef = cfg.clientSecretRef ?? "env:ABDM_SANDBOX_CLIENT_SECRET";
    this.safetyBufferMs = (cfg.safetyBufferSeconds ?? 90) * 1000;
    this.certTtlMs = (cfg.certificateCacheTtlSeconds ?? 3600) * 1000;
  }

  /** Invalidate cached bearer (e.g. after upstream 401). */
  invalidateBearer(): void {
    this.cachedBearer = null;
  }

  /** Drop cached public key (e.g. after cert endpoint 401). */
  invalidateCertificate(): void {
    this.certCache = null;
  }

  getDiagnosticsSnapshot(): {
    tokenValidUntilMs: number | null;
    certValidUntilMs: number | null;
    certCached: boolean;
  } {
    return {
      tokenValidUntilMs: this.cachedBearer?.validUntilMs ?? null,
      certValidUntilMs: this.certCache?.validUntilMs ?? null,
      certCached: this.certCache !== null,
    };
  }

  async getPublicCertificate(): Promise<{
    publicKey: string;
    encryptionAlgorithm: string;
  }> {
    const now = Date.now();
    if (this.certCache && now < this.certCache.validUntilMs) {
      return {
        publicKey: this.certCache.publicKey,
        encryptionAlgorithm: this.certCache.encryptionAlgorithm,
      };
    }
    try {
      return await this.fetchAndCachePublicCertificate();
    } catch (e) {
      if (e instanceof AbdmGatewayError && e.statusCode === 401) {
        this.invalidateCertificate();
        this.invalidateBearer();
        return await this.fetchAndCachePublicCertificate();
      }
      throw e;
    }
  }

  private async fetchAndCachePublicCertificate(): Promise<{
    publicKey: string;
    encryptionAlgorithm: string;
  }> {
    const json = await this.get<NhaPublicCertificateResponse>({
      path: "/v3/profile/public/certificate",
      target: "abha",
    });
    if (!json.publicKey || !json.encryptionAlgorithm) {
      throw gatewayUnavailable(
        "Certificate response missing publicKey or encryptionAlgorithm",
        502,
        json,
      );
    }
    this.certCache = {
      publicKey: json.publicKey,
      encryptionAlgorithm: json.encryptionAlgorithm,
      validUntilMs: Date.now() + this.certTtlMs,
    };
    return {
      publicKey: json.publicKey,
      encryptionAlgorithm: json.encryptionAlgorithm,
    };
  }

  private resolveBase(target: AbdmGatewayRouteTarget): string {
    return target === "gateway" ? this.gatewayBaseUrl : this.abhaApiBaseUrl;
  }

  private async fetchBearerToken(): Promise<string> {
    const clientId = await this.secrets.resolve(this.clientIdRef);
    const clientSecret = await this.secrets.resolve(this.clientSecretRef);
    const body: NhaGatewaySessionRequestBody = {
      clientId,
      clientSecret,
      grantType: "client_credentials",
    };
    const url = joinUrl(this.gatewayBaseUrl, "/api/hiecm/gateway/v3/sessions");
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "REQUEST-ID": randomUUID(),
        TIMESTAMP: isoTimestamp(),
        "X-CM-ID": this.xCmId,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = undefined;
    }
    if (!res.ok) {
      const { code, message } = parseNhaErrorBody(json);
      throw new AbdmGatewayError(message ?? res.statusText, {
        statusCode: res.status,
        abdmCode: code,
        responseBody: json,
      });
    }
    const session = json as NhaGatewaySessionResponseBody | undefined;
    if (!session?.accessToken) {
      throw gatewayUnavailable("Gateway session response missing accessToken", res.status, json);
    }
    const expiresInSec =
      typeof session.expiresIn === "number" && session.expiresIn > 0
        ? session.expiresIn
        : 1200;
    const validUntilMs = Date.now() + expiresInSec * 1000 - this.safetyBufferMs;
    this.cachedBearer = {
      token: session.accessToken,
      validUntilMs: Math.max(validUntilMs, Date.now() + 1000),
    };
    return session.accessToken;
  }

  /** Singleflight refresh of gateway `accessToken`. */
  async getBearerToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedBearer && now < this.cachedBearer.validUntilMs) {
      return this.cachedBearer.token;
    }
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.fetchBearerToken().finally(() => {
        this.refreshInFlight = null;
      });
    }
    return this.refreshInFlight;
  }

  async post<TReq, TRes>(input: {
    path: string;
    body: TReq;
    headers?: Record<string, string>;
    target?: AbdmGatewayRouteTarget;
    withBearer?: boolean;
    requestId?: string;
    linkToken?: string;
    xHipId?: string;
    bearerSession?: "v3" | "v0.5";
  }): Promise<TRes> {
    try {
      return await this.doPost<TReq, TRes>(input);
    } catch (e) {
      if (e instanceof AbdmGatewayError && e.statusCode === 401) {
        this.invalidateBearer();
        return await this.doPost<TReq, TRes>(input);
      }
      throw e;
    }
  }

  private async fetchLegacyV05BearerToken(): Promise<string> {
    const clientId = await this.secrets.resolve(this.clientIdRef);
    const clientSecret = await this.secrets.resolve(this.clientSecretRef);
    const url = joinUrl(this.gatewayBaseUrl, "/gateway/v0.5/sessions");
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, clientSecret, grantType: "client_credentials" }),
    });
    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = undefined;
    }
    if (!res.ok) {
      const { code, message } = parseNhaErrorBody(json);
      throw new AbdmGatewayError(message ?? res.statusText, {
        statusCode: res.status,
        abdmCode: code,
        responseBody: json ?? (text ? { raw: text.slice(0, 500) } : undefined),
      });
    }
    const session = json as NhaGatewaySessionResponseBody | undefined;
    if (!session?.accessToken) {
      throw gatewayUnavailable("Legacy v0.5 session response missing accessToken", res.status, json);
    }
    return session.accessToken;
  }

  private async resolveBearerToken(session: "v3" | "v0.5" = "v3"): Promise<string> {
    if (session === "v0.5") {
      return this.fetchLegacyV05BearerToken();
    }
    return this.getBearerToken();
  }

  private async doPost<TReq, TRes>(input: {
    path: string;
    body: TReq;
    headers?: Record<string, string>;
    target?: AbdmGatewayRouteTarget;
    withBearer?: boolean;
    requestId?: string;
    linkToken?: string;
    xHipId?: string;
    bearerSession?: "v3" | "v0.5";
  }): Promise<TRes> {
    const target = input.target ?? "abha";
    // HIE-CM v3 APIs (generate-token, link/carecontext, …) require gateway bearer.
    // Session acquisition uses fetchBearerToken() directly (no Authorization on that POST).
    const withBearer = input.withBearer ?? true;
    const url = joinUrl(this.resolveBase(target), input.path);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "REQUEST-ID": input.requestId ?? randomUUID(),
      TIMESTAMP: isoTimestamp(),
      ...input.headers,
    };
    if (withBearer) {
      const token = await this.resolveBearerToken(input.bearerSession ?? "v3");
      headers.Authorization = `Bearer ${token}`;
    }
    if (target === "gateway") {
      headers["X-CM-ID"] = headers["X-CM-ID"] ?? this.xCmId;
    }
    if (input.linkToken) {
      headers["X-LINK-TOKEN"] = input.linkToken;
    }
    if (input.xHipId) {
      headers["X-HIP-ID"] = input.xHipId;
    }
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers,
      body: JSON.stringify(input.body),
    });
    return this.parseJsonResponse<TRes>(res);
  }

  async get<TRes>(input: {
    path: string;
    headers?: Record<string, string>;
    target?: AbdmGatewayRouteTarget;
    withBearer?: boolean;
    responseParser?: GatewayGetResponseParser;
  }): Promise<TRes> {
    try {
      return await this.doGet<TRes>(input);
    } catch (e) {
      if (e instanceof AbdmGatewayError && e.statusCode === 401) {
        this.invalidateBearer();
        return await this.doGet<TRes>(input);
      }
      throw e;
    }
  }

  private async doGet<TRes>(input: {
    path: string;
    headers?: Record<string, string>;
    target?: AbdmGatewayRouteTarget;
    withBearer?: boolean;
    responseParser?: GatewayGetResponseParser;
  }): Promise<TRes> {
    const target = input.target ?? "abha";
    const withBearer = input.withBearer ?? true;
    const url = joinUrl(this.resolveBase(target), input.path);
    const headers: Record<string, string> = {
      "REQUEST-ID": randomUUID(),
      TIMESTAMP: isoTimestamp(),
      ...input.headers,
    };
    if (withBearer) {
      const token = await this.getBearerToken();
      headers.Authorization = `Bearer ${token}`;
    }
    if (target === "gateway") {
      headers["X-CM-ID"] = headers["X-CM-ID"] ?? this.xCmId;
    }
    const res = await fetchWithTimeout(url, { method: "GET", headers });
    const parser = input.responseParser ?? "json";
    if (parser === "abha-card") {
      return this.parseAbhaCardResponse<TRes>(res);
    }
    return this.parseJsonResponse<TRes>(res);
  }

  private async parseAbhaCardResponse<TRes>(res: Response): Promise<TRes> {
    const contentType = res.headers.get("content-type") ?? "";
    const raw = await res.arrayBuffer();

    if (!res.ok) {
      const errText = new TextDecoder().decode(raw);
      let json: unknown;
      try {
        json = errText ? JSON.parse(errText) : undefined;
      } catch {
        throw new AbdmGatewayError(errText || res.statusText, {
          statusCode: res.status,
          responseBody: errText.slice(0, 500),
        });
      }
      const { code, message } = parseNhaErrorBody(json);
      throw new AbdmGatewayError(message ?? res.statusText, {
        statusCode: res.status,
        abdmCode: code,
        responseBody: json,
      });
    }

    const card = parseNhaAbhaCardBody(raw, contentType);
    return card as TRes;
  }

  private async parseJsonResponse<TRes>(res: Response): Promise<TRes> {
    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      throw gatewayUnavailable("Invalid JSON from NHA", res.status, text);
    }
    if (!res.ok) {
      const { code, message } = parseNhaErrorBody(json);
      throw new AbdmGatewayError(message ?? res.statusText, {
        statusCode: res.status,
        abdmCode: code,
        responseBody: json ?? (text ? { raw: text.slice(0, 500) } : undefined),
      });
    }
    return json as TRes;
  }
}
