export type {
  IdentifierType,
  SequenceFormatSegment,
  IdentifierOverride,
  IdentifierOverrides,
} from "./types.js";

export {
  normalizeTenantNumericCode,
  resolveEffectiveIdentifier,
  composeIdentifier,
  buildCounterKey,
  sequenceStartsAt,
} from "./compose.js";

export { nextSequenceValue } from "./counter.js";

export {
  allocateIdentifier,
  type AllocateIdentifierInput,
} from "./allocate-identifier.js";
