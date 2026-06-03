import { defineConfig } from "tsup";
import { sharedConfig } from "../../tsup.config.shared.js";

export default defineConfig(sharedConfig({ entry: ["src/main.ts"] }));
