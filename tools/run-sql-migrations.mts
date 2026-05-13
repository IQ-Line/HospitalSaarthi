import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createDb, sql } from "../packages/ts-sdk-db/src/index.ts";

type CliArgs = {
  dbEnv: string;
  fallbackEnv?: string;
  files: string[];
};

function parseArgs(argv: string[]): CliArgs {
  const files: string[] = [];
  let dbEnv: string | undefined;
  let fallbackEnv: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--db-env") {
      dbEnv = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--fallback-env") {
      fallbackEnv = argv[index + 1];
      index += 1;
      continue;
    }
    files.push(arg);
  }

  if (!dbEnv || files.length === 0) {
    throw new Error(
      "Usage: tsx tools/run-sql-migrations.mts --db-env <ENV> [--fallback-env <ENV>] <file.sql> [...file.sql]",
    );
  }

  return { dbEnv, fallbackEnv, files };
}

function resolveConnectionString(args: CliArgs): string {
  const primary = process.env[args.dbEnv]?.trim();
  if (primary && primary.length > 0) {
    return primary;
  }

  const fallback = args.fallbackEnv ? process.env[args.fallbackEnv]?.trim() : undefined;
  if (fallback && fallback.length > 0) {
    return fallback;
  }

  if (args.fallbackEnv) {
    throw new Error(`Missing database URL. Checked ${args.dbEnv} and ${args.fallbackEnv}.`);
  }

  throw new Error(`Missing database URL. Checked ${args.dbEnv}.`);
}

async function supportsGenRandomUuid(
  db: ReturnType<typeof createDb>,
): Promise<boolean> {
  try {
    await db.execute(sql.raw("select gen_random_uuid()"));
    return true;
  } catch {
    return false;
  }
}

function stripUnneededPgcryptoExtension(sqlText: string, hasGenRandomUuid: boolean): string {
  if (!hasGenRandomUuid) return sqlText;
  return sqlText.replace(/^\s*CREATE EXTENSION IF NOT EXISTS pgcrypto;\s*\r?\n?/gim, "");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const connectionString = resolveConnectionString(args);
  const db = createDb(connectionString);
  const hasGenRandomUuid = await supportsGenRandomUuid(db);

  for (const relativeFile of args.files) {
    const absoluteFile = resolve(relativeFile);
    const sqlText = stripUnneededPgcryptoExtension(
      await readFile(absoluteFile, "utf8"),
      hasGenRandomUuid,
    );
    console.log(`Applying ${relativeFile}`);
    await db.execute(sql.raw(sqlText));
  }
}

await main();
