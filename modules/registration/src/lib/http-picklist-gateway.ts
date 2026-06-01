import type { PicklistReadPort } from "../ports.js";

const PICKLIST_API_PREFIX = "/api/v1/master-data/picklists";
const VISIT_TYPES_SLUG = "visit-types";
const REGISTRATION_STATUS_SLUG = "registration-status";
const CACHE_TTL_MS = 5 * 60 * 1000;

type PicklistWire = {
  id: string;
  slug: string;
};

type PicklistListWire = {
  data?: PicklistWire[];
};

type PicklistValueWire = {
  value: string;
  label: string;
  is_active?: boolean;
};

type PicklistValueListWire = {
  data?: PicklistValueWire[];
};

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

function buildValueLabelMap(values: PicklistValueWire[]): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const row of values) {
    if (row.is_active === false) continue;
    if (row.value && row.label) {
      map.set(row.value, row.label);
    }
  }
  return map;
}

export class HttpPicklistGateway implements PicklistReadPort {
  private cache:
    | {
        expiresAt: number;
        visitTypes: ReadonlyMap<string, string>;
        registrationStatuses: ReadonlyMap<string, string>;
      }
    | undefined;

  constructor(
    private readonly masterDataOrigin: string,
    private readonly warn?: (detail: Record<string, unknown>, message: string) => void,
  ) {}

  async getLabelMaps(): Promise<{
    visitTypes: ReadonlyMap<string, string>;
    registrationStatuses: ReadonlyMap<string, string>;
  }> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) {
      return {
        visitTypes: this.cache.visitTypes,
        registrationStatuses: this.cache.registrationStatuses,
      };
    }

    try {
      const maps = await this.fetchLabelMaps();
      this.cache = {
        ...maps,
        expiresAt: now + CACHE_TTL_MS,
      };
      return maps;
    } catch (err) {
      this.warn?.(
        { err: err instanceof Error ? err.message : String(err) },
        "Failed to fetch picklist labels from master-data; falling back to slugs",
      );
      return {
        visitTypes: new Map(),
        registrationStatuses: new Map(),
      };
    }
  }

  private async fetchLabelMaps(): Promise<{
    visitTypes: ReadonlyMap<string, string>;
    registrationStatuses: ReadonlyMap<string, string>;
  }> {
    const listUrl = joinUrl(this.masterDataOrigin, PICKLIST_API_PREFIX);
    const listRes = await fetch(listUrl, {
      headers: { Accept: "application/json" },
    });
    if (!listRes.ok) {
      throw new Error(`picklist list failed: ${listRes.status}`);
    }

    const listBody = (await listRes.json()) as PicklistListWire;
    const picklists = listBody.data ?? [];

    const visitTypesPicklist = picklists.find((p) => p.slug === VISIT_TYPES_SLUG);
    const statusPicklist = picklists.find((p) => p.slug === REGISTRATION_STATUS_SLUG);

    const [visitTypes, registrationStatuses] = await Promise.all([
      visitTypesPicklist
        ? this.fetchValuesForPicklist(visitTypesPicklist.id)
        : Promise.resolve(new Map<string, string>()),
      statusPicklist
        ? this.fetchValuesForPicklist(statusPicklist.id)
        : Promise.resolve(new Map<string, string>()),
    ]);

    return { visitTypes, registrationStatuses };
  }

  private async fetchValuesForPicklist(picklistId: string): Promise<ReadonlyMap<string, string>> {
    const valuesUrl = joinUrl(
      this.masterDataOrigin,
      `${PICKLIST_API_PREFIX}/${picklistId}/values?limit=200`,
    );
    const res = await fetch(valuesUrl, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`picklist values failed: ${res.status}`);
    }
    const body = (await res.json()) as PicklistValueListWire;
    return buildValueLabelMap(body.data ?? []);
  }
}
