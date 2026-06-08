/**
 * Seed EMPI patients matching OPD pharmacy demo visits (modules/opd/scripts/seed_dev_completed_visits.py).
 * Idempotent — skips rows that already exist for the bootstrap tenant.
 */
import { resolve } from "node:path";
import { and, createDb, eq } from "@hims/ts-sdk-db";
import { DEVELOPMENT_BOOTSTRAP_TENANT_ID } from "../../../packages/dev-bootstrap/src/dev-tenant-ids.ts";
import { patients } from "../src/schema/tables.js";
import { loadWorkspaceEnv } from "../../../tools/seed-user-management-dev/load-env.ts";

loadWorkspaceEnv(resolve(import.meta.dirname, "../../.."));

const TENANT_ID = DEVELOPMENT_BOOTSTRAP_TENANT_ID;

const SEED_PATIENTS = [
  {
    id: "a1111111-1111-4111-8111-111111111101",
    uhid: "250604480000000101",
    first_name: "Praveen",
    last_name: "Kumar N",
    full_name: "Praveen Kumar N",
    gender: "male" as const,
    age_years: 33,
    date_of_birth: "1993-06-15",
    phone_number: "9876543210",
  },
  {
    id: "a1111111-1111-4111-8111-111111111102",
    uhid: "250604480000000102",
    first_name: "Jane",
    last_name: "Demo",
    full_name: "Jane Demo",
    gender: "female" as const,
    age_years: 28,
    date_of_birth: "1998-03-20",
    phone_number: "9876543211",
  },
  {
    id: "a1111111-1111-4111-8111-111111111103",
    uhid: "250604480000000103",
    first_name: "Ramesh",
    last_name: "Sharma",
    full_name: "Ramesh Sharma",
    gender: "male" as const,
    age_years: 55,
    date_of_birth: "1971-01-10",
    phone_number: "9876543212",
  },
];

async function main(): Promise<void> {
  const databaseUrl = process.env["DATABASE_URL"]?.trim();
  if (!databaseUrl) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const db = createDb(databaseUrl);
  let inserted = 0;

  for (const row of SEED_PATIENTS) {
    const [existing] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.iq_tenant_id, TENANT_ID), eq(patients.id, row.id)))
      .limit(1);

    if (existing) {
      continue;
    }

    await db.insert(patients).values({
      id: row.id,
      iq_tenant_id: TENANT_ID,
      uhid: row.uhid,
      first_name: row.first_name,
      last_name: row.last_name,
      full_name: row.full_name,
      gender: row.gender,
      age_years: row.age_years,
      date_of_birth: row.date_of_birth,
      phone_number: row.phone_number,
      nationality: "Indian",
      status: "active",
    });
    inserted += 1;
  }

  if (inserted === 0) {
    console.log("[empi] pharmacy demo patients already seeded");
    return;
  }

  console.log(`[empi] seeded ${inserted} pharmacy demo patient(s) for tenant ${TENANT_ID}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
