import { randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";

const LIVE_PREFIX = "hims_live_";
const TEST_PREFIX = "hims_test_";
const RANDOM_SEGMENT_LENGTH = 24;
const KEY_PREFIX_LENGTH = 12;

export type GeneratedApiKey = {
  api_key: string;
  key_prefix: string;
};

function randomSegment(): string {
  return randomBytes(18).toString("base64url").slice(0, RANDOM_SEGMENT_LENGTH);
}

export function generateApiKey(isLive: boolean): GeneratedApiKey {
  const prefix = isLive ? LIVE_PREFIX : TEST_PREFIX;
  const api_key = `${prefix}${randomSegment()}`;
  return {
    api_key,
    key_prefix: api_key.slice(0, KEY_PREFIX_LENGTH),
  };
}

export async function hashApiKey(plaintext: string): Promise<string> {
  return hash(plaintext, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyApiKey(plaintext: string, keyHash: string): Promise<boolean> {
  try {
    return await verify(keyHash, plaintext);
  } catch {
    return false;
  }
}
