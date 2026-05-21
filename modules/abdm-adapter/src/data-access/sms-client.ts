import { abdmWarn } from "../lib/abdm-adapter-log.js";
import type { SmsClient } from "../ports.js";

/** Logs OTP for sandbox; replace with real SMS provider in production. */
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
