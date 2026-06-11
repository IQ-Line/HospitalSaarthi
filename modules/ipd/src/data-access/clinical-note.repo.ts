import { and, desc, eq, type DbInstance } from "@hims/ts-sdk-db";
import { clinicalNotes } from "../schema/tables.js";
import type {
  ClinicalNote,
  ClinicalNoteContent,
  ClinicalNoteListQuery,
  ClinicalNoteRepo,
} from "../domain/clinical-note.js";

function fromDb(row: typeof clinicalNotes.$inferSelect): ClinicalNote {
  return {
    id: row.id,
    iq_tenant_id: row.iq_tenant_id,
    episode_id: row.episode_id,
    note_type: row.note_type as ClinicalNote["note_type"],
    author_id: row.author_id,
    author_role: row.author_role as ClinicalNote["author_role"],
    author_specialty_code: row.author_specialty_code,
    content: (row.content ?? {}) as ClinicalNoteContent,
    status: row.status as ClinicalNote["status"],
    finalized_at: row.finalized_at?.toISOString() ?? null,
    finalized_by: row.finalized_by,
    signed_at: row.signed_at?.toISOString() ?? null,
    signed_by: row.signed_by,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

function matchesQuery(note: ClinicalNote, query?: ClinicalNoteListQuery): boolean {
  if (query?.status && note.status !== query.status) return false;
  if (query?.note_type && note.note_type !== query.note_type) return false;
  return true;
}

/** In-memory store — default for Swagger (`IPD_USE_MOCK_DATA=true`). */
export class InMemoryClinicalNoteRepo implements ClinicalNoteRepo {
  private store = new Map<string, ClinicalNote>();

  private k(tenantId: string, noteId: string) {
    return `${tenantId}:${noteId}`;
  }

  async listByEpisode(tenantId: string, episodeId: string, query?: ClinicalNoteListQuery) {
    return [...this.store.values()]
      .filter(
        (n) =>
          n.iq_tenant_id === tenantId &&
          n.episode_id === episodeId &&
          matchesQuery(n, query),
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async getById(tenantId: string, episodeId: string, noteId: string) {
    const row = this.store.get(this.k(tenantId, noteId));
    if (!row || row.episode_id !== episodeId) return null;
    return row;
  }

  async insert(row: ClinicalNote) {
    this.store.set(this.k(row.iq_tenant_id, row.id), row);
    return row;
  }

  async update(
    tenantId: string,
    episodeId: string,
    noteId: string,
    patch: Partial<ClinicalNote>,
  ) {
    const cur = await this.getById(tenantId, episodeId, noteId);
    if (!cur) return null;
    const next = { ...cur, ...patch, updated_at: new Date().toISOString() } as ClinicalNote;
    this.store.set(this.k(tenantId, noteId), next);
    return next;
  }
}

/** Postgres via Drizzle — set `IPD_USE_MOCK_DATA=false` + run `nx run ipd:db-migrate`. */
export class DrizzleClinicalNoteRepo implements ClinicalNoteRepo {
  constructor(private db: DbInstance) {}

  async listByEpisode(tenantId: string, episodeId: string, query?: ClinicalNoteListQuery) {
    const cond = [
      eq(clinicalNotes.iq_tenant_id, tenantId),
      eq(clinicalNotes.episode_id, episodeId),
    ];
    if (query?.status) cond.push(eq(clinicalNotes.status, query.status));
    if (query?.note_type) cond.push(eq(clinicalNotes.note_type, query.note_type));

    const rows = await this.db
      .select()
      .from(clinicalNotes)
      .where(and(...cond))
      .orderBy(desc(clinicalNotes.created_at));
    return rows.map(fromDb);
  }

  async getById(tenantId: string, episodeId: string, noteId: string) {
    const [row] = await this.db
      .select()
      .from(clinicalNotes)
      .where(
        and(
          eq(clinicalNotes.iq_tenant_id, tenantId),
          eq(clinicalNotes.episode_id, episodeId),
          eq(clinicalNotes.id, noteId),
        ),
      )
      .limit(1);
    return row ? fromDb(row) : null;
  }

  async insert(row: ClinicalNote) {
    const [r] = await this.db
      .insert(clinicalNotes)
      .values({
        ...row,
        content: row.content,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
        finalized_at: row.finalized_at ? new Date(row.finalized_at) : null,
        signed_at: row.signed_at ? new Date(row.signed_at) : null,
      })
      .returning();
    if (!r) throw new Error("insert failed");
    return fromDb(r);
  }

  async update(
    tenantId: string,
    episodeId: string,
    noteId: string,
    patch: Partial<ClinicalNote>,
  ) {
    const values: Record<string, unknown> = { updated_at: new Date() };
    if (patch.note_type !== undefined) values.note_type = patch.note_type;
    if (patch.author_role !== undefined) values.author_role = patch.author_role;
    if (patch.author_specialty_code !== undefined) {
      values.author_specialty_code = patch.author_specialty_code;
    }
    if (patch.content !== undefined) values.content = patch.content;
    if (patch.status !== undefined) values.status = patch.status;
    if (patch.finalized_at !== undefined) {
      values.finalized_at = patch.finalized_at ? new Date(patch.finalized_at) : null;
    }
    if (patch.finalized_by !== undefined) values.finalized_by = patch.finalized_by;

    const [r] = await this.db
      .update(clinicalNotes)
      .set(values)
      .where(
        and(
          eq(clinicalNotes.iq_tenant_id, tenantId),
          eq(clinicalNotes.episode_id, episodeId),
          eq(clinicalNotes.id, noteId),
        ),
      )
      .returning();
    return r ? fromDb(r) : null;
  }
}

export function createClinicalNoteRepo(
  db: DbInstance | undefined,
  useMock: boolean,
): ClinicalNoteRepo {
  return useMock || !db ? new InMemoryClinicalNoteRepo() : new DrizzleClinicalNoteRepo(db);
}
