import { abdmWarn } from "../lib/abdm-adapter-log.js";
import { fetchWithTimeout } from "../lib/fetch-with-timeout.js";
import type { SmsClient } from "../ports.js";

/** Logs OTP for sandbox when no real provider is configured. */
export class LoggingSmsClient implements SmsClient {
  async sendOtp(input: { phoneNo: string; message: string }): Promise<void> {
    abdmWarn("abdm.m2.sms.otp_dispatched", {
      phoneNo: input.phoneNo.replace(/\d(?=\d{4})/g, "*"),
      messageLength: input.message.length,
    });
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

export function createSmsClientFromEnv(): SmsClient {
  const provider = (process.env["ABDM_SMS_PROVIDER"] ?? "logging").toLowerCase();
  switch (provider) {
    case "noop":
      return new NoOpSmsClient();
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
