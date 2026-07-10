import { resolveNrcesBundleType, firstProfileUrl } from "@hims/ts-sdk-fhir";

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

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;
}

function readString(obj: Record<string, unknown>, key: string): string | undefined {
  const value = obj[key];
  return typeof value === "string" ? value : undefined;
}

function parseJsonRecord(json: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function resourceOfEntry(entry: unknown): Record<string, unknown> | undefined {
  const entryRec = asRecord(entry);
  return entryRec ? asRecord(entryRec["resource"]) : undefined;
}

interface RawAttachment {
  data: string;
  title: string;
  contentType: string;
}

function pushAttachments(
  out: RawAttachment[],
  items: unknown,
  defaultTitle: string,
  getAttachment: (item: Record<string, unknown>) => Record<string, unknown> | undefined,
): void {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    const itemRec = asRecord(item);
    if (!itemRec) continue;
    const att = getAttachment(itemRec);
    if (!att || typeof att["data"] !== "string") continue;
    out.push({
      data: att["data"],
      title: readString(att, "title") ?? defaultTitle,
      contentType: readString(att, "contentType") ?? "application/pdf",
    });
  }
}

/** Attachments from a resource's `presentedForm[]` (self) and `content[].attachment` (nested), in that order. */
function collectResourceAttachments(res: Record<string, unknown>): RawAttachment[] {
  const out: RawAttachment[] = [];
  pushAttachments(out, res["presentedForm"], "Report", (form) => form);
  pushAttachments(out, res["content"], "Document", (item) => asRecord(item["attachment"]));
  return out;
}

function extractAttachmentsFromResource(
  resource: Record<string, unknown>,
  bundleId: string,
  sessionId: string,
  startNum: number,
): FhirAttachmentRef[] {
  return collectResourceAttachments(resource).map((att, index) => {
    const num = startNum + index;
    return {
      title: att.title,
      refId: `${bundleId}-att-${num}`,
      bundleId,
      sessionId,
      num,
      contentType: att.contentType,
    };
  });
}

function resolveBundleId(
  bundle: Record<string, unknown>,
  input: { sessionId: string; careContextReference?: string },
): string {
  const id = bundle["id"];
  if (typeof id === "string" && id) return id;
  const identifier = asRecord(bundle["identifier"]);
  const fromIdentifier =
    identifier && typeof identifier["value"] === "string"
      ? String(identifier["value"])
      : input.careContextReference;
  return fromIdentifier || input.sessionId;
}

interface CollectedBundleEntries {
  bundleType?: string;
  title?: string;
  attachmentRefs: FhirAttachmentRef[];
}

function collectBundleEntries(
  entries: unknown[],
  bundleId: string,
  sessionId: string,
): CollectedBundleEntries {
  let bundleType: string | undefined;
  let title: string | undefined;
  const attachmentRefs: FhirAttachmentRef[] = [];

  for (const entry of entries) {
    const res = resourceOfEntry(entry);
    if (!res) continue;

    if (res["resourceType"] === "Composition") {
      const mapped = resolveNrcesBundleType(firstProfileUrl(res));
      if (mapped) bundleType = mapped;
      const compositionTitle = readString(res, "title");
      if (compositionTitle !== undefined) title = compositionTitle;
    }

    attachmentRefs.push(
      ...extractAttachmentsFromResource(res, bundleId, sessionId, attachmentRefs.length + 1),
    );
  }

  return { bundleType, title, attachmentRefs };
}

export function parseFhirBundleForDisplay(
  contentJson: string,
  input: { sessionId: string; careContextReference?: string },
): FhirDisplayEntry {
  const bundle = parseJsonRecord(contentJson);
  if (!bundle) {
    return {
      id: input.careContextReference ?? input.sessionId,
      bundleType: "HealthRecord",
    };
  }

  const bundleId = resolveBundleId(bundle, input);
  const entries = bundle["entry"];
  const { title, attachmentRefs, bundleType: entryBundleType } = Array.isArray(entries)
    ? collectBundleEntries(entries, bundleId, input.sessionId)
    : { title: undefined, attachmentRefs: [], bundleType: undefined };

  let bundleType = entryBundleType;
  if (!bundleType) {
    const mapped = resolveNrcesBundleType(firstProfileUrl(bundle));
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
  const bundle = parseJsonRecord(contentJson);
  if (!bundle) return null;

  const entries = bundle["entry"];
  if (!Array.isArray(entries)) return null;

  const attachments: Array<{ content: string; title: string; contentType: string }> = [];
  for (const entry of entries) {
    const res = resourceOfEntry(entry);
    if (!res) continue;
    for (const att of collectResourceAttachments(res)) {
      attachments.push({ content: att.data, title: att.title, contentType: att.contentType });
    }
  }

  const picked = attachments[num - 1];
  return picked ?? null;
}
