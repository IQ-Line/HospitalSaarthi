# User Management — Scenarios Walkthrough

**Purpose:** Walk through real-world scenarios that a hospital information system must handle, and show exactly how the User Management schema supports each one. This document complements the [schema design rationale](./01-schema-design.md) by demonstrating the design under realistic conditions.

**Audience:** Reviewers, EM, tech-lead, and developers who want to verify that the schema handles operational reality — not just clean-room examples.

**Notation:** SQL-style pseudocode shows data states, not literal queries. Column lists are abbreviated to the relevant ones. System-initiated actions (platform seeding, SCIM sync) use well-known service-account UUIDs from the `users` table (e.g., `svc-platform-seed`, `svc-scim-sync`) — shown as readable names here for clarity.

---

## 1. Tenant onboarding — setting up a new hospital

**Scenario:** AIIMS Delhi signs on. An org-admin creates the tenant, seeds initial roles, and onboards the first batch of staff.

### What happens

**Step 1 — Tenant record created (Configurator)**

Configurator creates the tenant with `iq_tenant_id = 'aiims-delhi'` and enables modules: User Management, OPD, Lab, Pharmacy, Billing. This is outside the User Management schema, but the `iq_tenant_id` becomes the distribution key for all User Management data.

**Step 2 — Platform-seeded roles appear**

When User Management is initialized for the tenant, platform-seeded roles (marked `is_system = true`) are created:

```
roles:
  iq_tenant_id: 'aiims-delhi'  name: 'super-admin'       is_system: true   scope_level: 'tenant'
  iq_tenant_id: 'aiims-delhi'  name: 'physician'          is_system: true   scope_level: 'tenant'
  iq_tenant_id: 'aiims-delhi'  name: 'nurse'              is_system: true   scope_level: 'tenant'
  iq_tenant_id: 'aiims-delhi'  name: 'front-desk-clerk'   is_system: true   scope_level: 'tenant'
  iq_tenant_id: 'aiims-delhi'  name: 'lab-technician'     is_system: true   scope_level: 'tenant'
  iq_tenant_id: 'aiims-delhi'  name: 'pharmacist'         is_system: true   scope_level: 'tenant'
```

Each platform-seeded role comes with a default set of capabilities via `role_capabilities`. The tenant admin can add capabilities to these roles but cannot delete the role itself.

**Step 3 — First super-admin created**

```
ba_users:
  id: 'auth-001'  name: 'Admin Patel'  email: 'patel@aiims.edu'

users:
  iq_tenant_id: 'aiims-delhi'  id: 'usr-001'  auth_user_id: 'auth-001'  kind: 'user'  full_name: 'Admin Patel'  status: 'active'

role_assignments:
  iq_tenant_id: 'aiims-delhi'  user_id: 'usr-001'  role_id: (super-admin)  assigned_by: 'svc-platform-seed'  assigned_at: now()
```

**Step 4 — Tenant-specific roles created**

AIIMS Delhi has a unique role "Chief Resident" that the platform doesn't seed. Admin Patel creates it:

```
roles:
  iq_tenant_id: 'aiims-delhi'  name: 'chief-resident'  is_system: false  scope_level: 'tenant'

role_capabilities:
  role_id: (chief-resident)  capability_id: (opd:consultation:notes:edit)
  role_id: (chief-resident)  capability_id: (opd:consultation:notes:approve)
  role_id: (chief-resident)  capability_id: (lab:order:create)
  role_id: (chief-resident)  capability_id: (admin:user:view)
```

**Step 5 — Department projection populated**

Master Data publishes department events. User Management stores the projection:

```
department_projection:
  iq_tenant_id: 'aiims-delhi'  department_id: 'dept-medicine'     name: 'Medicine'       parent_department_id: NULL
  iq_tenant_id: 'aiims-delhi'  department_id: 'dept-cardiology'   name: 'Cardiology'     parent_department_id: 'dept-medicine'
  iq_tenant_id: 'aiims-delhi'  department_id: 'dept-emergency'    name: 'Emergency'      parent_department_id: NULL
  iq_tenant_id: 'aiims-delhi'  department_id: 'dept-pathology'    name: 'Pathology'      parent_department_id: NULL
```

### Why the schema supports this

- All data for AIIMS Delhi lands on the same Citus shard (distributed by `iq_tenant_id`). Onboarding a new tenant is "add data to a new shard" — zero impact on existing tenants.
- Platform-seeded roles (`is_system = true`) provide defaults without restricting the tenant from creating custom roles.
- Capabilities are already available (reference table, replicated to all nodes) — no need to "import" them from another service.

---

## 2. Staff onboarding — registering Dr. Sharma

**Scenario:** Dr. Sharma joins AIIMS Delhi's Cardiology department as an Attending Physician.

### What happens

```
ba_users:
  id: 'auth-111'  name: 'Dr. Sharma'  email: 'sharma@example.com'

users:
  iq_tenant_id: 'aiims-delhi'  id: 'usr-111'  auth_user_id: 'auth-111'  kind: 'user'
  full_name: 'Dr. Sharma'  email: 'sharma@example.com'  status: 'active'

role_assignments:
  iq_tenant_id: 'aiims-delhi'  user_id: 'usr-111'  role_id: (physician)
  scope_type: NULL  scope_id: NULL  assigned_by: 'usr-001'

user_department_assignments:
  iq_tenant_id: 'aiims-delhi'  user_id: 'usr-111'  department_id: 'dept-cardiology'
  is_primary: true  effective_from: '2026-01-15'  effective_to: NULL
```

### What Dr. Sharma's JWT looks like after login

```json
{
  "sub": "usr-111",
  "iq_tenant_id": "aiims-delhi",
  "roles": ["physician"],
  "department": "dept-cardiology",
  "org_id": null,
  "exp": "...",
  "iat": "...",
  "iss": "..."
}
```

### What the PEP constructs from cache

```json
{
  "id": "usr-111",
  "roles": ["physician"],
  "attr": {
    "iq_tenant_id": "aiims-delhi",
    "department": "dept-cardiology",
    "capabilities": [
      "opd:consultation:notes:view",
      "opd:consultation:notes:edit",
      "opd:prescription:create",
      "lab:order:create",
      "lab:results:view"
    ],
    "delegated_capabilities": [],
    "clearances": {}
  }
}
```

### Why the schema supports this

- One-row-per-tenant for the user record means all JOINs (`role_assignments`, `user_department_assignments`) stay on the same Citus shard.
- The JWT is compact (role names only); capabilities are resolved by the PEP from cache.
- Department assignment has `is_primary: true`, which drives the JWT `department` claim.

---

## 3. Multi-tenant login — Dr. Sharma works at two hospitals

**Scenario:** Dr. Sharma is a visiting consultant at District Hospital in addition to AIIMS Delhi. She authenticates once and picks which hospital to work in.

### What happens

**Step 1 — Second tenant record created for Dr. Sharma**

```
users:
  iq_tenant_id: 'aiims-delhi'     id: 'usr-111'  auth_user_id: 'auth-111'  kind: 'user'  (existing)
  iq_tenant_id: 'district-hosp'   id: 'usr-222'  auth_user_id: 'auth-111'  kind: 'user'  (new)

role_assignments:
  iq_tenant_id: 'district-hosp'  user_id: 'usr-222'  role_id: (consultant)  — different role than AIIMS

user_department_assignments:
  iq_tenant_id: 'district-hosp'  user_id: 'usr-222'  department_id: 'dept-general-medicine'
  is_primary: true
```

**Step 2 — Login flow**

1. Dr. Sharma opens the login page and enters credentials.
2. better-auth authenticates her → resolves `auth_user_id = 'auth-111'`.
3. User Management queries: `SELECT iq_tenant_id, full_name, status FROM users WHERE auth_user_id = 'auth-111' AND status = 'active'`. (This is a cross-shard scatter query — no `iq_tenant_id` filter. Acceptable because it runs once at login, never on the hot request path.)
4. Two rows returned: `aiims-delhi` and `district-hosp`.
5. Frontend shows a **tenant picker**: "AIIMS Delhi" / "District Hospital".
6. Dr. Sharma selects "AIIMS Delhi".
7. JWT issued with `iq_tenant_id: 'aiims-delhi'`, roles from AIIMS Delhi's `role_assignments`.

**Step 3 — Switching tenants**

Dr. Sharma finishes her morning clinic at AIIMS Delhi and needs to review lab results at District Hospital. She clicks "Switch Organization" in the UI. The frontend calls the tenant-switch endpoint. A new JWT is issued with `iq_tenant_id: 'district-hosp'` and the District Hospital roles. **No re-authentication.**

### Why the schema supports this

- One `ba_users` row with one `auth_user_id`, two `users` rows (one per tenant). Each `users` row has its own roles, departments, and clearances appropriate to that hospital.
- The `auth_user_id → users` lookup crosses node boundaries (ba_users distributed by `id`, users distributed by `iq_tenant_id`). This cross-node query happens once at login — not on every request.
- After tenant selection, every downstream service sees a single-tenant JWT. The multi-tenant concept does not leak past login.

---

## 4. Role customization — same role, different capabilities per tenant

**Scenario:** At AIIMS Delhi, nurses can create lab orders. At District Hospital, nurses cannot — the lab requires physician authorization for all orders.

### What the data looks like

```
-- AIIMS Delhi: nurse role includes lab:order:create
role_capabilities:
  iq_tenant_id: 'aiims-delhi'  role_id: (nurse at AIIMS)  capability_id: (lab:order:create)
  iq_tenant_id: 'aiims-delhi'  role_id: (nurse at AIIMS)  capability_id: (opd:vitals:record)
  iq_tenant_id: 'aiims-delhi'  role_id: (nurse at AIIMS)  capability_id: (opd:triage:create)

-- District Hospital: nurse role does NOT include lab:order:create
role_capabilities:
  iq_tenant_id: 'district-hosp'  role_id: (nurse at DH)  capability_id: (opd:vitals:record)
  iq_tenant_id: 'district-hosp'  role_id: (nurse at DH)  capability_id: (opd:triage:create)
```

### What happens when Nurse Patel (AIIMS) tries to create a lab order

1. Request arrives at Lab module PEP with JWT `roles: ["nurse"]`, `iq_tenant_id: "aiims-delhi"`.
2. PEP resolves nurse capabilities from cache → includes `lab:order:create`.
3. Cerbos check: `principal.capabilities.includes("lab:order:create")` → **ALLOW**.

### What happens when Nurse Das (District Hospital) tries the same

1. Request arrives with JWT `roles: ["nurse"]`, `iq_tenant_id: "district-hosp"`.
2. PEP resolves nurse capabilities from cache → does NOT include `lab:order:create`.
3. Cerbos check → `lab:order:create` not in capabilities → **DENY**.

### Why the schema supports this

- The Cerbos policy is identical for both tenants: "allow if principal has `lab:order:create`". No per-tenant policy forking.
- The difference is entirely in the `role_capabilities` data, configurable by each tenant's admin through the admin UI.
- Adding or removing capabilities from a role is a data operation that takes effect on the next PEP cache refresh — no deployment, no Cerbos policy change, no restart.

---

## 5. Delegation — superintendent on medical leave

**Scenario:** Dr. Mehta (Medical Superintendent at AIIMS Delhi) goes on medical leave for 2 weeks. She delegates her approval authority to Dr. Gupta (Additional Superintendent).

### What happens

**Step 1 — Delegation created via admin UI**

```
delegations:
  iq_tenant_id: 'aiims-delhi'
  delegator_id: 'usr-333' (Dr. Mehta)
  delegatee_id: 'usr-444' (Dr. Gupta)
  delegation_type: 'role'
  delegated_role_id: (medical-superintendent)
  reason: 'Medical leave 2026-05-01 to 2026-05-14'
  effective_from: '2026-05-01T00:00:00Z'
  effective_to: '2026-05-14T23:59:59Z'
  status: 'active'
```

**Step 2 — Audit record created**

```
permission_change_audit:
  iq_tenant_id: 'aiims-delhi'
  entity_type: 'delegation'
  entity_id: (delegation row id)
  action: 'created'
  changed_by: 'usr-333' (Dr. Mehta herself)
  new_value: { delegatee: 'usr-444', role: 'medical-superintendent', until: '2026-05-14' }
  reason: 'Medical leave delegation'
```

**Step 3 — PEP enrichment picks it up**

When Dr. Gupta makes a request, the PEP:
1. Resolves Dr. Gupta's own roles and capabilities.
2. Queries active delegations: `WHERE delegatee_id = 'usr-444' AND status = 'active' AND effective_from <= now() AND effective_to >= now()`.
3. Finds the medical-superintendent delegation → adds all medical-superintendent capabilities to Dr. Gupta's Cerbos principal as `delegated_capabilities`.
4. Cerbos policy evaluates: "this approval action is allowed because `principal.attr.delegated_capabilities` includes the required capability."

**Step 4 — Delegation expires**

On 2026-05-15, the delegation's `effective_to` is in the past. The PEP query returns no active delegation. Dr. Gupta's approval authority reverts to his own roles automatically. A background job marks the delegation `status = 'expired'`.

### Why the schema supports this

- Delegations are time-bounded with explicit `effective_from` / `effective_to` — no manual revocation needed for planned absences.
- The `reason` field provides an audit trail of WHY the delegation exists. A compliance officer can see "Dr. Mehta delegated to Dr. Gupta because of medical leave" — not just a row diff.
- Delegation-type flexibility: `delegation_type = 'role'` delegates all capabilities of a role; `delegation_type = 'capability'` delegates a single atomic capability (e.g., only the approval capability, not the full superintendent role).

---

## 6. Sensitivity clearance — psychiatric records

**Scenario:** AIIMS Delhi's Psychiatry department treats a VIP patient. Only staff with explicit psychiatric clearance AND VIP clearance can view the record.

### What happens

**Step 1 — Clearances granted**

```
user_clearances:
  iq_tenant_id: 'aiims-delhi'  user_id: 'usr-555' (Dr. Rao, Psychiatry)
  clearance_type: 'psychiatric'  clearance_level: 'view_and_edit'
  granted_by: 'usr-001' (Admin Patel)  granted_at: now()  expires_at: NULL

  iq_tenant_id: 'aiims-delhi'  user_id: 'usr-555'
  clearance_type: 'vip'  clearance_level: 'view_and_edit'
  granted_by: 'usr-001'  granted_at: now()  expires_at: NULL
```

**Step 2 — PEP enrichment**

When Dr. Rao accesses the patient record, the PEP constructs:

```json
{
  "id": "usr-555",
  "roles": ["physician"],
  "attr": {
    "capabilities": ["opd:consultation:notes:view", "opd:consultation:notes:edit", ...],
    "clearances": {
      "psychiatric": "view_and_edit",
      "vip": "view_and_edit"
    }
  }
}
```

**Step 3 — Cerbos evaluation**

The patient record has resource attributes `sensitivity: ["psychiatric", "vip"]`. The Cerbos policy checks:

```
allow if:
  for all s in resource.attr.sensitivity:
    principal.attr.clearances[s] exists AND principal.attr.clearances[s] in ["view", "view_and_edit"]
```

Dr. Rao has both clearances → **ALLOW**.

**Step 4 — Unauthorized access attempt**

Dr. Kumar (Cardiology) tries to view the same patient's record. Dr. Kumar has no psychiatric or VIP clearance → `clearances: {}` in the Cerbos principal → **DENY**. The audit log records the denied access attempt (at the Cerbos PDP level, not in User Management's `permission_change_audit`).

### Why the schema supports this

- Clearances are ABAC attributes — orthogonal to roles. A cardiologist (role) and a psychiatrist (role) may both need VIP clearance, but only the psychiatrist needs psychiatric clearance.
- Clearances have lifecycle: `granted_at`, `expires_at`, `revoked_at`. Temporary clearances (e.g., a locum doctor covering Psychiatry for 2 weeks) expire automatically.
- The Cerbos evaluation is resource-driven: the data sensitivity label on the record determines which clearances are needed. User Management provides the clearances; the clinical module marks the record as sensitive.

---

## 7. Department transfer — Nurse Patel moves from Cardiology to Emergency

**Scenario:** Nurse Patel is transferred from Cardiology to the Emergency department at AIIMS Delhi.

### What happens

**Step 1 — Close current department assignment**

```
user_department_assignments:
  -- close existing assignment
  UPDATE: effective_to = '2026-05-01' WHERE user_id = 'usr-666' AND department_id = 'dept-cardiology' AND effective_to IS NULL
```

**Step 2 — Create new department assignment**

```
user_department_assignments:
  iq_tenant_id: 'aiims-delhi'  user_id: 'usr-666'  department_id: 'dept-emergency'
  is_primary: true  effective_from: '2026-05-01'  effective_to: NULL
```

**Step 3 — Role reassignment (if needed)**

If Nurse Patel had a department-scoped role:

```
role_assignments:
  -- revoke cardiology-scoped role
  UPDATE: revoked_at = now(), revoked_by = 'usr-001' WHERE user_id = 'usr-666' AND scope_type = 'department' AND scope_id = 'dept-cardiology'

  -- assign emergency-scoped role
  INSERT: user_id = 'usr-666'  role_id: (charge-nurse)  scope_type: 'department'  scope_id: 'dept-emergency'  assigned_by: 'usr-001'
```

**Step 4 — Clearance review**

If Nurse Patel had ward-specific clearances (e.g., Cardiac ICU clearance), the admin reviews and revokes them:

```
user_clearances:
  UPDATE: revoked_at = now() WHERE user_id = 'usr-666' AND clearance_type = 'cardiac_icu'
```

**Step 5 — Audit trail**

```
permission_change_audit:
  entity_type: 'user_status'      action: 'updated'   changed_by: 'usr-001'  reason: 'Department transfer: Cardiology → Emergency'
  entity_type: 'role_assignment'   action: 'revoked'   changed_by: 'usr-001'  reason: 'Transferred to Emergency'
  entity_type: 'role_assignment'   action: 'created'   changed_by: 'usr-001'  reason: 'Transfer from Cardiology'
  entity_type: 'clearance'        action: 'revoked'   changed_by: 'usr-001'  reason: 'No longer in Cardiac ICU'
```

(Department assignment changes are captured via `old_value`/`new_value` JSONB on the `user_status` entity type, which records the full context of the transfer.)


**Step 6 — Next login**

Nurse Patel's next JWT carries `department: "dept-emergency"`. The PEP resolves the new role (charge-nurse in Emergency) and its capabilities. Cardiology-scoped capabilities are gone.

### Why the schema supports this

- Department assignments use `effective_from` / `effective_to` — the history is preserved. "When was Nurse Patel in Cardiology?" is a simple query, not a CDC archaeology exercise.
- Role scoping (`scope_type: 'department'`) means department-specific roles are revoked precisely during transfers. Tenant-wide roles (scope_type = NULL) are unaffected by the transfer.
- Every permission change is recorded in `permission_change_audit` with `reason` and `changed_by` — the compliance officer sees a coherent transfer narrative, not a series of disconnected column diffs.

---

## 8. Service-to-service auth — OPD module orders a lab test

**Scenario:** A doctor creates a consultation in OPD and orders a lab test. The OPD module's backend calls the Lab module's API to place the order.

### What happens

**Step 1 — Service account exists**

```
users:
  iq_tenant_id: 'aiims-delhi'  id: 'svc-opd'  auth_user_id: NULL  kind: 'service'
  full_name: 'OPD Service Account'  status: 'active'

role_assignments:
  iq_tenant_id: 'aiims-delhi'  user_id: 'svc-opd'  role_id: (opd-service)

role_capabilities:
  role_id: (opd-service)  capability_id: (lab:order:create)
  role_id: (opd-service)  capability_id: (lab:order:status)
```

**Step 2 — OPD backend calls Lab API**

OPD authenticates with its service JWT (signed by the same JWKS). The JWT carries:

```json
{
  "sub": "svc-opd",
  "iq_tenant_id": "aiims-delhi",
  "roles": ["opd-service"],
  "kind": "service"
}
```

**Step 3 — Lab module PEP evaluates**

1. PEP resolves `opd-service` role → capabilities include `lab:order:create`.
2. Cerbos check: action=`create`, resource=`lab:order`, principal has `lab:order:create` → **ALLOW**.

### Why the schema supports this

- Service accounts are first-class citizens in the `users` table (`kind: 'service'`). They follow the same role-capability model as human users — no separate auth mechanism.
- `auth_user_id` is NULL for service accounts (they don't authenticate through better-auth login).
- The Lab module doesn't need to understand OPD-specific roles. It only checks capabilities: "does this principal have `lab:order:create`?" The decoupling means adding a new module that creates lab orders (e.g., Emergency) only requires granting `lab:order:create` to the new module's service account.

---

## 9. Scheduled agent — nightly shift-end report generation

**Scenario:** A cron job generates shift-end reports every night at 11 PM, reading patient census data and nurse assignments.

### What happens

```
users:
  iq_tenant_id: 'aiims-delhi'  id: 'agt-reports'  auth_user_id: NULL  kind: 'agent'
  full_name: 'Shift Report Agent'  status: 'active'

role_assignments:
  iq_tenant_id: 'aiims-delhi'  user_id: 'agt-reports'  role_id: (report-agent)

role_capabilities:
  role_id: (report-agent)  capability_id: (opd:census:read)
  role_id: (report-agent)  capability_id: (admin:staff-schedule:read)
  role_id: (report-agent)  capability_id: (reports:shift-end:generate)
```

At 11 PM, the cron job authenticates as `agt-reports` using service credentials and generates the report. Cerbos evaluates: the agent can read census and schedule data and generate reports, but cannot modify patient records, prescribe medication, or change staffing.

### Why the schema supports this

- `kind: 'agent'` distinguishes automated processes from service-to-service communication (`kind: 'service'`). Cerbos policies can have agent-specific rules: e.g., agents are never allowed to write clinical data, even if they have a read capability.
- The capability model limits the agent's blast radius: `opd:census:read` permits reading census data but nothing else in OPD.
- Audit trails clearly distinguish agent actions from human actions (the JWT `sub` points to `agt-reports`).

---

## 10. SCIM provisioning — bulk sync from a government HR system

**Scenario:** AIIMS Delhi uses a government HR system as the source of truth for staff records. The HR system pushes changes via SCIM (System for Cross-domain Identity Management) to keep User Management in sync.

### What happens

**Step 1 — IdP + SCIM configuration created**

The GOV-HR system uses SAML for login federation and SCIM for directory provisioning — two separate protocols, tracked in two related tables:

```
idp_configurations:
  iq_tenant_id: 'aiims-delhi'
  provider_type: 'saml'
  provider_name: 'GOV-HR System'
  is_active: true
  auto_provision: true
  attribute_mapping: { employeeId: 'employee_id', name: 'full_name', department: 'department_code' }

scim_sync_state:
  iq_tenant_id: 'aiims-delhi'
  idp_configuration_id: (above)
  last_sync_at: '2026-05-01T02:00:00Z'
  sync_status: 'idle'
  sync_cursor: 'page-42'
```

**Step 2 — New staff member in HR system**

GOV-HR adds Dr. Verma. SCIM push arrives:
1. User Management creates a `ba_users` record (if email doesn't exist) and a `users` record with the tenant ID.
2. Default role assigned based on the HR designation mapping (configured in Configurator).
3. Department assignment created based on the HR department code → matched to `department_projection`.

**Step 3 — Staff member leaves in HR system**

GOV-HR marks a nurse as "terminated." SCIM push arrives:
1. User Management sets `users.status = 'inactive'` for that user.
2. All active `role_assignments` are revoked with `revoked_by = 'svc-scim-sync'` (the SCIM sync service account).
3. `permission_change_audit` records the deactivation with `changed_by: 'svc-scim-sync'`, `reason: 'HR system termination sync'`.

### Why the schema supports this

- `idp_configurations` stores tenant-specific IdP/SCIM integration details. Each tenant can have different HR systems.
- `scim_sync_state` tracks sync progress — the system knows where it left off if a sync is interrupted.
- `employee_id` on `users` maps to the HR system's staff identifier, enabling bidirectional matching.
- The `permission_change_audit` captures SCIM-driven changes with the same semantic richness as manual admin changes — the compliance officer can see that the deactivation was driven by the HR system, not by a manual admin action.

---

## 11. Compliance audit — "show me all changes to Dr. Sharma's access"

**Scenario:** A compliance officer is investigating a potential unauthorized access incident. They need a complete history of all permission changes for Dr. Sharma in the last 90 days.

### What happens

**Single query against `permission_change_audit`:**

```sql
SELECT entity_type, action, old_value, new_value, reason, changed_by, changed_at
FROM user_management.permission_change_audit
WHERE iq_tenant_id = 'aiims-delhi'
  AND (
    (entity_type = 'role_assignment' AND (new_value->>'user_id' = 'usr-111' OR old_value->>'user_id' = 'usr-111'))
    OR (entity_type = 'delegation' AND (new_value->>'delegatee_id' = 'usr-111' OR new_value->>'delegator_id' = 'usr-111'))
    OR (entity_type = 'clearance' AND new_value->>'user_id' = 'usr-111')
  )
  AND changed_at >= now() - interval '90 days'
ORDER BY changed_at;
```

**Result returns a coherent narrative:**

| Date | Event | Who Changed | Reason |
|------|-------|-------------|--------|
| 2026-02-15 | Role `physician` assigned | Admin Patel | Staff onboarding |
| 2026-03-01 | Clearance `vip` granted | Admin Patel | Assigned to VIP ward rotation |
| 2026-03-15 | Delegation received: `medical-superintendent` approval | Dr. Mehta | Conference delegation |
| 2026-03-22 | Delegation expired | SYSTEM | Auto-expiry |
| 2026-04-01 | Clearance `vip` revoked | Admin Patel | VIP ward rotation ended |
| 2026-04-15 | Role `chief-resident` assigned | Admin Patel | Promotion |

### Why this matters vs. CDC-only audit

A CDC-based audit service for the same investigation would show:
- "row X in `role_assignments` inserted" (no reason, no who-approved context)
- "row Y in `user_clearances` column `revoked_at` changed from NULL to `2026-04-01`" (no reason)
- The compliance officer would need to JOIN multiple tables, cross-reference timestamps, and still wouldn't have the `reason` field.

The in-module `permission_change_audit` gives the compliance officer a self-contained, business-level narrative. CDC serves a different purpose (row-level forensics, event replay, analytics).

---

## 12. Organization-level access — regional medical director

**Scenario:** Dr. Singh is the Regional Medical Director for a hospital chain (org_id = 'org-north-zone') that includes AIIMS Delhi and District Hospital. She needs read access to reports across all hospitals in her zone.

### What happens

**Step 1 — Org-scoped role created in each tenant**

The role definition is per-tenant (roles are tenant-scoped data), so it must be created in both hospitals:

```
roles:
  iq_tenant_id: 'aiims-delhi'    name: 'regional-director'  scope_level: 'organization'  is_system: true
  iq_tenant_id: 'district-hosp'  name: 'regional-director'  scope_level: 'organization'  is_system: true

role_capabilities:  (same capabilities assigned in both tenants)
  iq_tenant_id: 'aiims-delhi'    role_id: (regional-director)  capability_id: (reports:facility:view)
  iq_tenant_id: 'aiims-delhi'    role_id: (regional-director)  capability_id: (reports:clinical-summary:view)
  iq_tenant_id: 'aiims-delhi'    role_id: (regional-director)  capability_id: (admin:staff-summary:view)
  iq_tenant_id: 'district-hosp'  role_id: (regional-director)  capability_id: (reports:facility:view)
  iq_tenant_id: 'district-hosp'  role_id: (regional-director)  capability_id: (reports:clinical-summary:view)
  iq_tenant_id: 'district-hosp'  role_id: (regional-director)  capability_id: (admin:staff-summary:view)
```

**Step 2 — Dr. Singh has user records in each tenant**

```
users:
  iq_tenant_id: 'aiims-delhi'    id: 'usr-777'  auth_user_id: 'auth-777'  org_id: 'org-north-zone'
  iq_tenant_id: 'district-hosp'  id: 'usr-888'  auth_user_id: 'auth-777'  org_id: 'org-north-zone'

role_assignments:
  iq_tenant_id: 'aiims-delhi'    user_id: 'usr-777'  role_id: (regional-director)
  iq_tenant_id: 'district-hosp'  user_id: 'usr-888'  role_id: (regional-director)
```

**Step 3 — JWT for AIIMS Delhi session**

```json
{
  "sub": "usr-777",
  "iq_tenant_id": "aiims-delhi",
  "roles": ["regional-director"],
  "org_id": "org-north-zone"
}
```

**Step 4 — Accessing cross-tenant reports**

When Dr. Singh needs to see reports from all hospitals in her zone, the reporting module uses `org_id` to query across tenants within the organization. Cerbos evaluates:

- Principal has `reports:facility:view` → allowed to view facility reports.
- Principal's `org_id = 'org-north-zone'` → allowed to see data from tenants within this org.
- Cerbos policy: `allow if resource.attr.org_id == principal.attr.org_id AND principal.capabilities.includes("reports:facility:view")`.

### Why the schema supports this

- `org_id` on the `users` record connects the user to an organization that spans tenants.
- `scope_level: 'organization'` on the role indicates this role's permissions apply across the org.
- Each tenant still has its own `users` row for Dr. Singh — per-tenant roles, departments, and clearances are independent. The `regional-director` role is additional, not a replacement.

---

## 13. Handling a security incident — revoking all access immediately

**Scenario:** A nurse's credentials are compromised. The security admin needs to revoke all access immediately.

### What happens

**Step 1 — Suspend the user**

```sql
UPDATE users SET status = 'suspended', updated_by = 'usr-001'
WHERE iq_tenant_id = 'aiims-delhi' AND id = 'usr-666';
```

**Step 2 — Invalidate sessions**

```sql
DELETE FROM ba_sessions WHERE user_id = 'auth-666';
```

(better-auth session invalidation — forces re-login, which will be blocked by `status = 'suspended'`.)

**Step 3 — Audit**

```
permission_change_audit:
  entity_type: 'user_status'  action: 'updated'  changed_by: 'usr-001'
  reason: 'Credential compromise — incident INC-2026-0042'
  old_value: { status: 'active' }
  new_value: { status: 'suspended' }
```

**Step 4 — Downstream enforcement**

- The PEP cache refreshes on the `user.updated` event. Subsequent requests with the old JWT are rejected because the PEP checks `status = 'active'` before constructing the Cerbos principal.
- If the PEP cache hasn't refreshed yet, the JWT itself is still valid until expiry (15 min default). This is a known tradeoff of JWT-based auth — for immediate revocation, the PEP must check session validity or the user's status against a blocklist.

### Why the schema supports this

- `status = 'suspended'` is distinct from `'inactive'` — suspended means "access revoked for cause," inactive means "no longer employed." Both block access, but they have different operational meanings and different remediation paths.
- Session invalidation via `ba_sessions` deletion happens in the better-auth layer.
- The audit record captures the incident reference (`INC-2026-0042`) in the `reason` field — linking the User Management action to the security incident tracking system.

---

## 14. Feature rollout — enabling Smart Parcha for one tenant

**Scenario:** The OPD team ships the "Smart Parcha" feature. AIIMS Delhi should get it; District Hospital should not.

### What happens

**Step 1 — Capabilities already seeded (from OPD module migration)**

```
capabilities:
  module: 'opd'  name: 'opd:smart-parcha:visit:create'   display_name: 'Create Smart Parcha visit'
  module: 'opd'  name: 'opd:smart-parcha:visit:read'     display_name: 'View Smart Parcha visit'
  module: 'opd'  name: 'opd:smart-parcha:visit:update'   display_name: 'Update Smart Parcha visit'
```

These exist in the capabilities reference table, available to all tenants (replicated to all Citus nodes, no `iq_tenant_id` column).

**Step 2 — Configurator feature flag**

Configurator sets `opd.smart_parcha.enabled = true` for AIIMS Delhi, `false` for District Hospital.

**Step 3 — AIIMS Delhi admin assigns capabilities**

Admin Patel adds Smart Parcha capabilities to the physician role:

```
role_capabilities:
  iq_tenant_id: 'aiims-delhi'  role_id: (physician)  capability_id: (opd:smart-parcha:visit:create)
  iq_tenant_id: 'aiims-delhi'  role_id: (physician)  capability_id: (opd:smart-parcha:visit:read)
```

**Step 4 — Defense in depth**

Even if a District Hospital admin mistakenly assigns `opd:smart-parcha:visit:create` to a role:
- The OPD module's backend checks the Configurator feature flag FIRST.
- `opd.smart_parcha.enabled = false` → the endpoint returns 404 (feature not available), regardless of capabilities.
- Capabilities are necessary but not sufficient — the feature must also be enabled at the tenant level.

### Why the schema supports this

- Capabilities exist globally (reference table), but assignment is per-tenant (role_capabilities).
- Two-layer enforcement: Configurator feature flag (entitlement — "does the tenant have this?") + capability assignment (authorization — "can this user use it?").
- No Master Data involvement needed. The OPD module's migration seeded the capabilities; Configurator manages the feature flag; the admin assigns capabilities. One-place-per-concern.

---

## 15. Ward-level scoping — charge nurse for a specific ward

**Scenario:** AIIMS Delhi's Cardiology department has two wards: Ward A and Ward B. Nurse Patel is the charge nurse for Ward A only.

### What happens

```
role_assignments:
  iq_tenant_id: 'aiims-delhi'
  user_id: 'usr-666' (Nurse Patel)
  role_id: (charge-nurse)
  scope_type: 'ward'
  scope_id: 'ward-card-a'
  assigned_by: 'usr-001'
```

When Nurse Patel accesses Ward A patient data:
1. PEP sees role `charge-nurse` scoped to `ward: ward-card-a`.
2. Cerbos evaluates: action on resource in `ward-card-a` + principal has `charge-nurse` scoped to `ward-card-a` → **ALLOW**.

When Nurse Patel accesses Ward B patient data:
1. PEP sees no `charge-nurse` role scoped to `ward-card-b`.
2. Nurse Patel may still have her base `nurse` role (tenant-wide, no scope) → she can perform basic nursing tasks. But charge-nurse-specific actions (e.g., approving medication administration records) are denied for Ward B.

### Why the schema supports this

- `role_assignments.scope_type` + `scope_id` enables fine-grained scoping without creating separate roles per ward.
- The same `charge-nurse` role definition is reused — only the assignment scope differs.
- A tenant-wide role (scope_type = NULL) and a ward-scoped role can coexist for the same user. The PEP merges capabilities from all active assignments.

---

## Summary: what the schema handles

| Category | Scenarios | Key schema features |
|----------|-----------|-------------------|
| **Tenant lifecycle** | §1 onboarding, §14 feature rollout | `iq_tenant_id` distribution, `is_system` roles, capabilities reference table |
| **User lifecycle** | §2 onboarding, §7 transfer, §13 security incident | `users.status`, department assignments with `effective_from/to`, audit trail |
| **Multi-tenancy** | §3 multi-tenant login, §4 role customization | `auth_user_id` linking, per-tenant `role_capabilities` |
| **Authorization granularity** | §4 capabilities, §6 clearances, §15 ward scoping | `role_capabilities`, `user_clearances`, `role_assignments.scope_type` |
| **Delegation** | §5 superintendent delegation | `delegations` with time bounds, PEP enrichment |
| **Non-human principals** | §8 service accounts, §9 agents | `users.kind` (user/service/agent), same capability model |
| **External integration** | §10 SCIM provisioning | `idp_configurations`, `scim_sync_state`, `employee_id` |
| **Compliance** | §11 audit, §13 incident response | `permission_change_audit` with `reason`, `status` lifecycle |
| **Organization** | §12 regional director | `org_id`, `scope_level: 'organization'` |
