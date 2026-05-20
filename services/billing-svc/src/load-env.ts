import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serviceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = path.resolve(serviceRoot, "../..");
config({ path: path.join(workspaceRoot, ".env") });
config({ path: path.join(serviceRoot, ".env"), override: true });
