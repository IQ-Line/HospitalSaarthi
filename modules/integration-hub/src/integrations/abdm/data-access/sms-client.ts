import { randomInt } from "node:crypto";
import { abdmWarn } from "../lib/abdm-adapter-log.js";
import { fetchWithTimeout } from "../lib/fetch-with-timeout.js";
import { stripTrailingSlashes } from "../lib/http-url.js";
import type { SmsClient } from "../ports.js";
import type { TenantIntegrationProfile } from "../../../lib/integration-context.js";

/** Logs OTP for sandbox when no real provider is configured. */
export class LoggingSmsClient implements SmsClient {
  async sendOtp(input: { phoneNo: string; message: string }): Promise<void> {
    abdmWarn("abdm.m2.sms.otp_dispatched", {
      phoneNo: input.phoneNo.replace(/\d(?=\d{4})/g, "*"),
      message: input.message,
    });
  }
}

function formatIndianMobileForMsg91(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

/** MSG91 OTP API — same contract as abdi-lims-backed `smsOtp.ts`. */
export class Msg91OtpSmsClient implements SmsClient {
  constructor(
    private readonly config: {
      baseUrl: string;
      authKey: string;
      templateId: string;
      expiryMinutes: number;
    },
  ) {}

  async sendOtp(input: { phoneNo: string; message: string }): Promise<void> {
    await this.sendOtpToMobile(input.phoneNo);
  }

  private async sendOtpToMobile(phoneNo: string): Promise<void> {
    const mobile = formatIndianMobileForMsg91(phoneNo);
    if (!/^\d{10}$/.test(mobile)) {
      throw new Error(`Invalid phone for MSG91: ${phoneNo}`);
    }

    const otp = String(randomInt(100_000, 1_000_000));
    const url = `${stripTrailingSlashes(this.config.baseUrl)}/otp`;
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template_id: this.config.templateId,
        mobile: `91${mobile}`,
        authkey: this.config.authKey,
        otp_expiry: this.config.expiryMinutes,
        otp,
        otp_length: 6,
        var: otp,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { type?: string; message?: string };
    if (!res.ok || json.type !== "success") {
      throw new Error(json.message ?? `MSG91 send OTP failed: HTTP ${res.status}`);
    }
    abdmWarn("abdm.m2.sms.msg91_sent", {
      phoneNo: mobile.replace(/\d(?=\d{4})/g, "*"),
    });
  }

  async verifyOtp(input: { phoneNo: string; otp: string }): Promise<boolean> {
    const mobile = formatIndianMobileForMsg91(input.phoneNo);
    const otp = input.otp.trim();
    if (!/^\d{10}$/.test(mobile) || !/^\d{4,6}$/.test(otp)) return false;

    const url = new URL(`${stripTrailingSlashes(this.config.baseUrl)}/otp/verify`);
    url.searchParams.set("otp", otp);
    url.searchParams.set("mobile", `91${mobile}`);
    const res = await fetchWithTimeout(url.toString(), {
      method: "GET",
      headers: { authkey: this.config.authKey },
    });
    const json = (await res.json().catch(() => ({}))) as { type?: string };
    return res.ok && json.type === "success";
  }
}

export class NoOpSmsClient implements SmsClient {
  async sendOtp(): Promise<void> {
    /* no phone configured */
  }
}

export class HttpSmsClient implements SmsClient {
  constructor(
    private readonly url: string,
    private readonly apiKey?: string,
  ) {}

  async sendOtp(input: { phoneNo: string; message: string }): Promise<void> {
    const res = await fetchWithTimeout(this.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({ phoneNo: input.phoneNo, message: input.message }),
    });
    if (!res.ok) {
      throw new Error(`SMS HTTP provider failed: ${res.status}`);
    }
  }
}

export class TwilioSmsClient implements SmsClient {
  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly fromNumber: string,
  ) {}

  async sendOtp(input: { phoneNo: string; message: string }): Promise<void> {
    const body = new URLSearchParams({
      To: input.phoneNo,
      From: this.fromNumber,
      Body: input.message,
    });
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");
    const res = await fetchWithTimeout(
      `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      },
    );
    if (!res.ok) {
      throw new Error(`Twilio SMS failed: ${res.status}`);
    }
  }
}

function readSmsConfigString(
  config: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = config[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readMsg91Config(config: Record<string, unknown>): {
  baseUrl: string;
  authKey: string;
  templateId: string;
  expiryMinutes: number;
} | null {
  const baseUrl =
    readSmsConfigString(config, "MSG91_URL") ?? readSmsConfigString(config, "msg91_url");
  const authKey =
    readSmsConfigString(config, "MSG91_AUTH_KEY") ??
    readSmsConfigString(config, "msg91_auth_key");
  const templateId =
    readSmsConfigString(config, "MSG91_TEMPLATE_ID") ??
    readSmsConfigString(config, "msg91_template_id");
  const expiryRaw =
    readSmsConfigString(config, "MSG91_EXPIRY") ?? readSmsConfigString(config, "msg91_expiry");
  if (!baseUrl || !authKey || !templateId) return null;
  const expiryMinutes = Number.parseInt(expiryRaw ?? "1", 10);
  return {
    baseUrl,
    authKey,
    templateId,
    expiryMinutes: Number.isFinite(expiryMinutes) ? expiryMinutes : 1,
  };
}

function createMsg91ClientFromEnv(): Msg91OtpSmsClient | null {
  const baseUrl = process.env["MSG91_URL"]?.trim();
  const authKey = process.env["MSG91_AUTH_KEY"]?.trim();
  const templateId = process.env["MSG91_TEMPLATE_ID"]?.trim();
  if (!baseUrl || !authKey || !templateId) return null;
  const expiryMinutes = Number.parseInt(process.env["MSG91_EXPIRY"]?.trim() ?? "1", 10);
  return new Msg91OtpSmsClient({
    baseUrl,
    authKey,
    templateId,
    expiryMinutes: Number.isFinite(expiryMinutes) ? expiryMinutes : 1,
  });
}

/**
 * Stale DB profile often stays `logging` while .env has MSG91 — prefer env when configured.
 * Returns an env-built client, or `undefined` to fall through to the profile-based switch.
 */
function tryEnvSmsFallback(profile: TenantIntegrationProfile): SmsClient | undefined {
  const envProvider = (process.env["ABDM_SMS_PROVIDER"] ?? "logging").toLowerCase();
  if (envProvider === "logging") return undefined;
  try {
    return createSmsClientFromEnv();
  } catch (e) {
    abdmWarn("abdm.m2.sms.env_fallback_failed", {
      tenantId: profile.iqTenantId,
      envProvider,
      message: e instanceof Error ? e.message : String(e),
    });
    return undefined;
  }
}

/** Build SMS client from `tenant_integration_profiles.sms_provider` + `sms_config`. */
export function createSmsClientFromProfile(profile: TenantIntegrationProfile): SmsClient {
  const profileProvider = (profile.smsProvider ?? "logging").toLowerCase();
  const config = profile.smsConfig ?? {};

  if (profileProvider === "logging") {
    const envClient = tryEnvSmsFallback(profile);
    if (envClient) return envClient;
  }

  switch (profileProvider) {
    case "noop":
      return new NoOpSmsClient();
    case "msg91": {
      const msg91Config = readMsg91Config(config);
      const msg91 = msg91Config
        ? new Msg91OtpSmsClient(msg91Config)
        : createMsg91ClientFromEnv();
      if (!msg91) {
        throw new Error(
          `MSG91_URL, MSG91_AUTH_KEY, MSG91_TEMPLATE_ID required when sms_provider=msg91 (tenant=${profile.iqTenantId})`,
        );
      }
      return msg91;
    }
    case "http": {
      const url = readSmsConfigString(config, "http_url") ?? readSmsConfigString(config, "url");
      if (!url) {
        throw new Error(
          `sms_config.http_url required when sms_provider=http (tenant=${profile.iqTenantId})`,
        );
      }
      return new HttpSmsClient(url, readSmsConfigString(config, "api_key"));
    }
    case "twilio": {
      const sid = readSmsConfigString(config, "twilio_account_sid");
      const token = readSmsConfigString(config, "twilio_auth_token");
      const from = readSmsConfigString(config, "twilio_from");
      if (!sid || !token || !from) {
        throw new Error(
          `sms_config twilio fields required when sms_provider=twilio (tenant=${profile.iqTenantId})`,
        );
      }
      return new TwilioSmsClient(sid, token, from);
    }
    case "logging":
    default:
      return new LoggingSmsClient();
  }
}

export function createSmsClientFromEnv(): SmsClient {
  const provider = (process.env["ABDM_SMS_PROVIDER"] ?? "logging").toLowerCase();
  switch (provider) {
    case "noop":
      return new NoOpSmsClient();
    case "msg91": {
      const msg91 = createMsg91ClientFromEnv();
      if (!msg91) {
        throw new Error(
          "MSG91_URL, MSG91_AUTH_KEY, MSG91_TEMPLATE_ID required when ABDM_SMS_PROVIDER=msg91",
        );
      }
      return msg91;
    }
    case "http": {
      const url = process.env["ABDM_SMS_HTTP_URL"]?.trim();
      if (!url) throw new Error("ABDM_SMS_HTTP_URL is required when ABDM_SMS_PROVIDER=http");
      return new HttpSmsClient(url, process.env["ABDM_SMS_HTTP_API_KEY"]?.trim());
    }
    case "twilio": {
      const sid = process.env["ABDM_SMS_TWILIO_ACCOUNT_SID"]?.trim();
      const token = process.env["ABDM_SMS_TWILIO_AUTH_TOKEN"]?.trim();
      const from = process.env["ABDM_SMS_TWILIO_FROM"]?.trim();
      if (!sid || !token || !from) {
        throw new Error(
          "ABDM_SMS_TWILIO_ACCOUNT_SID, ABDM_SMS_TWILIO_AUTH_TOKEN, ABDM_SMS_TWILIO_FROM required when ABDM_SMS_PROVIDER=twilio",
        );
      }
      return new TwilioSmsClient(sid, token, from);
    }
    case "logging":
    default:
      return new LoggingSmsClient();
  }
}
