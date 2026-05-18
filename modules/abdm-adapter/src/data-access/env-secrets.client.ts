import type { SecretsClient } from "../ports.js";

const ENV_REF = /^env:(.+)$/;

/**
 * Resolves `env:VAR_NAME` to `process.env.VAR_NAME`.
 * Used for ABDM gateway client credentials (never exposed to browsers).
 */
export class EnvSecretsClient implements SecretsClient {
  async resolve(reference: string): Promise<string> {
    const m = ENV_REF.exec(reference.trim());
    if (!m) {
      throw new Error(`Unsupported secret reference (expected env:NAME): ${reference}`);
    }
    const key = m[1];
    if (!key) {
      throw new Error(`Invalid secret reference: ${reference}`);
    }
    const value = process.env[key];
    if (value === undefined || value === "") {
      throw new Error(`Missing or empty environment variable: ${key}`);
    }
    return value;
  }
}
