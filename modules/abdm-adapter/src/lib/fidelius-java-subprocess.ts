import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, statSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { abdmWarn } from "./abdm-adapter-log.js";

const JAVA_TOOL_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../tools/fidelius-java-vector",
);

const JAVA_SOURCES = [
  join(JAVA_TOOL_DIR, "src/main/java/FideliusLiveEncrypt.java"),
  join(JAVA_TOOL_DIR, "src/main/java/FideliusStaticEncrypt.java"),
  join(JAVA_TOOL_DIR, "src/main/java/FideliusKeyToShare.java"),
];

let cachedClasspath: string | null = null;
let cachedSourceMtimeMs = 0;

function findBouncyCastleJar(): string {
  const m2 = join(homedir(), ".m2/repository/org/bouncycastle/bcprov-jdk18on");
  if (existsSync(m2)) {
    for (const version of readdirSync(m2).sort().reverse()) {
      const jar = join(m2, version, `bcprov-jdk18on-${version}.jar`);
      if (existsSync(jar)) return jar;
    }
  }
  throw new Error(
    "BouncyCastle jar not found. Run once: mvn -f modules/abdm-adapter/tools/fidelius-java-vector dependency:resolve",
  );
}

function ensureJavaClassesCompiled(): string {
  const sourceMtime = Math.max(
    ...JAVA_SOURCES.map((source) => statSync(source).mtimeMs),
  );
  if (cachedClasspath && cachedSourceMtimeMs >= sourceMtime) {
    return cachedClasspath;
  }
  cachedClasspath = null;

  const outDir = mkdtempSync(join(tmpdir(), "abdm-fidelius-cls-"));
  const bcJar = findBouncyCastleJar();

  const javac = spawnSyncChecked("javac", [
    "-cp",
    bcJar,
    "-d",
    outDir,
    ...JAVA_SOURCES,
  ]);
  if (javac.status !== 0) {
    throw new Error(`javac failed: ${javac.stderr}`);
  }

  cachedClasspath = `${outDir}:${bcJar}`;
  cachedSourceMtimeMs = sourceMtime;
  return cachedClasspath;
}

function spawnSyncChecked(
  cmd: string,
  args: string[],
): { status: number; stderr: string } {
  const result = spawnSync(cmd, args, { encoding: "utf8" });
  return {
    status: result.status ?? 1,
    stderr: `${result.stderr ?? ""}${result.stdout ?? ""}`,
  };
}

export function isFideliusJavaEncryptEnabled(): boolean {
  return process.env["ABDM_FIDELIUS_JAVA_ENCRYPT"] !== "false";
}

/** sukreet/fidelius HTTP /encrypt keyToShare = base64(X509 SPKI), not 65-byte EC point. */
export async function exportFideliusKeyToShareB64(
  senderPublicKeyB64: string,
): Promise<string> {
  const stdin = JSON.stringify({ senderPublicKeyB64 });
  const stdout = await runJavaMain("FideliusKeyToShare", stdin);
  const parsed = JSON.parse(stdout) as { keyToShareB64?: string };
  if (!parsed.keyToShareB64) {
    throw new Error("Fidelius keyToShare export returned invalid JSON");
  }
  return parsed.keyToShareB64;
}

/** PHR sandbox: encrypt via BC Java (same stack as mgrmtech/fidelius-cli). */
/** Static HIP keys + inbound HIU keyMaterial (PHR sandbox). */
export async function encryptBundlesForPeerStaticJava(input: {
  payloadJsons: string[];
  hipPrivateKeyB64: string;
  hipNonceB64: string;
  peerPublicKey: string;
  peerNonce: string;
}): Promise<{
  encryptedPayloads: string[];
  ourPublicKey: string;
  ourNonce: string;
}> {
  const stdin = JSON.stringify({
    hipPrivateKeyB64: input.hipPrivateKeyB64,
    hipNonceB64: input.hipNonceB64,
    hiuPublicKey: input.peerPublicKey,
    hiuNonce: input.peerNonce,
    payloadJsons: input.payloadJsons,
  });

  const stdout = await runJavaMain("FideliusStaticEncrypt", stdin);
  const parsed = JSON.parse(stdout) as {
    hipPublicKeyB64?: string;
    hipNonceB64?: string;
    encryptedPayloads?: string[];
  };
  if (
    !parsed.hipPublicKeyB64 ||
    !parsed.hipNonceB64 ||
    !Array.isArray(parsed.encryptedPayloads)
  ) {
    throw new Error("Java Fidelius static encrypt returned invalid JSON");
  }
  return {
    encryptedPayloads: parsed.encryptedPayloads,
    ourPublicKey: parsed.hipPublicKeyB64,
    ourNonce: parsed.hipNonceB64,
  };
}

export async function encryptBundlesForPeerJava(input: {
  payloadJsons: string[];
  peerPublicKey: string;
  peerNonce: string;
}): Promise<{
  encryptedPayloads: string[];
  ourPublicKey: string;
  ourNonce: string;
}> {
  const stdin = JSON.stringify({
    hiuPublicKey: input.peerPublicKey,
    hiuNonce: input.peerNonce,
    payloadJsons: input.payloadJsons,
  });

  const stdout = await runJavaMain("FideliusLiveEncrypt", stdin);
  const parsed = JSON.parse(stdout) as {
    hipPublicKeyB64?: string;
    hipNonceB64?: string;
    encryptedPayloads?: string[];
  };
  if (
    !parsed.hipPublicKeyB64 ||
    !parsed.hipNonceB64 ||
    !Array.isArray(parsed.encryptedPayloads)
  ) {
    throw new Error("Java Fidelius encrypt returned invalid JSON");
  }
  return {
    encryptedPayloads: parsed.encryptedPayloads,
    ourPublicKey: parsed.hipPublicKeyB64,
    ourNonce: parsed.hipNonceB64,
  };
}

function runJavaMain(mainClass: string, stdinJson: string): Promise<string> {
  const classpath = ensureJavaClassesCompiled();
  return new Promise((resolve, reject) => {
    const child = spawn("java", ["-cp", classpath, mainClass], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      const line = stdout
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.startsWith("{"));
      if (code !== 0 || !line) {
        reject(
          new Error(
            `Java Fidelius encrypt failed (code ${code}): ${stderr.slice(0, 500) || stdout.slice(0, 200)}`,
          ),
        );
        return;
      }
      resolve(line);
    });
    child.stdin.write(stdinJson);
    child.stdin.end();
  });
}

export async function encryptBundlesForPeerWithJavaFallback(input: {
  payloadJsons: string[];
  peerPublicKey: string;
  peerNonce: string;
  /** When false, Java failure throws (PHR sandbox must not fall back to TS). */
  allowTsFallback?: boolean;
  tsEncrypt: () => Promise<{
    encryptedPayloads: string[];
    ourPublicKey: string;
    ourNonce: string;
  }>;
}): Promise<{
  encryptedPayloads: string[];
  ourPublicKey: string;
  ourNonce: string;
  engine: "java" | "typescript";
}> {
  if (!isFideliusJavaEncryptEnabled()) {
    const ts = await input.tsEncrypt();
    return { ...ts, engine: "typescript" };
  }
  try {
    const java = await encryptBundlesForPeerJava(input);
    return { ...java, engine: "java" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (input.allowTsFallback === false) {
      throw new Error(`PHR push requires Java Fidelius encrypt: ${message}`);
    }
    abdmWarn("abdm.m3.fidelius_java_encrypt.fallback", { message });
    const ts = await input.tsEncrypt();
    return { ...ts, engine: "typescript" };
  }
}
