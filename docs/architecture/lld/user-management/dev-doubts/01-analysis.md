# Analysis: Dev doubts on User Management ERD

**Doubt:** [01.md](./01.md)

---

## 1. Citus and the better-auth tables

### How Citus distribution works

Citus takes a regular PostgreSQL table and **shards it** across multiple worker nodes based on a **distribution column**. When you run:

```sql
SELECT create_distributed_table('user_management.users', 'iq_tenant_id');
```

Citus hashes every row's `iq_tenant_id` value and places that row on the worker node responsible for that hash range. All rows with the same `iq_tenant_id` land on the same node. This means:

- `WHERE iq_tenant_id = 'hospital-a'` hits exactly one node (fast)
- A JOIN between `users` and `role_assignments` filtered by the same `iq_tenant_id` is node-local (no cross-node shuffle)
- A query WITHOUT `iq_tenant_id` must scatter to ALL nodes (slow, to be avoided)

### Why better-auth tables are different

The `ba_users` table represents a **login identity** — the human being, independent of any tenant. Dr. Sharma has ONE `ba_users` row with ONE `id`. She then has TWO `users` rows (one per hospital she works at), both pointing to the same `ba_users.id` via `auth_user_id`.

```
ba_users:
  id: "auth-111"    name: "Dr. Sharma"    email: "sharma@example.com"

users:
  iq_tenant_id: "hospital-a"   id: "user-aaa"   auth_user_id: "auth-111"   roles: [cardiologist]
  iq_tenant_id: "hospital-b"   id: "user-bbb"   auth_user_id: "auth-111"   roles: [consultant]
```

If we distributed `ba_users` by `iq_tenant_id`, we'd need to pick one — but it belongs to BOTH tenants. So `ba_users` is distributed by its own `id` instead.

### What this means practically

- `ba_users`, `ba_sessions`, `ba_accounts` are still IN the Citus cluster, still sharded, just by `id`/`user_id` instead of `iq_tenant_id`
- JOINs between `users` and `ba_users` cross node boundaries (the distribution keys don't match) — but this only happens during login, never on the hot request path
- Every other table in the schema is distributed by `iq_tenant_id`, so all tenant-scoped queries (the vast majority) are node-local

### Citus reference tables (bonus)

The `capabilities` table uses a third distribution mode: **reference table**. Instead of sharding, Citus replicates the entire table to every worker node. This means JOINs from any distributed table to `capabilities` are always node-local. Reference tables are for small, read-heavy, globally-shared data — exactly what capabilities are.

```
Reference table:  capabilities     → full copy on every node
Distributed:      role_capabilities → sharded by iq_tenant_id
JOIN:             role_capabilities JOIN capabilities → always local (capabilities is on every node)
```

---

## 2. Principal kinds: user, service, agent

These map directly to HLD-04 §9 (Cerbos principal types). The `kind` column on `users` tells Cerbos policies what TYPE of principal is making a request, so policies can have different rules for each.

### `user` — human beings

Staff, doctors, nurses, administrators, front-desk clerks. The primary principal type. They authenticate via login (better-auth or federated IdP), get a JWT, and interact through the frontend.

### `service` — inter-module service accounts

When the OPD module calls the Lab module to place a lab order, it doesn't use the doctor's JWT. It authenticates with its OWN service-account JWT (HLD-04 §6). The Lab module's PEP checks: "is `opd-service` allowed to call `lab:order:create`?"

Each module that makes outbound calls has a `users` row with `kind: 'service'`, its own roles, and its own capabilities. Service accounts are created during module deployment, not through the admin UI.

**Why this matters:** Without service accounts, you'd need to forward the originating user's JWT to the target module. But the Lab module would then need to understand OPD-specific roles to authorize the request. Service accounts decouple this — the Lab module only needs to know "is this a trusted service with `lab:order:create`?"

### `agent` — automated/scheduled/AI principals

Background workers and automated jobs that act on the system without a human triggering them. Examples from HLD-04 §9.5:

- A nightly job that generates shift-end reports
- A background worker that pushes health records to ABDM
- A scheduled job that checks for expiring medications and sends alerts
- A clinical decision support AI that queries patient records to generate suggestions

Agents are like service accounts but with a semantic distinction: service accounts represent MODULE-to-MODULE communication (OPD calling Lab). Agents represent AUTOMATED PROCESSES acting independently (a cron job, a background worker, an AI assistant).

**Why separate from `service`?** Cerbos policies may need to treat them differently:
- A service account from OPD can create lab orders (it's acting on behalf of a doctor's workflow)
- An AI agent might be allowed to READ patient records for analysis but NOT write prescriptions
- Audit reports might want to distinguish "actions taken by humans via modules" from "actions taken by automated processes"

**If the team finds this distinction unnecessary early on**, you could start with just `user` and `service`, and add `agent` when the first automated process is built. The column is a TEXT with a CHECK constraint — adding a value is a one-line migration.

---

## 3. Where capability strings are stored

The colon-separated strings like `opd:registration:search:advanced` are stored in the **`capabilities` table**, column **`name`**.

From the schema reference:

```
capabilities table:
  id:           UUID (PK)
  module:       TEXT        → 'opd'
  name:         TEXT        → 'opd:registration:search:advanced'  (UNIQUE)
  display_name: TEXT        → 'Advanced patient search'
  description:  TEXT        → null or explanation
  is_assignable: BOOLEAN    → true
  sort_order:   INTEGER     → controls UI ordering
```

This table is a Citus reference table (see §1 above). It's seeded by module migrations and is the single source of truth for what capabilities exist on the platform.

The `role_capabilities` junction table then maps roles to capabilities:

```
role_capabilities:
  iq_tenant_id:  UUID    → 'hospital-a'
  role_id:       UUID    → (points to the 'nurse' role in hospital-a)
  capability_id: UUID    → (points to 'opd:registration:search:advanced' in capabilities)
```

This is how "Hospital A's nurses can do advanced patient search" is expressed as data, without touching Cerbos policies.

If the ERD visual didn't show this clearly, it's likely because the erd-editor extension wasn't rendering when you checked — the data is there in both the `.erd.json` and the `schema-reference.json`.

---

## 4. Permission change audit: keep it or rely on downstream CDC?

This is a real architectural question with good arguments on both sides.

### What `permission_change_audit` captures

Every mutation to authorization-relevant data: role assignments created/revoked, role-capability mappings changed, delegations created/revoked, clearances granted/revoked, user status changes. Each record has who, when, old value, new value, and reason.

### The EM's likely argument: "a downstream CDC audit service will capture this"

CDC (Change Data Capture) watches the database WAL (write-ahead log) and publishes every row change as an event. A downstream audit service consumes these events and stores them. So why also store audit records in the module's own table?

### Arguments FOR keeping `permission_change_audit` (in-module)

**1. Semantic richness that CDC can't provide.**

CDC captures: "row X in `role_assignments` had `revoked_at` changed from NULL to `2026-05-01T10:00:00Z`."

`permission_change_audit` captures: "Dr. Sharma's 'attending-physician' role in Cardiology was revoked by Admin Patel because 'transferred to Pulmonology department'. Previous state: active since 2025-01-15. New state: revoked."

CDC gives you column diffs. The audit table gives you business context — WHO did it, WHY (the `reason` field), and the semantic meaning of the change. Reconstructing "why was this role revoked?" from a CDC column diff requires joining multiple tables and still won't give you the reason.

**2. Queryable by the admin UI without depending on an external service.**

The User Management admin UI needs to show permission change history: "Show me all changes to Dr. Sharma's access in the last 30 days." If this data is only in a downstream CDC service, the admin UI must call that service. If the CDC service is down or slow, the admin UI can't show permission history.

With an in-module audit table, this query is a simple `SELECT ... WHERE user_id = ? AND iq_tenant_id = ? ORDER BY changed_at DESC` — no external dependency, co-located on the same Citus shard.

**3. Regulatory: healthcare audit trails have specific requirements.**

NABH and DPDP Act require audit trails that are traceable, tamper-evident, and available for compliance review. An in-module audit table with append-only writes provides this. A CDC pipeline that flows through Kafka → audit service → storage introduces multiple points where audit records could be lost, delayed, or out of order. The in-module table is the simpler compliance story.

**4. The table is small.**

Permission changes are low-frequency events — maybe a few hundred per tenant per month. The storage cost is negligible. This isn't like audit-logging every API request (which SHOULD be downstream).

### Arguments FOR removing it (relying on CDC only)

**1. Avoids duplication if CDC audit service will exist.**

If the platform WILL have a CDC-based audit service, having BOTH means the same change is recorded in two places. The CDC service is more general (captures all changes across all modules), while the in-module table is specific to permission changes.

**2. One fewer table to maintain.**

Less schema to migrate, less code to write (the audit record creation logic in every mutation endpoint).

**3. The EM's architectural preference for centralized audit.**

If the EM has a strong vision for a centralized audit service that all modules rely on, in-module audit tables work against that vision.

### Recommendation: keep it, but understand the scope

**Keep `permission_change_audit`** for permission-specific, semantically rich, regulatorily required audit records. This is NOT a general-purpose "log everything" table — it captures only authorization data mutations with business context (reason, old/new state).

**The downstream CDC audit service** (when built) captures everything else: clinical data changes, operational data changes, API access logs. These two serve different purposes:

| | `permission_change_audit` | CDC audit service |
|---|---|---|
| **What** | Permission/access changes only | All data changes across all modules |
| **Granularity** | Business-level ("role revoked because...") | Row-level ("column X changed from A to B") |
| **Queried by** | Admin UI, compliance reviews | Analytics, forensics, system-wide audit |
| **Dependency** | None (local table) | External service must be running |
| **When built** | Phase 0 (exists from day one) | Later phase (CDC infra needed) |

If the EM's position is "no module should have its own audit table, period" — then the counter-question is: who provides the business-context audit (the `reason` field, the semantic description of what changed) that CDC can't? If the answer is "the CDC service will be enriched with business context," that's a significant scope addition to the CDC service that should be designed explicitly.

---

## 5. Department / sub-department handling

Yes, your reading is correct. Two things work together:

### `department_projection.parent_department_id` — the hierarchy

This handles the tree structure of departments and sub-departments:

```
department_projection:
  iq_tenant_id: "hospital-a"
  department_id: "dept-medicine"     name: "Medicine"          parent_department_id: NULL
  department_id: "dept-cardiology"   name: "Cardiology"        parent_department_id: "dept-medicine"
  department_id: "dept-pulmonology"  name: "Pulmonology"       parent_department_id: "dept-medicine"
  department_id: "dept-card-icu"     name: "Cardiac ICU"       parent_department_id: "dept-cardiology"
```

This is a projection — the actual department hierarchy is owned by Master Data and synced via events. User Management keeps a local copy for:
- Populating dropdowns in the admin UI
- Resolving department names for display
- Providing hierarchy to the PEP (Cerbos can evaluate "user is in Cardiology, which is under Medicine")

### `user_department_assignments.is_primary` — the user's affiliations

A user can belong to multiple departments (a doctor may consult in both Cardiology and the Cardiac ICU), but one is their PRIMARY department (used in the JWT `department` claim and as the default Cerbos attribute):

```
user_department_assignments:
  user_id: "dr-sharma"   department_id: "dept-cardiology"   is_primary: true    effective_from: 2025-01-15
  user_id: "dr-sharma"   department_id: "dept-card-icu"     is_primary: false   effective_from: 2025-06-01
```

Dr. Sharma's JWT carries `department: "dept-cardiology"` (primary). When the PEP constructs the Cerbos principal, it can include both departments as attributes if needed for fine-grained policies.

### What about ward-level scoping?

Wards are a level below departments in some hospitals (e.g., "Cardiology Ward A", "Cardiology Ward B"). The `role_assignments.scope_type` column handles this — a role assignment can be scoped to a `department` OR a `ward`:

```
role_assignments:
  user_id: "nurse-patel"   role_id: "charge-nurse"   scope_type: "ward"   scope_id: "ward-card-a"
```

This means Nurse Patel has the charge-nurse role specifically in Cardiology Ward A, not across all of Cardiology. The ward hierarchy itself would be in the department projection (wards as children of departments) or in a separate ward projection if the data model is more complex.
