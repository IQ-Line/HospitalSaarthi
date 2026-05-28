import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

/** mgrmtech/fidelius-cli `e` — same stack as legacy abdi-lims-backed Fidelius HTTP. */
export async function encryptViaFideliusCli(input: {
  cliPath: string;
  senderPrivateKey: string;
  senderNonce: string;
  receiverPublicKey: string;
  receiverNonce: string;
  plainTextData: string;
}): Promise<{ encryptedData: string }> {
  const args = [
    "e",
    input.plainTextData,
    input.senderNonce,
    input.receiverNonce,
    input.senderPrivateKey,
    input.receiverPublicKey,
  ];

  const stdout = await runCli(input.cliPath, args);
  const json = JSON.parse(stdout) as { encryptedData?: string };
  if (!json.encryptedData) {
    throw new Error("Fidelius CLI encrypt returned invalid JSON");
  }
  return { encryptedData: json.encryptedData };
}

export function resolveFideliusCliPath(): string | undefined {
  const fromEnv = process.env["ABDM_FIDELIUS_CLI_PATH"]?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  const candidates = [
    join(process.cwd(), "tools/fidelius-cli/bin/fidelius-cli"),
    join(process.cwd(), "fidelius-cli/bin/fidelius-cli"),
    "/tmp/fidelius-cli-1.2.0/bin/fidelius-cli",
  ];
  return candidates.find((p) => existsSync(p));
}

function extractJsonObject(text: string): string | undefined {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return undefined;
  return text.slice(start, end + 1);
}

function runCli(cliPath: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cliPath, args, { stdio: ["ignore", "pipe", "pipe"] });
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
      const json = extractJsonObject(stdout);
      if (code !== 0 || !json) {
        reject(
          new Error(
            `Fidelius CLI failed (code ${code}): ${stderr.slice(0, 400) || stdout.slice(0, 200)}`,
          ),
        );
        return;
      }
      resolve(json);
    });
  });
}
