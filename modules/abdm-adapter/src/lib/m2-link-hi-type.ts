import { AbdmUseCaseError } from "./m1-errors.js";
import { toLinkCareContextHiType } from "./m2-hi-type-mapper.js";

/** One NHA `hiType` per link/discover patient block — rejects mixed visit types. */
export function resolveUnifiedLinkHiType(
  contexts: ReadonlyArray<{ hiType?: string }>,
  defaultRaw = "OPCONSULTATION",
): string {
  const mapped =
    contexts.length > 0
      ? contexts.map((c) => toLinkCareContextHiType(c.hiType ?? defaultRaw))
      : [toLinkCareContextHiType(defaultRaw)];
  const first = mapped[0]!;
  if (mapped.some((t) => t !== first)) {
    throw new AbdmUseCaseError(
      "All care contexts in one link request must share the same HI type",
      400,
      "MIXED_HI_TYPES",
    );
  }
  return first;
}
