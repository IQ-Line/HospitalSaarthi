# Registration module — LLD overview

**Status:** Phase 0 scaffold  
**OpenAPI:** `specs/openapi/registration.v1.yaml`  
**Code:** `modules/registration/` · **Service:** `services/registration-svc/` (default port **3004**, prefix **`/api/registration/v1`**)

---

## 1. Purpose

Registration stores **one row per encounter-intake episode** for a tenant: who (patient), optional visit/appointment links, site (facility), clinical context (department, provider, visit type), and **status**. It is shared by **OPD**, **IPD**, **Emergency**, and other visit-based flows so Frontdesk and clinical modules do not duplicate “arrival” state.

- **Not** EMPI: demographics and UHID stay in `empi.patients`.
- **Not** Master Data: catalogs (departments, visit types, facilities) are mastered there; this module stores **references** (UUIDs / codes agreed with consumers).
- **No cross-schema foreign keys** to EMPI or OPD: `patient_id` and `visit_id` are logical references validated at orchestration or via events.

---

## 2. Physical model

| Column | Type | Notes |
|--------|------|--------|
| `registration_id` | uuid | Part of composite PK with `iq_tenant_id`; default `gen_random_uuid()`. |
| `iq_tenant_id` | uuid | Citus distribution key; required on every row. |
| `visit_id` | uuid nullable | Set when visit/encounter service creates the encounter. |
| `patient_id` | uuid not null | EMPI patient id (same tenant). |
| `facility_id` | uuid nullable | Site / branch. |
| `visit_type` | text nullable | e.g. `opd_first`, `ipd_admission`; align with Master Data when catalogued. |
| `department_id` | uuid nullable | Scheduling / authz context. |
| `provider_id` | uuid nullable | Ordering / attending provider. |
| `appointment_id` | uuid nullable | Scheduling link. |
| `registration_status` | text not null | Default `pending`; expand to enum + state machine later. |
| `created_by`, `updated_by` | uuid nullable | Audit (platform `auditColumns()`). |
| `created_at`, `updated_at` | timestamptz | Audit. |

**Migration:** `modules/registration/migrations/0000_registration_schema.sql`

---

## 3. Module layout (same shape as EMPI / Configurator)

```
modules/registration/src/
  ports.ts                    # RegistrationRepo
  domain/registration.types.ts
  schema/tables.ts            # Drizzle: registration.registration
  data-access/registration.repo.ts
  use-cases/create-registration.ts
  use-cases/get-registration.ts
  rest-handlers/registrations.handler.ts
  rest-handlers/route-schemas.ts
  router.ts
  index.ts
```

---

## 4. APIs (Phase 0)

| Method | Path | Description |
|--------|------|----------------|
| POST | `/registrations` | Create row; body requires `patient_id`. |
| GET | `/registrations/{registrationId}` | Fetch by id (tenant from header). |

Patch/status/list filters are deferred until OPD/IPD contracts are wired.

---

## 5. BFF and web

- BFF proxies **`/api/registration/v1`** → `REGISTRATION_URL` (default `http://localhost:3004`).
- Web `apiClient` sends **`iq_tenant_id`** for paths under `/api/registration/v1/` (same rule as EMPI).

---

## 6. Integration checklist (later phases)

1. **After EMPI patient create** — BFF or client calls `POST /registrations` with `patient_id`.
2. **When visit exists** — OPD (or orchestration) PATCHes `visit_id` or emits `visit.created` consumed by Registration.
3. **Master Data** — resolve `visit_type`, `department_id`, `facility_id` against tenant-effective catalogs.
4. **Events** — publish `registration.created` / `registration.updated` with rich payload for projections (queue display, billing).

---

## 7. Operational notes

- Apply SQL migration before starting `registration-svc`.
- Default status `pending`; transition rules and Cerbos actions to be defined with OPD/IPD LLDs.
