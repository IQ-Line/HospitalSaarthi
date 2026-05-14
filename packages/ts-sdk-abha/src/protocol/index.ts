/**
 * `@hims/ts-sdk-abha/protocol` — ABDM gateway protocol DTOs.
 *
 * Wire-format types for M1/M2/M3 outbound requests + inbound callbacks.
 * Stubbed in this scaffold; populated by the ABDM dev from the v3 spec
 * docs (`docs/external/abdm/v3-m*.md`) and the NHA wrapper YAML
 * (`docs/external/abdm-wrapper/docs/wrapperV3.yaml`).
 *
 * Prefer the subpath imports for clarity:
 *   import type { ... } from '@hims/ts-sdk-abha/protocol/m1';
 *   import type { ... } from '@hims/ts-sdk-abha/protocol/m2';
 *   import type { ... } from '@hims/ts-sdk-abha/protocol/m3';
 *   import type { ... } from '@hims/ts-sdk-abha/protocol/common';
 */

export * as M1 from './m1/index.js';
export * as M2 from './m2/index.js';
export * as M3 from './m3/index.js';
export * as Common from './common/index.js';
