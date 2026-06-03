export function nodeEnv(): string {
  return process.env["NODE_ENV"] ?? "development";
}

export function isNonDevNodeEnv(): boolean {
  const env = nodeEnv();
  return env === "production" || env === "staging";
}

/** Sandbox / local: permissive callback JWS and optional plaintext tokens. */
export function allowInsecureAbdmCallbacks(): boolean {
  if (!isNonDevNodeEnv()) return true;
  return process.env["ABDM_ALLOW_INSECURE_CALLBACKS"] === "true";
}

export function allowPlaintextTokensAtRest(): boolean {
  if (!isNonDevNodeEnv()) return true;
  return process.env["ABDM_ALLOW_PLAINTEXT_TOKENS"] === "true";
}
