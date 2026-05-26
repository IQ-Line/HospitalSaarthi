import { eq, and, type DbInstance, type SQL } from "@hims/ts-sdk-db";
import type { OrganizationRepo } from "../ports.js";
import type {
  Organization,
  CreateOrganizationData,
  UpdateOrganizationData,
  OrganizationFilters,
} from "../domain/organization.types.js";
import { organizations } from "../schema/tables.js";
import { omitUndefined } from "./utils.js";

export class DrizzleOrganizationRepo implements OrganizationRepo {
  constructor(private readonly db: DbInstance) {}

  async findAll(filters?: OrganizationFilters): Promise<Organization[]> {
    const conditions: SQL[] = [];

    if (filters?.status) {
      conditions.push(eq(organizations.status, filters.status));
    }
    if (filters?.type) {
      conditions.push(eq(organizations.type, filters.type));
    }

    const query = this.db.select().from(organizations);

    if (conditions.length > 0) {
      return query.where(and(...conditions)) as unknown as Organization[];
    }

    return query as unknown as Organization[];
  }

  async findById(id: string): Promise<Organization | undefined> {
    const rows = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);

    return rows[0] as Organization | undefined;
  }

  async findBySlug(slug: string): Promise<Organization | undefined> {
    const rows = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);

    return rows[0] as Organization | undefined;
  }

  async create(data: CreateOrganizationData): Promise<Organization> {
    const rows = await this.db
      .insert(organizations)
      .values({
        name: data.name,
        slug: data.slug,
        type: data.type,
        status: data.status ?? "active",
        contact_email: data.contact_email?.trim() || null,
        website: data.website?.trim() || null,
        contact_phone: data.contact_phone ?? null,
        address: data.address ?? null,
        metadata: data.metadata ?? null,
        created_by: data.created_by ?? null,
        updated_by: data.created_by ?? null,
      })
      .returning();

    return rows[0] as Organization;
  }

  async update(
    id: string,
    data: UpdateOrganizationData,
  ): Promise<Organization | undefined> {
    const patch = omitUndefined(data as Record<string, unknown>);
    const rows = await this.db
      .update(organizations)
      .set({
        ...patch,
        updated_at: new Date(),
      })
      .where(eq(organizations.id, id))
      .returning();

    return rows[0] as Organization | undefined;
  }
}
