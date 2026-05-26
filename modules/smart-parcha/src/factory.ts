import { HttpAiExtractAdapter } from './adapters/http-ai-adapter.js';
import { HttpHimsAdapter } from './adapters/http-hims-adapter.js';
import { MemoryParchaStore } from './adapters/memory-parcha-store.js';
import { MockAiExtractAdapter } from './adapters/mock-ai-adapter.js';
import { MockHimsAdapter } from './adapters/mock-hims-adapter.js';
import { loadConfig, type SmartParchaConfig } from './config.js';
import type { SmartParchaDeps } from './ports.js';

export function createSmartParchaDeps(
  env: NodeJS.ProcessEnv = process.env,
): SmartParchaDeps {
  const config = loadConfig(env);
  const hims =
    config.HIMS_ADAPTER === 'http' && config.HIMS_DELEGATE_FULL_CONTEXT
      ? new HttpHimsAdapter(config)
      : new MockHimsAdapter();
  const ai = config.AI_ADAPTER === 'http' ? new HttpAiExtractAdapter(config) : new MockAiExtractAdapter();
  const parcha = new MemoryParchaStore();
  return { hims, ai, parcha, config };
}

export type { SmartParchaConfig };
