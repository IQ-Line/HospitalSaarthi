export interface FhirAttachmentRef {
  title?: string;
  refId: string;
  bundleId: string;
  sessionId: string;
  num: number;
  contentType?: string;
}

export interface FhirDisplayEntry {
  id: string;
  bundleType?: string;
  title?: string;
  CompositionInfo?: Array<{ title?: string }>;
  AttachmentRefs?: FhirAttachmentRef[];
}

const PROFILE_BUNDLE_TYPE: Record<string, string> = {
  "https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord": "OPConsultRecord",
  "https://nrces.in/ndhm/fhir/r4/StructureDefinition/PrescriptionRecord": "PrescriptionRecord",
  "https://nrces.in/ndhm/fhir/r4/StructureDefinition/DiagnosticReportRecord":
    "DiagnosticReportRecord",
  "https://nrces.in/ndhm/fhir/r4/StructureDefinition/DischargeSummaryRecord":
    "DischargeSummaryRecord",
  "https://nrces.in/ndhm/fhir/r4/StructureDefinition/ImmunizationRecord": "ImmunizationRecord",
  "https://nrces.in/ndhm/fhir/r4/StructureDefinition/HealthDocumentRecord":
    "HealthDocumentRecord",
  "https://nrces.in/ndhm/fhir/r4/StructureDefinition/WellnessRecord": "WellnessRecord",
};

/** NRCeS profiles are often versioned (`.../OPConsultRecord|6.5.0`). */
export function resolveNrcesProfileBundleType(profileUrl: string | undefined): string | undefined {
  if (!profileUrl?.trim()) return undefined;
  const base = profileUrl.trim().split("|")[0] ?? profileUrl.trim();
  return PROFILE_BUNDLE_TYPE[base];
}

function extractAttachmentsFromResource(
  resource: Record<string, unknown>,
  bundleId: string,
  sessionId: string,
  startNum: number,
): FhirAttachmentRef[] {
  const refs: FhirAttachmentRef[] = [];
  let num = startNum;

  const presented = resource["presentedForm"];
  if (Array.isArray(presented)) {
    for (const form of presented) {
      if (!form || typeof form !== "object") continue;
      const f = form as Record<string, unknown>;
      if (typeof f["data"] !== "string") continue;
      refs.push({
        title: typeof f["title"] === "string" ? f["title"] : "Report",
        refId: `${bundleId}-att-${num}`,
        bundleId,
        sessionId,
        num,
        contentType: typeof f["contentType"] === "string" ? f["contentType"] : "application/pdf",
      });
      num += 1;
    }
  }

  const content = resource["content"];
  if (Array.isArray(content)) {
    for (const item of content) {
      if (!item || typeof item !== "object") continue;
      const attachment = (item as Record<string, unknown>)["attachment"];
      if (!attachment || typeof attachment !== "object") continue;
      const att = attachment as Record<string, unknown>;
      if (typeof att["data"] !== "string") continue;
      refs.push({
        title: typeof att["title"] === "string" ? att["title"] : "Document",
        refId: `${bundleId}-att-${num}`,
        bundleId,
        sessionId,
        num,
        contentType:
          typeof att["contentType"] === "string" ? att["contentType"] : "application/pdf",
      });
      num += 1;
    }
  }

  return refs;
}

export function parseFhirBundleForDisplay(
  contentJson: string,
  input: { sessionId: string; careContextReference?: string },
): FhirDisplayEntry {
  let bundle: Record<string, unknown>;
  try {
    bundle = JSON.parse(contentJson) as Record<string, unknown>;
  } catch {
    return {
      id: input.careContextReference ?? input.sessionId,
      bundleType: "HealthRecord",
    };
  }

  const bundleId =
    (typeof bundle["id"] === "string" && bundle["id"]) ||
    (typeof bundle["identifier"] === "object" &&
    bundle["identifier"] !== null &&
    typeof (bundle["identifier"] as Record<string, unknown>)["value"] === "string"
      ? String((bundle["identifier"] as Record<string, unknown>)["value"])
      : input.careContextReference) ||
    input.sessionId;

  let bundleType: string | undefined;
  let title: string | undefined;
  const attachmentRefs: FhirAttachmentRef[] = [];

  const entries = bundle["entry"];
  if (Array.isArray(entries)) {
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;
      const resource = (entry as Record<string, unknown>)["resource"];
      if (!resource || typeof resource !== "object") continue;
      const res = resource as Record<string, unknown>;
      const resourceType = res["resourceType"];

      if (resourceType === "Composition") {
        const profile = Array.isArray(res["meta"] && (res["meta"] as Record<string, unknown>)["profile"])
          ? ((res["meta"] as Record<string, unknown>)["profile"] as string[])[0]
          : undefined;
        const mapped = resolveNrcesProfileBundleType(profile);
        if (mapped) bundleType = mapped;
        if (typeof res["title"] === "string") title = res["title"];
      }

      attachmentRefs.push(
        ...extractAttachmentsFromResource(
          res,
          bundleId,
          input.sessionId,
          attachmentRefs.length + 1,
        ),
      );
    }
  }

  const profile = Array.isArray(bundle["meta"] && (bundle["meta"] as Record<string, unknown>)["profile"])
    ? ((bundle["meta"] as Record<string, unknown>)["profile"] as string[])[0]
    : undefined;
  if (!bundleType && profile) {
    const mapped = resolveNrcesProfileBundleType(profile);
    if (mapped) bundleType = mapped;
  }
  if (!bundleType && typeof bundle["type"] === "string") {
    bundleType = bundle["type"];
  }

  return {
    id: bundleId,
    bundleType,
    title,
    ...(title ? { CompositionInfo: [{ title }] } : {}),
    ...(attachmentRefs.length ? { AttachmentRefs: attachmentRefs } : {}),
  };
}

export function extractAttachmentContent(
  contentJson: string,
  num: number,
): { content: string; title: string; contentType: string } | null {
  let bundle: Record<string, unknown>;
  try {
    bundle = JSON.parse(contentJson) as Record<string, unknown>;
  } catch {
    return null;
  }

  const attachments: Array<{ content: string; title: string; contentType: string }> = [];
  const entries = bundle["entry"];
  if (!Array.isArray(entries)) return null;

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const resource = (entry as Record<string, unknown>)["resource"];
    if (!resource || typeof resource !== "object") continue;
    const res = resource as Record<string, unknown>;

    const presented = res["presentedForm"];
    if (Array.isArray(presented)) {
      for (const form of presented) {
        if (!form || typeof form !== "object") continue;
        const f = form as Record<string, unknown>;
        if (typeof f["data"] !== "string") continue;
        attachments.push({
          content: f["data"],
          title: typeof f["title"] === "string" ? f["title"] : "Report",
          contentType:
            typeof f["contentType"] === "string" ? f["contentType"] : "application/pdf",
        });
      }
    }

    const content = res["content"];
    if (Array.isArray(content)) {
      for (const item of content) {
        if (!item || typeof item !== "object") continue;
        const attachment = (item as Record<string, unknown>)["attachment"];
        if (!attachment || typeof attachment !== "object") continue;
        const att = attachment as Record<string, unknown>;
        if (typeof att["data"] !== "string") continue;
        attachments.push({
          content: att["data"],
          title: typeof att["title"] === "string" ? att["title"] : "Document",
          contentType:
            typeof att["contentType"] === "string" ? att["contentType"] : "application/pdf",
        });
      }
    }
  }

  const picked = attachments[num - 1];
  return picked ?? null;
}
