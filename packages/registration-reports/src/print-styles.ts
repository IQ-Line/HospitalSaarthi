import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const REPORT_A4_PRINT_STYLES: string = fs.readFileSync(
  path.join(__dirname, "report-print.css"),
  "utf8",
);
